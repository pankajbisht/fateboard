import * as fabric from 'fabric';

export function updateMaster(master: fabric.Object & { __instances?: fabric.Object[] }) {
    if (!master.__instances || master.__instances.length === 0) return;

    const props = {
        // 🎨 Visual
        fill: master.fill,
        stroke: master.stroke,
        strokeWidth: master.strokeWidth,
        strokeDashArray: master.strokeDashArray,
        strokeLineCap: master.strokeLineCap,
        strokeLineJoin: master.strokeLineJoin,
        strokeMiterLimit: master.strokeMiterLimit,
        opacity: master.opacity,
        shadow: master.shadow,
        strokeUniform: master.strokeUniform,

        // 🔄 Transform
        scaleX: master.scaleX,
        scaleY: master.scaleY,
        angle: master.angle,
        skewX: master.skewX,
        skewY: master.skewY,
        flipX: master.flipX,
        flipY: master.flipY,

        // 🧱 Shape specific
        rx: (master as any).rx,
        ry: (master as any).ry,
        radius: (master as any).radius,
        path: (master as any).path,
    };

    master.__instances.forEach((instance) => {
        instance.set(props);
        instance.setCoords();
    });

    master.canvas?.requestRenderAll();
}
