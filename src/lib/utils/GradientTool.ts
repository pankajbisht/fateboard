import * as fabric from 'fabric';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type GradientKind = 'linear' | 'radial';

export interface MultiStopGradientToolOptions {
    /**
     * Called whenever the gradient fill changes.
     * Useful for history / undo / persistence.
     */
    onChange?: (obj: fabric.Object) => void;

    /**
     * Called whenever the active color stop changes.
     */
    onActiveStopChange?: (color: string) => void;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const HANDLE_RADIUS = 7;
const STOP_RADIUS = 6;

const ACCENT = '#6366f1';

const HIT_LINE_WIDTH = 16;

const MIN_STOPS = 2;

const MIN_GRADIENT_LENGTH = 1;

const OBJECT_EVENTS = ['moving', 'scaling', 'rotating', 'skewing', 'modified'] as const;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface GradientStopData {
    offset: number;
    color: string;
    opacity?: number;
}

interface GradientGeometry {
    type: GradientKind;

    /**
     * First gradient point.
     *
     * Linear:
     *   start -> gradient beginning
     *
     * Radial:
     *   center/focal point
     */
    start: fabric.Point;

    /**
     * Second gradient point.
     *
     * Linear:
     *   end -> gradient end
     *
     * Radial:
     *   point on radius vector
     */
    end: fabric.Point;

    /**
     * Radial inner radius.
     */
    r1: number;

    /**
     * Radial outer radius.
     */
    r2: number;

    stops: GradientStopData[];
}

/* -------------------------------------------------------------------------- */
/* Math helpers                                                               */
/* -------------------------------------------------------------------------- */

function clamp(value: number, min = 0, max = 1): number {
    if (!Number.isFinite(value)) {
        return min;
    }

    return Math.max(min, Math.min(max, value));
}

function finite(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Project a point onto a line segment.
 *
 * Returns:
 *   0 -> start
 *   1 -> end
 */
function projectOnLine(
    point: { x: number; y: number },
    start: { x: number; y: number },
    end: { x: number; y: number },
): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared <= Number.EPSILON) {
        return 0;
    }

    return clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared);
}

function pointOnLine(
    start: { x: number; y: number },
    end: { x: number; y: number },
    offset: number,
): { x: number; y: number } {
    const t = clamp(offset);

    return {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
    };
}

/**
 * Scene/canvas coordinates -> object-local coordinates.
 *
 * Fabric's gradient coordinates are defined in object space.
 */
function sceneToLocal(obj: fabric.Object, point: fabric.Point): fabric.Point {
    const inverse = fabric.util.invertTransform(obj.calcTransformMatrix());

    return fabric.util.transformPoint(point, inverse);
}

/**
 * Object-local coordinates -> scene/canvas coordinates.
 */
function localToScene(obj: fabric.Object, point: fabric.Point): fabric.Point {
    return fabric.util.transformPoint(point, obj.calcTransformMatrix());
}

/* -------------------------------------------------------------------------- */
/* Tool                                                                       */
/* -------------------------------------------------------------------------- */

export class MultiStopGradientTool {
    canvas: fabric.Canvas;

    activeObj: fabric.Object | null = null;

    start: fabric.Circle | null = null;

    end: fabric.Circle | null = null;

    line: fabric.Line | null = null;

    hitLine: fabric.Line | null = null;

    stops: fabric.Circle[] = [];

    activeStop: fabric.Circle | null = null;

    gradientType: GradientKind = 'linear';

    getColor: () => string;

    private options: MultiStopGradientToolOptions;

    private enabled = false;

    /**
     * Circle -> gradient offset.
     */
    private offsets = new Map<fabric.Circle, number>();

    /**
     * All helper objects created by this tool.
     */
    private helpers = new Set<fabric.Object>();

    /**
     * Gradient geometry stored in object-local coordinates.
     *
     * Linear:
     *
     *   start ---------------- end
     *
     * Radial:
     *
     *   start = center
     *   end   = point on radius vector
     *
     * r1/r2 contain the radial radii.
     */
    private startLocal = new fabric.Point(0, 0);

    private endLocal = new fabric.Point(0, 0);

    private radialInnerRadius = 0;

    private radialOuterRadius = 1;

    /**
     * Prevents history callbacks during internal synchronization.
     */
    private applying = false;

    constructor(
        canvas: fabric.Canvas,
        getColor: () => string,
        options: MultiStopGradientToolOptions = {},
    ) {
        this.canvas = canvas;
        this.getColor = getColor;
        this.options = options;
    }

    /* ====================================================================== */
    /* ENABLE / DISABLE                                                       */
    /* ====================================================================== */

    enable() {
        if (this.enabled) {
            return;
        }

        this.enabled = true;

        this.canvas.on('mouse:down', this.onMouseDown);

        this.canvas.on('mouse:up', this.onMouseUp);

        this.canvas.on('mouse:dblclick', this.onDblClick);

        this.canvas.on('object:removed', this.onObjectRemoved);

        if (typeof document !== 'undefined') {
            document.addEventListener('keydown', this.onKeyDown, true);
        }
    }

    disable() {
        if (this.enabled) {
            this.enabled = false;

            this.canvas.off('mouse:down', this.onMouseDown);

            this.canvas.off('mouse:up', this.onMouseUp);

            this.canvas.off('mouse:dblclick', this.onDblClick);

            this.canvas.off('object:removed', this.onObjectRemoved);

            if (typeof document !== 'undefined') {
                document.removeEventListener('keydown', this.onKeyDown, true);
            }
        }

        this.detach();
    }

    /**
     * Remove all editor helpers while keeping the gradient.
     */
    detach() {
        const object = this.activeObj;

        this.activeObj = null;

        if (object) {
            OBJECT_EVENTS.forEach((eventName) => {
                object.off(eventName, this.syncHandles);
            });
        }

        const active = this.canvas.getActiveObject();

        if (active && this.helpers.has(active)) {
            this.canvas.discardActiveObject();
        }

        const objectsToRemove = [
            this.line,
            this.hitLine,
            this.start,
            this.end,
            ...this.stops,
        ].filter(Boolean) as fabric.Object[];

        if (objectsToRemove.length) {
            this.canvas.remove(...objectsToRemove);
        }

        this.line = null;

        this.hitLine = null;

        this.start = null;

        this.end = null;

        this.stops = [];

        this.activeStop = null;

        this.offsets.clear();

        this.helpers.clear();

        this.canvas.requestRenderAll();
    }

    cleanup() {
        this.detach();
    }

    /* ====================================================================== */
    /* MOUSE                                                                   */
    /* ====================================================================== */

    private onMouseDown = (opt: any) => {
        const target = opt?.target as fabric.Object | undefined;

        if (target && this.helpers.has(target)) {
            if (target === this.hitLine) {
                this.addStopAt(this.getScenePoint(opt));

                return;
            }

            if (target instanceof fabric.Circle && this.stops.includes(target)) {
                this.setActiveStop(target);

                return;
            }

            return;
        }

        if (!target || target === this.activeObj) {
            return;
        }

        this.attach(target);
    };

    private onMouseUp = () => {
        const active = this.canvas.getActiveObject();

        if (!this.activeObj || !active || !this.helpers.has(active)) {
            return;
        }

        const object = this.activeObj;

        setTimeout(() => {
            if (this.activeObj === object && !this.canvas.getActiveObject()) {
                this.canvas.setActiveObject(object);
            }

            this.canvas.requestRenderAll();
        }, 0);
    };

    private onDblClick = (opt: any) => {
        const target = opt?.target as fabric.Object | undefined;

        if (target instanceof fabric.Circle && this.stops.includes(target)) {
            this.removeStop(target);
        }
    };

    private onObjectRemoved = (event: any) => {
        if (event?.target && event.target === this.activeObj) {
            this.detach();
        }
    };

    private onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Delete' && event.key !== 'Backspace') {
            return;
        }

        if (!this.activeObj || !this.activeStop) {
            return;
        }

        if (this.stops.length <= MIN_STOPS) {
            return;
        }

        const element = event.target as HTMLElement | null;

        if (
            element &&
            (element.tagName === 'INPUT' ||
                element.tagName === 'TEXTAREA' ||
                element.isContentEditable)
        ) {
            return;
        }

        event.preventDefault();

        event.stopImmediatePropagation();

        this.removeStop(this.activeStop);
    };

    private getScenePoint(opt: any): fabric.Point {
        if (opt?.scenePoint) {
            return opt.scenePoint;
        }

        if (typeof (this.canvas as any).getScenePoint === 'function') {
            return (this.canvas as any).getScenePoint(opt.e);
        }

        const pointer = (this.canvas as any).getPointer(opt.e);

        return new fabric.Point(pointer.x, pointer.y);
    }

    /* ====================================================================== */
    /* ATTACH                                                                  */
    /* ====================================================================== */

    private canAttach(object: fabric.Object) {
        if (this.helpers.has(object)) {
            return false;
        }

        if (object.type === 'activeselection' || object.type === 'image') {
            return false;
        }

        return true;
    }

    attach(object: fabric.Object) {
        if (object === this.activeObj) {
            return;
        }

        if (!this.canAttach(object)) {
            return;
        }

        this.detach();

        this.activeObj = object;

        const width = object.width ?? 0;

        const height = object.height ?? 0;

        const existing = this.readGradient(object);

        let stops: GradientStopData[];

        if (existing) {
            this.gradientType = existing.type;

            this.startLocal = existing.start;

            this.endLocal = existing.end;

            this.radialInnerRadius = existing.r1;

            this.radialOuterRadius = existing.r2;

            stops = existing.stops;
        } else {
            this.gradientType = 'linear';

            this.startLocal = new fabric.Point(-width / 2, 0);

            this.endLocal = new fabric.Point(width / 2, 0);

            this.radialInnerRadius = 0;

            this.radialOuterRadius = Math.max(width / 2, height / 2, MIN_GRADIENT_LENGTH);

            const color = this.getColor();

            const base = typeof object.fill === 'string' ? object.fill : color;

            stops = [
                {
                    offset: 0,
                    color: base,
                },
                {
                    offset: 1,
                    color,
                },
            ];
        }

        this.createHelpers();

        stops.forEach((stop) => {
            this.createStop(stop.offset, stop.color);
        });

        OBJECT_EVENTS.forEach((eventName) => {
            object.on(eventName, this.syncHandles);
        });

        this.layoutLine();

        this.setActiveStop(this.stops[this.stops.length - 1]);

        this.applyGradient();
    }

    private createHelpers() {
        if (!this.activeObj) {
            return;
        }

        const startScene = localToScene(this.activeObj, this.startLocal);

        const endScene = localToScene(this.activeObj, this.endLocal);

        this.line = new fabric.Line([startScene.x, startScene.y, endScene.x, endScene.y], {
            stroke: ACCENT,
            strokeWidth: 2,
            selectable: false,
            evented: false,
            excludeFromExport: true,
            objectCaching: false,
        });

        this.hitLine = new fabric.Line([startScene.x, startScene.y, endScene.x, endScene.y], {
            stroke: 'rgba(0,0,0,0.01)',
            strokeWidth: HIT_LINE_WIDTH,
            selectable: false,
            evented: true,
            perPixelTargetFind: false,
            hoverCursor: 'copy',
            excludeFromExport: true,
            objectCaching: false,
        });

        this.start = this.createHandle(startScene.x, startScene.y);

        this.end = this.createHandle(endScene.x, endScene.y);

        this.register(this.line);

        this.register(this.hitLine);

        this.canvas.add(this.line, this.hitLine, this.start, this.end);
    }

    /**
     * Refresh geometry after programmatic object changes.
     */
    refresh() {
        this.syncHandles();
    }

    /* ====================================================================== */
    /* READ GRADIENT                                                          */
    /* ====================================================================== */

    private readGradient(object: fabric.Object): GradientGeometry | null {
        const fill = object.fill;

        if (!(fill instanceof fabric.Gradient)) {
            return null;
        }

        const width = object.width ?? 0;

        const height = object.height ?? 0;

        const coords: any = fill.coords;

        if (!coords) {
            return null;
        }

        const type: GradientKind = fill.type === 'radial' ? 'radial' : 'linear';

        const units = fill.gradientUnits;

        const isPercentage = units === 'percentage';

        /**
         * Convert Fabric gradient coordinates
         * into object-local coordinates.
         */
        const xScale = isPercentage ? width : 1;

        const yScale = isPercentage ? height : 1;

        const toLocal = (x: number, y: number) =>
            new fabric.Point(finite(x) * xScale - width / 2, finite(y) * yScale - height / 2);

        let start: fabric.Point;

        let end: fabric.Point;

        let r1 = 0;

        let r2 = 1;

        if (type === 'linear') {
            start = toLocal(coords.x1, coords.y1);

            end = toLocal(coords.x2, coords.y2);
        } else {
            /**
             * Fabric radial gradients:
             *
             * x1/y1/r1 = inner/focal circle
             * x2/y2/r2 = outer circle
             *
             * We use x1/y1 as the editor center.
             *
             * The second handle represents the
             * outer circle radius direction.
             */
            start = toLocal(coords.x1, coords.y1);

            const outerCenter = toLocal(coords.x2, coords.y2);

            r1 = finite(coords.r1, 0);

            r2 = finite(coords.r2, 0);

            /**
             * For radial gradients the radius itself
             * is in object coordinate units.
             *
             * With percentage units Fabric interprets
             * the coordinates according to the object
             * dimensions. For the editor we use the X
             * scale for the visual radius direction.
             */
            const radiusScale = isPercentage ? Math.max(width, height) : 1;

            r1 *= radiusScale;
            r2 *= radiusScale;

            /**
             * Preserve the direction between the two
             * radial focal points.
             *
             * If the two centers are identical,
             * default to horizontal.
             */
            const dx = outerCenter.x - start.x;

            const dy = outerCenter.y - start.y;

            const centerDistance = Math.hypot(dx, dy);

            let dirX = 1;
            let dirY = 0;

            if (centerDistance > Number.EPSILON) {
                dirX = dx / centerDistance;

                dirY = dy / centerDistance;
            }

            /**
             * The visual radius handle is placed
             * from the focal point using r2.
             *
             * For a concentric radial gradient this
             * gives:
             *
             * center -------- radius handle
             */
            end = new fabric.Point(
                start.x + dirX * Math.max(r2, MIN_GRADIENT_LENGTH),
                start.y + dirY * Math.max(r2, MIN_GRADIENT_LENGTH),
            );
        }

        const rawStops = Array.isArray(fill.colorStops) ? fill.colorStops : [];

        const stops = rawStops
            .map((stop: any) => ({
                offset: clamp(finite(Number(stop.offset), 0)),
                color: typeof stop.color === 'string' ? stop.color : '#000000',
                ...(stop.opacity !== undefined
                    ? {
                          opacity: finite(stop.opacity, 1),
                      }
                    : {}),
            }))
            .sort((a, b) => a.offset - b.offset);

        if (stops.length < MIN_STOPS) {
            return null;
        }

        return {
            type,
            start,
            end,
            r1,
            r2: Math.max(r2, MIN_GRADIENT_LENGTH),
            stops,
        };
    }

    /* ====================================================================== */
    /* HELPERS                                                                 */
    /* ====================================================================== */

    private register<T extends fabric.Object>(object: T): T {
        this.helpers.add(object);

        (object as any).isGradientHelper = true;

        return object;
    }

    private createCircle(x: number, y: number, radius: number, fill: string) {
        const circle = new fabric.Circle({
            left: x,
            top: y,
            radius,

            fill,

            stroke: '#fff',
            strokeWidth: 1,

            originX: 'center',
            originY: 'center',

            selectable: true,
            evented: true,

            hasControls: false,
            hasBorders: false,

            hoverCursor: 'pointer',
            moveCursor: 'pointer',

            excludeFromExport: true,

            objectCaching: false,
        });

        return this.register(circle);
    }

    private createHandle(x: number, y: number) {
        const handle = this.createCircle(x, y, HANDLE_RADIUS, '#111');

        handle.on('moving', this.onHandleMoving);

        return handle;
    }

    /* ====================================================================== */
    /* HANDLE MOVEMENT                                                        */
    /* ====================================================================== */

    private onHandleMoving = () => {
        const object = this.activeObj;

        if (!object || !this.start || !this.end) {
            return;
        }

        const startScene = new fabric.Point(this.start.left, this.start.top);

        const endScene = new fabric.Point(this.end.left, this.end.top);

        this.startLocal = sceneToLocal(object, startScene);

        this.endLocal = sceneToLocal(object, endScene);

        if (this.gradientType === 'radial') {
            this.radialOuterRadius = Math.max(
                distance(this.startLocal, this.endLocal),
                MIN_GRADIENT_LENGTH,
            );
        }

        this.layoutLine();

        this.applyGradient();
    };

    /**
     * Keep helpers attached to the object while
     * the object is moved/scaled/rotated/skewed.
     */
    private syncHandles = () => {
        const object = this.activeObj;

        if (!object || !this.start || !this.end) {
            return;
        }

        const startScene = localToScene(object, this.startLocal);

        const endScene = localToScene(object, this.endLocal);

        this.start.set({
            left: startScene.x,
            top: startScene.y,
        });

        this.end.set({
            left: endScene.x,
            top: endScene.y,
        });

        this.start.setCoords();

        this.end.setCoords();

        this.layoutLine();

        this.canvas.requestRenderAll();
    };

    private layoutLine() {
        if (!this.start || !this.end) {
            return;
        }

        const coords = {
            x1: this.start.left,
            y1: this.start.top,
            x2: this.end.left,
            y2: this.end.top,
        };

        this.line?.set(coords);

        this.hitLine?.set(coords);

        this.line?.setCoords();

        this.hitLine?.setCoords();

        this.stops.forEach((stop) => this.placeStop(stop));
    }

    private pointAt(offset: number) {
        if (!this.start || !this.end) {
            return {
                x: 0,
                y: 0,
            };
        }

        return pointOnLine(
            {
                x: this.start.left,
                y: this.start.top,
            },
            {
                x: this.end.left,
                y: this.end.top,
            },
            offset,
        );
    }

    private placeStop(stop: fabric.Circle) {
        const point = this.pointAt(this.offsets.get(stop) ?? 0);

        stop.set({
            left: point.x,
            top: point.y,
        });

        stop.setCoords();
    }

    /* ====================================================================== */
    /* STOPS                                                                   */
    /* ====================================================================== */

    private createStop(offset: number, color: string) {
        const normalizedOffset = clamp(offset);

        const point = this.pointAt(normalizedOffset);

        const stop = this.createCircle(point.x, point.y, STOP_RADIUS, color);

        this.offsets.set(stop, normalizedOffset);

        stop.on('moving', () => {
            if (!this.start || !this.end) {
                return;
            }

            const next = projectOnLine(
                {
                    x: stop.left,
                    y: stop.top,
                },
                {
                    x: this.start.left,
                    y: this.start.top,
                },
                {
                    x: this.end.left,
                    y: this.end.top,
                },
            );

            this.offsets.set(stop, next);

            this.placeStop(stop);

            this.applyGradient();
        });

        this.stops.push(stop);

        this.canvas.add(stop);

        return stop;
    }

    /**
     * Add a stop at the point clicked on the
     * gradient guide.
     */
    private addStopAt(scenePoint: fabric.Point) {
        if (!this.activeObj || !this.start || !this.end) {
            return;
        }

        const offset = projectOnLine(
            scenePoint,
            {
                x: this.start.left,
                y: this.start.top,
            },
            {
                x: this.end.left,
                y: this.end.top,
            },
        );

        const color = this.getColor();

        const stop = this.createStop(offset, color);

        this.setActiveStop(stop);

        this.applyGradient();
    }

    removeStop(stop: fabric.Circle) {
        if (!this.stops.includes(stop)) {
            return false;
        }

        if (this.stops.length <= MIN_STOPS) {
            return false;
        }

        const wasActive = this.activeStop === stop;

        this.stops = this.stops.filter((item) => item !== stop);

        this.offsets.delete(stop);

        this.helpers.delete(stop);

        stop.off('moving');

        this.canvas.remove(stop);

        if (wasActive) {
            this.activeStop = null;

            const replacement = this.stops[Math.min(this.stops.length - 1, 0)];

            if (replacement) {
                this.setActiveStop(replacement);
            }
        }

        this.applyGradient();

        return true;
    }

    removeActiveStop() {
        return this.activeStop ? this.removeStop(this.activeStop) : false;
    }

    setActiveStop(stop: fabric.Circle | undefined) {
        if (!stop) {
            return;
        }

        if (!this.stops.includes(stop)) {
            return;
        }

        this.activeStop = stop;

        this.stops.forEach((item) => {
            const active = item === stop;

            item.set({
                stroke: active ? ACCENT : '#fff',

                strokeWidth: active ? 3 : 1,
            });

            item.setCoords();
        });

        this.canvas.requestRenderAll();

        this.options.onActiveStopChange?.(String(stop.fill));
    }

    /* ====================================================================== */
    /* COLOR                                                                   */
    /* ====================================================================== */

    updateActiveColor(color: string) {
        if (!this.activeStop) {
            return;
        }

        this.activeStop.set('fill', color);

        this.applyGradient();
    }

    getActiveColor(): string | null {
        return this.activeStop ? String(this.activeStop.fill) : null;
    }

    /* ====================================================================== */
    /* GRADIENT TYPE                                                           */
    /* ====================================================================== */

    setGradientType(type: GradientKind) {
        if (this.gradientType === type) {
            return;
        }

        this.gradientType = type;

        /**
         * When switching to radial, convert the
         * current linear axis into:
         *
         * start = center
         * end   = radius point
         */
        if (type === 'radial') {
            const length = distance(this.startLocal, this.endLocal);

            this.radialOuterRadius = Math.max(length / 2, MIN_GRADIENT_LENGTH);

            const center = new fabric.Point(
                (this.startLocal.x + this.endLocal.x) / 2,
                (this.startLocal.y + this.endLocal.y) / 2,
            );

            const dx = this.endLocal.x - this.startLocal.x;

            const dy = this.endLocal.y - this.startLocal.y;

            const axisLength = Math.max(Math.hypot(dx, dy), MIN_GRADIENT_LENGTH);

            const dirX = dx / axisLength;

            const dirY = dy / axisLength;

            this.startLocal = center;

            this.endLocal = new fabric.Point(
                center.x + dirX * this.radialOuterRadius,
                center.y + dirY * this.radialOuterRadius,
            );

            this.radialInnerRadius = 0;
        } else {
            /**
             * Radial -> linear.
             *
             * Use the radial radius vector as
             * the linear axis.
             */
            const radius = Math.max(distance(this.startLocal, this.endLocal), MIN_GRADIENT_LENGTH);

            this.endLocal = new fabric.Point(this.startLocal.x + radius, this.startLocal.y);
        }

        this.syncHandles();

        this.applyGradient();
    }

    toggleGradientType() {
        this.setGradientType(this.gradientType === 'linear' ? 'radial' : 'linear');
    }

    /* ====================================================================== */
    /* APPLY GRADIENT                                                          */
    /* ====================================================================== */

    private applyGradient() {
        const object = this.activeObj;

        if (!object || !this.start || !this.end) {
            return;
        }

        if (this.applying) {
            return;
        }

        this.applying = true;

        try {
            const width = object.width ?? 0;

            const height = object.height ?? 0;

            /**
             * Internal geometry is center based.
             *
             * Fabric gradient coordinates are
             * top-left based.
             */
            const start = new fabric.Point(
                this.startLocal.x + width / 2,
                this.startLocal.y + height / 2,
            );

            const end = new fabric.Point(this.endLocal.x + width / 2, this.endLocal.y + height / 2);

            const colorStops = this.stops
                .map((stop) => ({
                    offset: clamp(this.offsets.get(stop) ?? 0),

                    color: String(stop.fill ?? '#000000'),
                }))
                .sort((a, b) => a.offset - b.offset);

            if (colorStops.length < MIN_STOPS) {
                return;
            }

            let coords: any;

            if (this.gradientType === 'linear') {
                coords = {
                    x1: start.x,
                    y1: start.y,
                    x2: end.x,
                    y2: end.y,
                };
            } else {
                /**
                 * Radial gradient.
                 *
                 * The important part:
                 *
                 * x1/y1 = inner/focal center
                 * r1    = inner radius
                 *
                 * x2/y2 = outer center
                 * r2    = outer radius
                 *
                 * For our editor we intentionally use
                 * concentric circles:
                 *
                 * x1 === x2
                 * y1 === y2
                 *
                 * This makes the visual gradient
                 * correspond exactly to the line
                 * represented by our two handles.
                 */
                const radius = Math.max(
                    distance(this.startLocal, this.endLocal),
                    MIN_GRADIENT_LENGTH,
                );

                coords = {
                    x1: start.x,
                    y1: start.y,

                    r1: Math.max(0, this.radialInnerRadius),

                    x2: start.x,
                    y2: start.y,

                    r2: radius,
                };

                this.radialOuterRadius = radius;
            }

            const gradient = new fabric.Gradient({
                type: this.gradientType,

                gradientUnits: 'pixels',

                coords,

                colorStops,
            } as any);

            object.set('fill', gradient);

            object.dirty = true;

            this.canvas.requestRenderAll();

            this.options.onChange?.(object);
        } finally {
            this.applying = false;
        }
    }

    /* ====================================================================== */
    /* SYNC FROM OBJECT                                                        */
    /* ====================================================================== */

    /**
     * Synchronize the tool with an existing
     * gradient object.
     *
     * Returns:
     *
     *   'linear'
     *   'radial'
     *   null
     */
    syncFromObject(object: fabric.Object): GradientKind | null {
        const fill = object.fill;

        if (!(fill instanceof fabric.Gradient)) {
            this.detach();

            return null;
        }

        const geometry = this.readGradient(object);

        if (!geometry) {
            this.detach();

            return null;
        }

        /**
         * If this is a different object,
         * fully attach.
         */
        if (object !== this.activeObj) {
            this.attach(object);

            return this.gradientType;
        }

        this.gradientType = geometry.type;

        this.startLocal = geometry.start;

        this.endLocal = geometry.end;

        this.radialInnerRadius = geometry.r1;

        this.radialOuterRadius = geometry.r2;

        /**
         * Do not recreate helpers unnecessarily.
         * Just synchronize their positions.
         */
        this.syncHandles();

        return this.gradientType;
    }
}
