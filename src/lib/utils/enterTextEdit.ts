export function enterTextEdit(group, text) {
    const canvas = group.canvas;
    const center = group.getCenterPoint();

    // Normalize text scale
    text.scaleX *= group.scaleX;
    text.scaleY *= group.scaleY;

    // Reset group scale temporarily
    group.scaleX = 1;
    group.scaleY = 1;

    // Remove text from group
    group.remove(text);

    text.set({
        left: center.x,
        top: center.y,
        angle: group.angle,
        flipX: group.flipX,
        flipY: group.flipY,
        originX: 'center',
        originY: 'center',
    });

    canvas.remove(group);
    canvas.add(text);
    canvas.setActiveObject(text);

    text.enterEditing();
    text.selectAll();
    text.setCoords();
    canvas.requestRenderAll();
}
