import * as fabric from 'fabric';

/* -----------------------------------------
   Helpers
------------------------------------------ */

function canvasToLocal(obj: fabric.Object, p: fabric.Point) {
    const inv = fabric.util.invertTransform(obj.calcTransformMatrix());
    return fabric.util.transformPoint(p, inv);
}

function clamp(v: number, min = 0, max = 1) {
    return Math.max(min, Math.min(max, v));
}

function projectOnLine(p: fabric.Point, a: fabric.Point, b: fabric.Point) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = p.x - a.x;
    const apy = p.y - a.y;

    const len = abx * abx + aby * aby;
    if (len === 0) return 0;

    return clamp((apx * abx + apy * aby) / len);
}

/* -----------------------------------------
   Multi Stop Gradient Tool
------------------------------------------ */

// Allow a few local explicit-any usages for Fabric interop in this file
/* eslint-disable @typescript-eslint/no-explicit-any */
export class MultiStopGradientTool {
    canvas: fabric.Canvas;
    activeObj: fabric.Object | null = null;

    start!: fabric.Circle;
    end!: fabric.Circle;
    line!: fabric.Line;

    stops: fabric.Circle[] = [];
    activeStop: fabric.Circle | null = null;

    gradientType: 'linear' | 'radial' = 'linear';

    getColor: () => string;

    constructor(canvas: fabric.Canvas, getColor: () => string) {
        this.canvas = canvas;
        this.getColor = getColor;
    }

    /* ---------- ENABLE / DISABLE ---------- */

    enable() {
        this.canvas.on('mouse:down', this.onMouseDown);
    }

    disable() {
        this.canvas.off('mouse:down', this.onMouseDown);
        this.cleanup();
    }

    /* ---------- MOUSE ---------- */

    // allow `any` for fabric event object here

    onMouseDown = (e: any) => {
        const target = (this.canvas as any).findTarget((e as any).e, false);

        if (!target) return;

        if (target === this.start || target === this.end) return;

        if (this.stops.includes(target as fabric.Circle)) {
            this.setActiveStop(target as fabric.Circle);
            return;
        }

        if (target === this.line) {
            this.addStopFromEvent(e);
            return;
        }

        this.attach(target);
    };

    /* ---------- ATTACH ---------- */

    attach(obj: fabric.Object) {
        this.cleanup();
        this.activeObj = obj;

        const b = (obj as any).getBoundingRect(true, true);
        const color = this.getColor();

        this.start = this.createHandle(b.left, b.top + b.height / 2);

        this.end = this.createHandle(b.left + b.width, b.top + b.height / 2);

        this.line = new fabric.Line(
            [this.start.left!, this.start.top!, this.end.left!, this.end.top!],
            {
                stroke: '#6366f1',
                strokeWidth: 1,
                selectable: false,
                evented: true,
                excludeFromExport: true,
            },
        );

        // default stops
        this.createStop(0, color);
        this.createStop(1, color);

        this.canvas.add(this.line, this.start, this.end, ...this.stops);
        this.setActiveStop(this.stops[1]);
        this.update();
    }

    /* ---------- HANDLES ---------- */

    createHandle(x: number, y: number) {
        const h = new fabric.Circle({
            left: x,
            top: y,
            radius: 7,
            fill: '#111',
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: false,
            hasBorders: false,
            excludeFromExport: true,
        });

        h.on('moving', this.update);
        return h;
    }

    /* ---------- STOPS ---------- */

    createStop(offset: number, color: string) {
        const p = this.pointAt(offset);

        const stop = new fabric.Circle({
            left: p.x,
            top: p.y,
            radius: 6,
            fill: color,
            originX: 'center',
            originY: 'center',
            selectable: true,
            hasControls: false,
            hasBorders: false,
            excludeFromExport: true,
        });

        (stop as any).offset = offset;

        stop.on('moving', () => {
            const t = projectOnLine(
                new fabric.Point(stop.left!, stop.top!),
                new fabric.Point(this.start.left!, this.start.top!),
                new fabric.Point(this.end.left!, this.end.top!),
            );
            (stop as any).offset = t;
            const p = this.pointAt(t);
            stop.set({ left: p.x, top: p.y });
            this.update();
        });

        stop.on('mousedown', (e) => {
            e.e.stopPropagation();
            this.setActiveStop(stop);
        });

        stop.on('mousedblclick', (e) => {
            e.e.preventDefault();
            this.removeStop(stop);
        });

        this.stops.push(stop);
        return stop;
    }

    removeStop(stop: fabric.Circle) {
        if (this.stops.length <= 2) return;

        this.canvas.remove(stop);
        this.stops = this.stops.filter((s) => s !== stop);

        if (this.activeStop === stop) {
            this.activeStop = this.stops[0] || null;
        }

        this.update();
    }

    addStopFromEvent(e: any) {
        const p = (this.canvas as any).getPointer((e as any).e);

        const t = projectOnLine(
            new fabric.Point(p.x, p.y),
            new fabric.Point(this.start.left!, this.start.top!),
            new fabric.Point(this.end.left!, this.end.top!),
        );

        const stop = this.createStop(t, this.getColor());
        this.canvas.add(stop);
        this.setActiveStop(stop);
        this.update();
    }

    setActiveStop(stop: fabric.Circle) {
        this.activeStop = stop;
        this.stops.forEach((s) => s.set('stroke', s === stop ? '#000' : undefined));
        this.canvas.requestRenderAll();
    }

    /* ---------- COLOR ---------- */

    updateActiveColor(color: string) {
        if (!this.activeStop) return;
        this.activeStop.set('fill', color);
        this.update();
    }

    /* ---------- GRADIENT TYPE ---------- */

    toggleGradientType() {
        this.gradientType = this.gradientType === 'linear' ? 'radial' : 'linear';
        this.update();
    }

    /* ---------- UPDATE ---------- */

    update = () => {
        if (!this.activeObj) return;

        this.line.set({
            x1: this.start.left!,
            y1: this.start.top!,
            x2: this.end.left!,
            y2: this.end.top!,
        });

        this.stops.forEach((s) => {
            const p = this.pointAt((s as any).offset);
            s.set({ left: p.x, top: p.y });
        });

        const p1 = canvasToLocal(
            this.activeObj,
            new fabric.Point(this.start.left!, this.start.top!),
        );
        const p2 = canvasToLocal(this.activeObj, new fabric.Point(this.end.left!, this.end.top!));

        const colorStops = this.stops
            .sort((a, b) => (a as any).offset - (b as any).offset)
            .map((s) => ({
                offset: (s as any).offset,
                color: s.fill as string,
            }));

        // Fabric's Gradient typing is tricky across versions — allow `any` locally

        const gradient: any =
            this.gradientType === 'linear'
                ? new (fabric as any).Gradient({
                      type: 'linear',
                      gradientUnits: 'pixels',
                      coords: {
                          x1: p1.x,
                          y1: p1.y,
                          x2: p2.x,
                          y2: p2.y,
                      },
                      colorStops,
                  })
                : new (fabric as any).Gradient({
                      type: 'radial',
                      gradientUnits: 'pixels',
                      coords: {
                          x1: p1.x,
                          y1: p1.y,
                          r1: 0,
                          x2: p2.x,
                          y2: p2.y,
                          r2: Math.hypot(p2.x - p1.x, p2.y - p1.y),
                      },
                      colorStops,
                  });

        this.activeObj.set('fill', gradient);
        this.canvas.requestRenderAll();
    };

    pointAt(t: number) {
        return {
            x: this.start.left! + (this.end.left! - this.start.left!) * t,
            y: this.start.top! + (this.end.top! - this.start.top!) * t,
        };
    }

    cleanup() {
        this.canvas.remove(this.start, this.end, this.line, ...this.stops);
        this.stops = [];
        this.activeStop = null;
        this.activeObj = null;
    }

    syncFromObject(obj: fabric.Object) {
        if (!obj.fill || !(obj.fill as any).type) {
            this.disable();
            return null;
        }

        this.gradientType = (obj.fill as any).type as 'linear' | 'radial';
        return this.gradientType;
    }
}
