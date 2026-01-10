import { useStore } from '@/store';
import { useEffect, useState } from 'react';
import { EffectSection } from './EffectSection';
import { TransformInput } from '@/components/molecules/TransformInput';
import * as fabric from 'fabric';

export const addDemoPaths = (canvas: fabric.Canvas) => {
    if (!canvas || canvas.getObjects('path').length) return;

    const cx = canvas.getWidth() / 2;
    const cy = canvas.getHeight() / 2;

    // const paths = [
    //   new fabric.Path("M 0 0 L 300 0", { left: cx - 150, top: cy - 120 }),
    //   new fabric.Path("M 0 0 C 100 -150 200 150 300 0", { left: cx - 150, top: cy }),
    //   new fabric.Path("M 0 0 Q 150 -200 300 0", { left: cx - 150, top: cy + 140 }),
    // ];
    const r = 120;

    const paths = [
        // Line
        new fabric.Path('M 0 0 L 300 0', { left: cx - 150, top: cy - 180 }),

        // Cubic curve
        new fabric.Path('M 0 0 C 100 -150 200 150 300 0', { left: cx - 150, top: cy - 90 }),

        // Quadratic
        new fabric.Path('M 0 0 Q 150 -200 300 0', { left: cx - 150, top: cy }),

        // Wave
        new fabric.Path('M 0 0 Q 50 -50 100 0 T 200 0 T 300 0', {
            left: cx - 150,
            top: cy + 90,
        }),

        // Zig-zag
        new fabric.Path('M 0 0 L 50 -50 L 100 50 L 150 -50 L 200 50 L 250 -50 L 300 0', {
            left: cx - 150,
            top: cy + 180,
        }),

        // 🔵 Circle
        new fabric.Path(
            `
      M ${r} 0
      C ${r} ${r * 0.5523} ${r * 0.5523} ${r} 0 ${r}
      C ${-r * 0.5523} ${r} ${-r} ${r * 0.5523} ${-r} 0
      C ${-r} ${-r * 0.5523} ${-r * 0.5523} ${-r} 0 ${-r}
      C ${r * 0.5523} ${-r} ${r} ${-r * 0.5523} ${r} 0
      Z
      `,
            { left: cx, top: cy + 300 },
        ),

        // 🟠 Semi-circle
        new fabric.Path(
            `
      M ${-r} 0
      C ${-r} ${-r * 0.5523} ${-r * 0.5523} ${-r} 0 ${-r}
      C ${r * 0.5523} ${-r} ${r} ${-r * 0.5523} ${r} 0
      `,
            { left: cx - r, top: cy + 460 },
        ),
    ];

    paths.forEach((p) => {
        p.set({
            stroke: '#3b82f6',
            fill: '',
            strokeWidth: 2,

            // hidden until selected
            visible: false,
            selectable: false,
            evented: false,

            objectCaching: false,
            uid: crypto.randomUUID(), // unique id for dropdown
        });

        canvas.add(p);
    });

    canvas.requestRenderAll();
};

function showOnlyPath(canvas: fabric.Canvas, active?: fabric.Path) {
    canvas.getObjects('path').forEach((p) => {
        p.set({
            visible: p === active,
            selectable: p === active,
            evented: p === active,
            opacity: p === active ? 1 : 0,
        });
    });

    canvas.requestRenderAll();
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

export const repeatAlongPath = async (
    obj: fabric.Object,
    path: fabric.Path,
    spacing = 30,
    options: { rotateAlongPath?: boolean } = { rotateAlongPath: true },
) => {
    const canvas = obj.canvas || path.canvas;
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
};

export const RepeatAlongPath = () => {
    const { canvas } = useStore();
    const activeObject = canvas?.getActiveObject();

    const [spacing, setSpacing] = useState(30);
    const [rotateAlongPath, setRotateAlongPath] = useState(true);

    const paths = (canvas?.getObjects('path') || []) as fabric.Path[];
    const [selectedPath, setSelectedPath] = useState<fabric.Path | null>(null);

    // create demo paths once
    useEffect(() => {
        if (!canvas) return;
        addDemoPaths(canvas);

        return () => {
            // cleanup on unmount
            canvas.getObjects('path').forEach((p) => canvas.remove(p));
            canvas.requestRenderAll();
        };
    }, [canvas]);

    // auto-select first path once
    useEffect(() => {
        if (!selectedPath && paths.length) {
            const first = paths[0];
            setSelectedPath(first);
            showOnlyPath(canvas, first);
        }
    }, [paths, selectedPath]);

    if (!canvas) return null;

    return (
        <EffectSection
            title="Repeat Along Path"
            disabled={!activeObject || !selectedPath}
            onApply={() => {
                if (!activeObject || !selectedPath) return;
                repeatAlongPath(activeObject, selectedPath, spacing, {
                    rotateAlongPath,
                });
            }}
        >
            {/* PATH SELECTOR */}
            <label className="text-xs">Path</label>
            <select
                className="w-full border px-2 py-1"
                value={selectedPath?.uid}
                onChange={(e) => {
                    const path = paths.find((p) => p.uid === e.target.value);
                    if (!path) return;

                    setSelectedPath(path);
                    showOnlyPath(canvas, path);

                    canvas.discardActiveObject();
                    canvas.setActiveObject(path);
                }}
            >
                {paths.map((p, i) => (
                    <option key={p.uid} value={p.uid}>
                        Path {i + 1}
                    </option>
                ))}
            </select>

            {/* SPACING */}
            <TransformInput
                label="Spacing"
                value={spacing}
                onChange={(v) => setSpacing(+v || 20)}
            />

            {/* ROTATE ALONG PATH */}
            <button
                onClick={() => setRotateAlongPath((v) => !v)}
                className="w-full mt-2 bg-gray-200"
            >
                Rotate Along Path: {rotateAlongPath ? 'ON' : 'OFF'}
            </button>
        </EffectSection>
    );
};
