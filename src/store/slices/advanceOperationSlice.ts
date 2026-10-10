import * as fabric from 'fabric';
import { nanoid } from 'nanoid';

const initialValues = {
    objects: [] as fabric.Object[], // all canvas objects
    _isSyncing: false, // internal flag
};

export type RadialOptions = {
    count: number;
    pivotX: number;
    pivotY: number;
    gap?: number;
    mode?: 'ring' | 'spiral';
    startAngle?: number;
    clockwise?: boolean;
    scaleStep?: number;
    rotateAlongPath?: boolean; // true: clones rotate with their position around the pivot
    opacityFade?: boolean;
    jitter?: number;
};

export const advanceOperationSlice = (set, get, store) => {
    // Add many objects to canvas + state in one go, render once
    const registerObjects = (objs: fabric.Object[]) => {
        const canvas = get().canvas;
        if (!canvas || !objs.length) return;
        objs.forEach((o) => o.setCoords());
        canvas.add(...objs);
        set({ objects: [...get().objects, ...objs] });
        canvas.requestRenderAll();
    };

    return {
        ...initialValues,

        setCanvas: (canvas) => set({ canvas }),

        addObject: (obj) => {
            const canvas = get().canvas;
            if (!canvas || !obj) return;
            if (get().objects.includes(obj)) return; // avoid duplicates
            registerObjects([obj]);
        },

        // -------------------------------
        // CLONE OBJECT
        // -------------------------------
        cloneObject: async (obj) => {
            if (!obj) return null;
            // include custom props you rely on (add more names if needed)
            const cloned = await obj.clone(['name', 'data']);
            cloned.set({ id: nanoid() });
            return cloned;
        },

        // -------------------------------
        // HORIZONTAL REPEAT
        // -------------------------------
        repeatHorizontally: async (obj, count = 3, gap = 10) => {
            if (!get().canvas || !obj) return [];

            const stepX = obj.getScaledWidth() + gap;
            const clones = [];
            for (let i = 1; i <= count; i++) {
                const cloned = await get().cloneObject(obj);
                cloned.set({ left: obj.left + i * stepX, top: obj.top });
                clones.push(cloned);
            }
            registerObjects(clones);
            return clones;
        },

        // -------------------------------
        // GRID REPEAT
        // -------------------------------
        repeatGrid: async (obj, rows = 2, cols = 2, gapX = 10, gapY = 10) => {
            if (!get().canvas || !obj) return [];

            const stepX = obj.getScaledWidth() + gapX;
            const stepY = obj.getScaledHeight() + gapY;
            const clones = [];
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    if (r === 0 && c === 0) continue; // original stays in place
                    const cloned = await get().cloneObject(obj);
                    cloned.set({ left: obj.left + c * stepX, top: obj.top + r * stepY });
                    clones.push(cloned);
                }
            }
            registerObjects(clones);
            return clones;
        },

        // -------------------------------
        // RADIAL REPEAT (ring / spiral)
        // -------------------------------
        repeatRadially: async (object: fabric.Object, options: RadialOptions) => {
            const canvas = get().canvas ?? object?.canvas;
            if (!canvas || !object || !options || options.count < 2) return [];

            const {
                count,
                pivotX,
                pivotY,
                gap = 0,
                mode = 'ring',
                startAngle = 0,
                clockwise = true,
                scaleStep = 0,
                rotateAlongPath = false,
                opacityFade = false,
                jitter = 0,
            } = options;

            const center = object.getCenterPoint();
            let dx = center.x - pivotX;
            let dy = center.y - pivotY;
            const baseRadius = Math.hypot(dx, dy);

            // Unit direction from pivot to object. If object sits on the pivot, pick +X.
            if (baseRadius === 0) {
                dx = 1;
                dy = 0;
            } else {
                dx /= baseRadius;
                dy /= baseRadius;
            }

            const sign = clockwise ? 1 : -1;
            const angleStep = 360 / count;
            const baseOpacity = object.opacity ?? 1;
            const clones = [];

            for (let i = 1; i < count; i++) {
                const clone = await get().cloneObject(object);

                const angleDelta = sign * angleStep * i;
                const rad = fabric.util.degreesToRadians(startAngle + angleDelta);
                const radius = baseRadius + (mode === 'spiral' ? gap * i : gap);

                let newX = pivotX + (dx * Math.cos(rad) - dy * Math.sin(rad)) * radius;
                let newY = pivotY + (dx * Math.sin(rad) + dy * Math.cos(rad)) * radius;

                if (jitter > 0) {
                    newX += (Math.random() - 0.5) * 2 * jitter;
                    newY += (Math.random() - 0.5) * 2 * jitter;
                }

                const scale = Math.max(0.01, 1 + scaleStep * i); // never zero/negative

                clone.set({
                    angle: rotateAlongPath ? object.angle + angleDelta : object.angle,
                    scaleX: object.scaleX * scale,
                    scaleY: object.scaleY * scale,
                    opacity: opacityFade ? baseOpacity * Math.max(0, 1 - i / count) : baseOpacity,
                });

                clone.setPositionByOrigin(new fabric.Point(newX, newY), 'center', 'center');
                clones.push(clone);
            }

            registerObjects(clones);
            return clones;
        },

        // -------------------------------
        // REPEAT ALONG PATH
        // -------------------------------
        repeatAlongPath: async (
            obj: fabric.Object,
            path: fabric.Path,
            spacing = 30,
            options: { rotateAlongPath?: boolean; angleOffset?: number } = {},
        ) => {
            const canvas = get().canvas;
            if (!canvas || !obj || !path || spacing <= 0) return [];

            const { rotateAlongPath = true, angleOffset = 0 } = options;

            // NOTE: in fabric's segment info, `length` is the length of EACH segment,
            // so the total is the sum (the old code used only the last segment).
            const infos = fabric.util.getPathSegmentsInfo(path.path);
            const totalLength = infos.reduce((sum, s) => sum + (s.length || 0), 0);
            if (!totalLength) return [];

            const matrix = path.calcTransformMatrix();
            const offset = path.pathOffset;

            // path-local -> canvas coordinates (must subtract pathOffset first)
            const toWorld = (p: { x: number; y: number }) =>
                fabric.util.transformPoint(
                    new fabric.Point(p.x - offset.x, p.y - offset.y),
                    matrix,
                );

            canvas.discardActiveObject();

            const clones = [];
            for (let d = spacing; d <= totalLength; d += spacing) {
                const world = toWorld(fabric.util.getPointOnPath(path.path, d, infos));

                // tangent from two nearby points (works with path scale/rotation/skew)
                const d2 = d + 0.1 <= totalLength ? d + 0.1 : d - 0.1;
                const world2 = toWorld(fabric.util.getPointOnPath(path.path, d2, infos));
                let rad = Math.atan2(world2.y - world.y, world2.x - world.x);
                if (d2 < d) rad += Math.PI; // we looked backwards, flip direction

                const clone = await get().cloneObject(obj);
                clone.set({
                    angle: rotateAlongPath
                        ? fabric.util.radiansToDegrees(rad) + angleOffset
                        : obj.angle,
                });
                clone.setPositionByOrigin(world, 'center', 'center');
                clones.push(clone);
            }

            registerObjects(clones);
            return clones;
        },

        // -------------------------------
        // PATTERN FILL
        // -------------------------------
        fillPattern: async (obj, target) => {
            if (!obj || !target) return;
            const canvas = get().canvas;
            if (!canvas) return;

            // no clone needed: toCanvasElement just renders the object to a bitmap
            const pattern = new fabric.Pattern({
                source: obj.toCanvasElement(),
                repeat: 'repeat',
            });

            target.set('fill', pattern);
            target.dirty = true;
            canvas.requestRenderAll();
            return pattern;
        },

        // -------------------------------
        // DELETE OBJECT
        // -------------------------------
        removeObject: (obj) => {
            const canvas = get().canvas;
            if (!canvas || !obj) return;

            if (canvas.getActiveObject() === obj) canvas.discardActiveObject();
            canvas.remove(obj);
            set({ objects: get().objects.filter((o) => o !== obj) });
            canvas.requestRenderAll();
        },
    };
};
