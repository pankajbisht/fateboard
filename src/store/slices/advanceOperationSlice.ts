import * as fabric from 'fabric';
import { nanoid } from 'nanoid';

const initialValues = {
    objects: [], // all canvas objects
    _isSyncing: false, // internal flag
};

export const advanceOperationSlice = (set, get, store) => ({
    ...initialValues,

    // Set canvas instance
    setCanvas: (canvas) => set({ canvas }),

    // Add object to canvas and state
    addObject: (obj) => {
        const canvas = get().canvas;
        if (!canvas) return;

        canvas.add(obj);
        set({ objects: [...get().objects, obj] });
    },

    // -------------------------------
    // CLONE OBJECT - async/await modern
    // -------------------------------
    cloneObject: async (obj) => {
        if (!obj) return null;
        const cloned = await obj.clone();
        cloned.set({ id: nanoid() });
        return cloned;
    },

    // -------------------------------
    // LINEAR / HORIZONTAL REPEAT
    // -------------------------------
    repeatHorizontally: async (obj, count = 3, gap = 10) => {
        const canvas = get().canvas;
        if (!canvas || !obj) return;

        const clones = [];
        for (let i = 1; i <= count; i++) {
            const cloned = await get().cloneObject(obj);
            cloned.set({
                left: obj.left + i * (obj.width * obj.scaleX + gap),
                top: obj.top,
            });
            canvas.add(cloned);
            clones.push(cloned);
        }
        return clones;
    },

    // -------------------------------
    // GRID REPEAT
    // -------------------------------
    repeatGrid: async (obj, rows = 2, cols = 2, gapX = 10, gapY = 10) => {
        const canvas = get().canvas;
        if (!canvas || !obj) return;

        const clones = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (r === 0 && c === 0) continue;

                const cloned = await get().cloneObject(obj);
                cloned.set({
                    left: obj.left + c * (obj.width * obj.scaleX + gapX),
                    top: obj.top + r * (obj.height * obj.scaleY + gapY),
                });
                canvas.add(cloned);
                clones.push(cloned);
            }
        }
        return clones;
    },

    // -------------------------------
    // RADIAL / CIRCULAR REPEAT
    // -------------------------------
    repeatRadiallya: async (obj, count = 6, centerX, centerY) => {
        const canvas = get().canvas;
        if (!canvas || !obj) return;

        const clones = [];
        const step = 360 / count;

        for (let i = 1; i < count; i++) {
            const cloned = await get().cloneObject(obj);
            cloned.rotate(obj.angle + i * step);
            cloned.set({ originX: 'center', originY: 'center' });

            cloned.setPositionByOrigin(new fabric.Point(centerX, centerY), 'center', 'center');

            canvas.add(cloned);
            clones.push(cloned);
        }
        return clones;
    },

    repeatRadiallyaa: async (object, count, pivotX, pivotY) => {
        if (!object || count < 2) return;

        const canvas = object.canvas;
        if (!canvas) return;

        // absolute position of object center
        const objCenter = object.getCenterPoint();

        const angleStep = 360 / count;

        for (let i = 1; i < count; i++) {
            // const clone = await new Promise(resolve =>
            //   object.clone(resolve)
            // );
            const clone = await get().cloneObject(object);

            const angle = angleStep * i;
            const rad = fabric.util.degreesToRadians(angle);

            // vector from pivot → object
            const dx = objCenter.x - pivotX;
            const dy = objCenter.y - pivotY;

            // rotate vector
            const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const ry = dx * Math.sin(rad) + dy * Math.cos(rad);

            // new center position
            const newCenterX = pivotX + rx;
            const newCenterY = pivotY + ry;

            clone.set({
                angle: object.angle + angle,
            });

            // IMPORTANT: position by center
            clone.setPositionByOrigin(new fabric.Point(newCenterX, newCenterY), 'center', 'center');

            clone.setCoords();
            canvas.add(clone);
        }

        canvas.requestRenderAll();
    },

    repeatRadiallywww: async (object, count, pivotX, pivotY, gap = 0) => {
        if (!object || count < 2) return;

        const canvas = object.canvas;
        if (!canvas) return;

        const center = object.getCenterPoint();
        const angleStep = 360 / count;

        let dx = center.x - pivotX;
        let dy = center.y - pivotY;

        let baseRadius = Math.hypot(dx, dy);

        // 🔑 CC FIX: define direction if radius is zero
        if (baseRadius === 0) {
            dx = 1;
            dy = 0;
            baseRadius = 1;
        }

        for (let i = 1; i < count; i++) {
            const clone = await get().cloneObject(object);

            const angle = angleStep * i;
            const rad = fabric.util.degreesToRadians(angle);

            const radius = baseRadius + gap;

            // rotate vector first
            const rdx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const rdy = dx * Math.sin(rad) + dy * Math.cos(rad);

            // scale to radius
            const len = Math.hypot(rdx, rdy);
            const sx = (rdx / len) * radius;
            const sy = (rdy / len) * radius;

            const newX = pivotX + sx;
            const newY = pivotY + sy;

            clone.set({
                angle: object.angle + angle,
            });

            clone.setPositionByOrigin(new fabric.Point(newX, newY), 'center', 'center');

            clone.setCoords();
            canvas.add(clone);
        }

        canvas.requestRenderAll();
    },

    repeatRadially: async (
        object,
        options: {
            count: number;
            pivotX: number;
            pivotY: number;
            gap?: number;
            mode?: 'ring' | 'spiral';
            startAngle?: number;
            clockwise?: boolean;
            scaleStep?: number;
            rotateAlongPath?: boolean;
            opacityFade?: boolean;
            jitter?: number;
        },
    ) => {
        if (!object || options.count < 2) return;
        const canvas = object.canvas;
        if (!canvas) return;

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
        let baseRadius = Math.hypot(dx, dy);

        // CC / pivot = object center
        if (baseRadius === 0) {
            dx = 1;
            dy = 0;
            baseRadius = 1;
        }

        const sign = clockwise ? 1 : -1;
        const angleStep = 360 / count;

        for (let i = 1; i < count; i++) {
            const clone = await get().cloneObject(object);

            // Step calculations
            const angle = startAngle + sign * angleStep * i;
            const rad = fabric.util.degreesToRadians(angle);

            const radius = baseRadius + (mode === 'spiral' ? gap * i : gap);

            // Rotate base vector
            const rdx = dx * Math.cos(rad) - dy * Math.sin(rad);
            const rdy = dx * Math.sin(rad) + dy * Math.cos(rad);

            const len = Math.hypot(rdx, rdy);
            const sx = (rdx / len) * radius;
            const sy = (rdy / len) * radius;

            let newX = pivotX + sx;
            let newY = pivotY + sy;

            // Random jitter
            if (jitter > 0) {
                newX += (Math.random() - 0.5) * 2 * jitter;
                newY += (Math.random() - 0.5) * 2 * jitter;
            }

            // Set position and transformations
            clone.set({
                angle: rotateAlongPath ? angle : object.angle + angleStep * i,
                scaleX: object.scaleX! * (1 + scaleStep * i),
                scaleY: object.scaleY! * (1 + scaleStep * i),
                opacity: opacityFade ? Math.max(0, 1 - i / count) : object.opacity,
            });

            clone.setPositionByOrigin(new fabric.Point(newX, newY), 'center', 'center');

            clone.setCoords();
            canvas.add(clone);
        }

        canvas.requestRenderAll();
    },

    // repeatRadially: async (
    //     object,
    //     count,
    //     pivotX,
    //     pivotY,
    //     gap = 10
    //   ) => {
    //     if (!object || count < 2) return;

    //     const canvas = object.canvas;
    //     if (!canvas) return;

    //     const objCenter = object.getCenterPoint();
    //     const angleStep = 360 / count;

    //     // base vector
    //     const baseDx = objCenter.x - pivotX;
    //     const baseDy = objCenter.y - pivotY;

    //     const baseRadius = Math.hypot(baseDx, baseDy);

    //     for (let i = 1; i < count; i++) {
    //       // const clone = await new Promise(resolve =>
    //       //   object.clone(resolve)
    //       // );
    //       const clone = await get().cloneObject(object);

    //       const angle = angleStep * i;
    //       const rad = fabric.util.degreesToRadians(angle);

    //       const radius = baseRadius + gap;

    //       // rotate unit vector * radius
    //       const rx =
    //         (baseDx / baseRadius) * radius * Math.cos(rad) -
    //         (baseDy / baseRadius) * radius * Math.sin(rad);

    //       const ry =
    //         (baseDx / baseRadius) * radius * Math.sin(rad) +
    //         (baseDy / baseRadius) * radius * Math.cos(rad);

    //       const newCenterX = pivotX + rx;
    //       const newCenterY = pivotY + ry;

    //       clone.set({
    //         angle: object.angle + angle,
    //       });

    //       clone.setPositionByOrigin(
    //         new fabric.Point(newCenterX, newCenterY),
    //         "center",
    //         "center"
    //       );

    //       clone.setCoords();
    //       canvas.add(clone);
    //     }

    //     canvas.requestRenderAll();
    //   },

    // -------------------------------
    // REPEAT ALONG PATH (simplified)
    // -------------------------------
    repeatAlongPath1: async (obj, path, spacing = 20) => {
        const canvas = get().canvas;
        if (!canvas || !obj || !path) return;

        const clones = [];
        const length = path.getTotalLength();

        for (let d = 0; d < length; d += spacing) {
            const point = path.getPointAtLength(d);
            const cloned = await get().cloneObject(obj);

            cloned.set({
                left: point.x,
                top: point.y,
                originX: 'center',
                originY: 'center',
            });

            canvas.add(cloned);
            clones.push(cloned);
        }
        return clones;
    },

    repeatAlongPath23: async (
        obj: fabric.Object,
        path: fabric.Path,
        spacing: number = 20,
        options?: {
            rotateAlongPath?: boolean;
            scaleStep?: number;
            opacityFade?: boolean;
        },
    ) => {
        if (!obj || !path) return;
        const canvas = obj.canvas;
        if (!canvas) return;

        const { rotateAlongPath = false, scaleStep = 0, opacityFade = false } = options || {};

        // 1️⃣ Get total path length
        const totalLength = path.path.reduce((acc, seg, i, arr) => {
            // Approximate each segment length
            if (seg[0] === 'M') return acc; // MoveTo
            const prev = arr[i - 1];
            if (!prev) return acc;
            const dx = seg[1] - prev[1];
            const dy = seg[2] - prev[2];
            return acc + Math.hypot(dx, dy);
        }, 0);

        // 2️⃣ Number of clones
        const count = Math.floor(totalLength / spacing);
        if (count < 1) return;

        // 3️⃣ Sample points along path
        const points: { x: number; y: number; angle: number }[] = [];
        let accumulatedLength = 0;

        const sampleStep = 1; // pixels
        const prevPoint =
            path.path[0][0] === 'M' ? { x: path.path[0][1], y: path.path[0][2] } : { x: 0, y: 0 };
        for (let i = 1; i < path.path.length; i++) {
            const seg = path.path[i];
            if (seg[0] === 'L') {
                const x2 = seg[1];
                const y2 = seg[2];
                const dx = x2 - prevPoint.x;
                const dy = y2 - prevPoint.y;
                const segLength = Math.hypot(dx, dy);
                const steps = Math.floor(segLength / sampleStep);
                for (let s = 0; s < steps; s++) {
                    accumulatedLength += sampleStep;
                    if (accumulatedLength % spacing < sampleStep) {
                        const t = s / steps;
                        const x = prevPoint.x + dx * t;
                        const y = prevPoint.y + dy * t;
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                        points.push({ x, y, angle });
                    }
                }
                prevPoint.x = x2;
                prevPoint.y = y2;
            }
        }

        // 4️⃣ Place clones
        for (let i = 0; i < points.length; i++) {
            const clone = await get().cloneObject(obj);

            const pt = points[i];

            clone.set({
                left: pt.x,
                top: pt.y,
                angle: rotateAlongPath ? pt.angle : obj.angle,
                scaleX: obj.scaleX! * (1 + scaleStep * i),
                scaleY: obj.scaleY! * (1 + scaleStep * i),
                opacity: opacityFade ? Math.max(0, 1 - i / points.length) : obj.opacity,
            });

            clone.setOriginX('center');
            clone.setOriginY('center');
            clone.setCoords();
            canvas.add(clone);
        }

        canvas.requestRenderAll();
    },

    // repeatAlongPath: async (
    //   obj: fabric.Object,
    //   path: fabric.Path,
    //   spacing = 20,
    //   options = {
    //     rotateAlongPath: true,
    //     scaleStep: 0,
    //     opacityFade: false,
    //   }
    // ) => {
    //   const canvas = get().canvas;
    //   if (!canvas || !obj || !path) return;

    //   const pathLength = path.pathOffset
    //     ? path.pathOffset.x + path.pathOffset.y
    //     : path.path.length * 10;

    //   const base = await obj.clone();
    //   const group: fabric.Object[] = [];

    //   const steps = Math.floor(pathLength / spacing);

    //   for (let i = 0; i < steps; i++) {
    //     const t = i / steps;

    //     // 🔑 Fabric helper (IMPORTANT)
    //     const point = fabric.util.getPointOnPath(path.path, t);

    //     const clone = await base.clone();

    //     clone.set({
    //       left: point.x,
    //       top: point.y,
    //       originX: "center",
    //       originY: "center",
    //       scaleX: obj.scaleX! * (1 + options.scaleStep * i),
    //       scaleY: obj.scaleY! * (1 + options.scaleStep * i),
    //       opacity: options.opacityFade ? 1 - i / steps : obj.opacity,
    //     });

    //     if (options.rotateAlongPath) {
    //       clone.rotate(point.angle || 0);
    //     }

    //     group.push(clone);
    //     canvas.add(clone);
    //   }

    //   canvas.requestRenderAll();
    // },

    // repeatAlongPath: async (
    //   obj,
    //   fabricPath,
    //   spacing = 30,
    //   options = { rotateAlongPath: true }
    // ) => {
    //   const canvas = get().canvas;
    //   if (!canvas || !obj || !fabricPath) return;

    //   setupPaper(canvas);

    //   const paperPath = fabricPathToPaper(fabricPath);
    //   const length = paperPath.length;

    //   const base = await obj.clone();
    //   const count = Math.floor(length / spacing);

    //   for (let i = 0; i <= count; i++) {
    //     const offset = i * spacing;

    //     const point = paperPath.getPointAt(offset);
    //     if (!point) continue;

    //     const clone = await base.clone();

    //     clone.set({
    //       left: point.x,
    //       top: point.y,
    //       originX: "center",
    //       originY: "center",
    //     });

    //     if (options.rotateAlongPath) {
    //       const tangent = paperPath.getTangentAt(offset);
    //       clone.rotate(tangent.angle);
    //     }

    //     canvas.add(clone);
    //   }

    //   canvas.requestRenderAll();
    // },

    repeatAlongPath: async (
        obj: fabric.Object,
        path: fabric.Path,
        spacing = 30,
        options = { rotateAlongPath: true },
    ) => {
        const canvas = get().canvas;
        if (!canvas) return;

        const segments = fabric.util.getPathSegmentsInfo(path.path);
        const totalLength = segments.at(-1)?.length || 0;
        if (!totalLength) return;

        canvas.discardActiveObject();

        for (let d = spacing; d <= totalLength; d += spacing) {
            const { x, y, angle } = getWorldPointOnPath(path, d);

            const clone = await obj.clone();

            clone.set({
                left: x,
                top: y,
                originX: 'center',
                originY: 'center',
                angle: options.rotateAlongPath ? (angle * 180) / Math.PI : obj.angle,
            });

            canvas.add(clone);
        }

        canvas.requestRenderAll();
    },

    // -------------------------------
    // PATTERN FILL
    // -------------------------------
    fillPattern: async (obj, target) => {
        if (!obj || !target) return;
        const canvas = get().canvas;
        if (!canvas) return;

        const cloned = await get().cloneObject(obj);
        const pattern = new fabric.Pattern({
            source: cloned.toCanvasElement(),
            repeat: 'repeat',
        });

        target.set('fill', pattern);
        canvas.requestRenderAll();
        return pattern;
    },

    // -------------------------------
    // DELETE OBJECT
    // -------------------------------
    removeObject: (obj) => {
        const canvas = get().canvas;
        if (!canvas || !obj) return;

        canvas.remove(obj);
        set({ objects: get().objects.filter((o) => o !== obj) });
    },
});

import paper from 'paper';

export const setupPaper = (canvas: fabric.Canvas) => {
    if ((paper as any)._isSetup) return;

    const el = document.createElement('canvas');
    el.width = canvas.getWidth();
    el.height = canvas.getHeight();

    paper.setup(el);
    (paper as any)._isSetup = true;
};

const fabricPathToPaper = (fabricPath: fabric.Path) => {
    const paperPath = new paper.Path();

    // 🔑 important offsets
    const { left = 0, top = 0, pathOffset } = fabricPath;

    const ox = left - pathOffset.x;
    const oy = top - pathOffset.y;

    fabricPath.path.forEach((cmd) => {
        const [type, ...pts] = cmd;

        const map = (x: number, y: number) => new paper.Point(x + ox, y + oy);

        if (type === 'M') paperPath.moveTo(map(pts[0], pts[1]));
        if (type === 'L') paperPath.lineTo(map(pts[0], pts[1]));
        if (type === 'C')
            paperPath.cubicCurveTo(map(pts[0], pts[1]), map(pts[2], pts[3]), map(pts[4], pts[5]));
        if (type === 'Q') paperPath.quadraticCurveTo(map(pts[0], pts[1]), map(pts[2], pts[3]));
    });

    return paperPath;
};

// const fabricPathToPaper = (path: fabric.Path) => {
//   const paperPath = new paper.Path();

//   path.path.forEach(cmd => {
//     const [type, ...pts] = cmd;

//     if (type === "M") paperPath.moveTo(new paper.Point(pts[0], pts[1]));
//     if (type === "L") paperPath.lineTo(new paper.Point(pts[0], pts[1]));
//     if (type === "C")
//       paperPath.cubicCurveTo(
//         new paper.Point(pts[0], pts[1]),
//         new paper.Point(pts[2], pts[3]),
//         new paper.Point(pts[4], pts[5])
//       );
//     if (type === "Q")
//       paperPath.quadraticCurveTo(
//         new paper.Point(pts[0], pts[1]),
//         new paper.Point(pts[2], pts[3])
//       );
//   });

//   return paperPath;
// };

function samplePath(path: fabric.Path, step = 5) {
    const points: { x: number; y: number; angle: number }[] = [];

    const tempPath = new fabric.Path(path.path, {
        left: 0,
        top: 0,
    });

    const bounds = tempPath.getBoundingRect();
    const length = tempPath.getTotalLength();

    for (let d = 0; d <= length; d += step) {
        const p = tempPath.getPointAtLength(d);
        const p2 = tempPath.getPointAtLength(Math.min(d + 1, length));

        const angle = Math.atan2(p2.y - p.y, p2.x - p.x);

        points.push({
            x: p.x + path.left! - bounds.left,
            y: p.y + path.top! - bounds.top,
            angle,
        });
    }

    return points;
}

function getPathLength(path: fabric.Path) {
    const segments = fabric.util.getPathSegmentsInfo(path.path);
    return segments[segments.length - 1].length;
}

function getTotalPathLength(path: fabric.Path) {
    const segments = fabric.util.getPathSegmentsInfo(path.path);
    return segments[segments.length - 1]?.length || 0;
}

function getPointAndAngleAtDistance(path: fabric.Path, distance: number) {
    const p = fabric.util.getPointOnPath(path.path, distance);

    // small delta to compute tangent
    const p2 = fabric.util.getPointOnPath(path.path, distance + 0.1);

    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);

    return { x: p.x, y: p.y, angle };
}

function getPointAtLength(path: fabric.Path, distance: number) {
    const segments = fabric.util.getPathSegmentsInfo(path.path);

    let segIndex = 0;
    while (segIndex < segments.length && segments[segIndex].length < distance) {
        segIndex++;
    }

    const seg = segments[Math.max(segIndex - 1, 0)];
    const segLength = segments[segIndex]?.length ?? seg.length;

    const prevLength = segIndex > 0 ? segments[segIndex - 1].length : 0;
    const t = (distance - prevLength) / (segLength - prevLength || 1);

    const p = fabric.util.getPointOnPath(path.path, segIndex, t);

    const p2 = fabric.util.getPointOnPath(path.path, segIndex, Math.min(t + 0.01, 1));

    const angle = Math.atan2(p2.y - p.y, p2.x - p.x);

    return { x: p.x, y: p.y, angle };
}

function getWorldPointOnPath(path: fabric.Path, distance: number) {
    const localPoint = fabric.util.getPointOnPath(path.path, distance);

    const matrix = path.calcTransformMatrix();
    const worldPoint = fabric.util.transformPoint(
        new fabric.Point(localPoint.x, localPoint.y),
        matrix,
    );

    const p2 = fabric.util.getPointOnPath(path.path, distance + 0.1);
    const worldPoint2 = fabric.util.transformPoint(new fabric.Point(p2.x, p2.y), matrix);

    const angle = Math.atan2(worldPoint2.y - worldPoint.y, worldPoint2.x - worldPoint.x);

    return { x: worldPoint.x, y: worldPoint.y, angle };
}
