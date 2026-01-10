import * as fabric from 'fabric';
import { useStore } from '..';

/* ============================================================
   Node Types
============================================================ */
type NodeType = 'anchor' | 'handle' | 'resize' | 'rotation';

interface PathNode {
    type: 'anchor' | 'handle';
    index: number; // path segment index
    seg: any[];
    node: fabric.Circle;
    handle?: fabric.Circle;
    oppositeHandle?: fabric.Circle;
    handleLine?: fabric.Line;
    oppositeHandleLine?: fabric.Line;
    handlesVisible?: boolean;
}

/* ============================================================
   Helper Functions
============================================================ */

/**
 * Sync anchor node to path segment
 */
function updatePathSegmentFromNode(path: fabric.Path, seg: any[], node: fabric.Circle) {
    const center = path.getCenterPoint();
    const angle = fabric.util.degreesToRadians(path.angle || 0);
    const scaleX = path.scaleX || 1;
    const scaleY = path.scaleY || 1;
    const offset = path.pathOffset || { x: 0, y: 0 };

    const dx = node.left! - center.x;
    const dy = node.top! - center.y;

    const localX = (dx * Math.cos(-angle) - dy * Math.sin(-angle)) / scaleX;
    const localY = (dx * Math.sin(-angle) + dy * Math.cos(-angle)) / scaleY;

    seg[1] = localX + offset.x;
    seg[2] = localY + offset.y;

    path.dirty = true;
    path.setCoords();
}

/**
 * Compute handle position for curve segment
 */
function computeHandlePosition(seg: any[], anchor: fabric.Circle, opposite?: boolean) {
    if (seg[0] === 'C') {
        const x = seg[opposite ? 3 : 1];
        const y = seg[opposite ? 4 : 2];
        return { x, y };
    } else if (seg[0] === 'Q') {
        const x = seg[opposite ? 1 : 1];
        const y = seg[opposite ? 2 : 2];
        return { x, y };
    }
    return { x: seg[1], y: seg[2] };
}

/**
 * Update handle segment position
 */
function updateHandleSegment(seg: any[], handle: fabric.Circle, opposite?: boolean) {
    if (seg[0] === 'C') {
        if (opposite) {
            seg[3] = handle.left!;
            seg[4] = handle.top!;
        } else {
            seg[1] = handle.left!;
            seg[2] = handle.top!;
        }
    } else if (seg[0] === 'Q') {
        seg[1] = handle.left!;
        seg[2] = handle.top!;
    }
}

/**
 * Update smooth handle: mirror opposite handle
 */
function updateSmoothHandle(anchor: PathNode, movedHandle: fabric.Circle) {
    if (!anchor.oppositeHandle) return;

    const dx = movedHandle.left! - anchor.node.left!;
    const dy = movedHandle.top! - anchor.node.top!;
    const opposite = anchor.oppositeHandle;

    opposite.set({ left: anchor.node.left! - dx, top: anchor.node.top! - dy });
    opposite.setCoords();
}

/**
 * Sync Fabric node to path segment
 */
function syncNodeToPath(node: fabric.Circle, path: fabric.Path, seg: any[]) {
    const center = path.getCenterPoint();
    const angle = fabric.util.degreesToRadians(path.angle || 0);
    const scaleX = path.scaleX || 1;
    const scaleY = path.scaleY || 1;
    const offset = path.pathOffset || { x: 0, y: 0 };

    const x = (seg[1] - offset.x) * scaleX;
    const y = (seg[2] - offset.y) * scaleY;

    const rx = x * Math.cos(angle) - y * Math.sin(angle);
    const ry = x * Math.sin(angle) + y * Math.cos(angle);

    node.set({ left: center.x + rx, top: center.y + ry });
    node.setCoords();
}

/* ============================================================
   Normalize primitives
============================================================ */
function normalizePrimitivePath(path: fabric.Path) {
    if (!path.path) return;

    if (path.type === 'circle' || path.type === 'ellipse') {
        const radiusX = (path.width || 0) / 2;
        const radiusY = (path.height || 0) / 2;

        // Only 4 anchors (top, right, bottom, left)
        path.path = [
            ['M', 0, -radiusY],
            ['L', radiusX, 0],
            ['L', 0, radiusY],
            ['L', -radiusX, 0],
            ['Z'],
        ];

        path.dirty = true;
        path.setCoords();
    }
}

/* ============================================================
   Add Path Nodes
============================================================ */
// export function addPathNodes(canvas: fabric.Canvas, path: fabric.Path): PathNode[] {
//     if (!path.path) return [];
//     const nodes: PathNode[] = [];

//     path.path.selectable = false;
//     path.path.evented = false;

//     console.log(path)

//     path.path.forEach((seg: any[], index: number) => {
//         if (seg.length < 3 || seg[0] === 'Z') return;

//         // Anchor node
//         const anchor = new fabric.Circle({
//             radius: 5,
//             fill: 'white',
//             stroke: 'blue',
//             strokeWidth: 2,
//             originX: 'center',
//             originY: 'center',
//             selectable: true,
//             evented: true,
//             hoverCursor: 'pointer',
//         });

//         syncNodeToPath(anchor, path, seg);

//         anchor.on('moving', () => {
//             updatePathSegmentFromNode(path, seg, anchor);
//             // Update smooth handle if exists
//             const nodeData = nodes.find((n) => n.node === anchor);
//             if (nodeData) updateSmoothHandle(nodeData, nodeData.handle!);
//             canvas.requestRenderAll();
//         });

//         anchor.on('mousedblclick', () => deleteNode(canvas, path, anchor, seg));

//         anchor.on('selected', () => {
//             setHandlesVisible(nodeData, true);
//         });

//         anchor.on('deselected', () => {
//             setHandlesVisible(nodeData, false);
//         });

//         // Initially hidden
//         // setHandlesVisible(nodeData, false);

//         canvas.add(anchor);

//         const nodeData: PathNode = { type: 'anchor', index, seg, node: anchor };

//         // Create handles for curves
//         // if (seg[0] === "C" || seg[0] === "Q") {
//         //   const handle1Pos = computeHandlePosition(seg, anchor, false);
//         //   const handle1 = new fabric.Circle({
//         //     radius: 4,
//         //     fill: "orange",
//         //     stroke: "red",
//         //     strokeWidth: 1,
//         //     originX: "center",
//         //     originY: "center",
//         //     selectable: true,
//         //     evented: true,
//         //     hoverCursor: "crosshair",
//         //   });
//         //   handle1.set({ left: handle1Pos.x, top: handle1Pos.y });
//         //   handle1.on("moving", () => {
//         //     updateHandleSegment(seg, handle1, false);
//         //     updateSmoothHandle(nodeData, handle1);
//         //     canvas.requestRenderAll();
//         //   });

//         //   canvas.add(handle1);
//         //   nodeData.handle = handle1;

//         //   // Optional opposite handle for smooth curves
//         //   if (seg[0] === "C") {
//         //     const handle2Pos = computeHandlePosition(seg, anchor, true);
//         //     const handle2 = new fabric.Circle({
//         //       radius: 4,
//         //       fill: "orange",
//         //       stroke: "red",
//         //       strokeWidth: 1,
//         //       originX: "center",
//         //       originY: "center",
//         //       selectable: true,
//         //       evented: true,
//         //       hoverCursor: "crosshair",
//         //     });
//         //     handle2.set({ left: handle2Pos.x, top: handle2Pos.y });
//         //     handle2.on("moving", () => {
//         //       updateHandleSegment(seg, handle2, true);
//         //       updateSmoothHandle(nodeData, handle2);
//         //       canvas.requestRenderAll();
//         //     });

//         //     canvas.add(handle2);
//         //     nodeData.oppositeHandle = handle2;
//         //   }
//         // }

//         if (seg[0] === 'C' || seg[0] === 'Q') {
//             // Handle1
//             const handle1Pos = computeHandlePosition(seg, anchor, false);
//             // const handle1 = new fabric.Circle({...});
//             const handle1 = new fabric.Circle({
//                 radius: 4,
//                 fill: 'orange',
//                 stroke: 'red',
//                 strokeWidth: 1,
//                 originX: 'center',
//                 originY: 'center',
//                 selectable: true,
//                 evented: true,
//                 hoverCursor: 'crosshair',
//             });
//             handle1.set({ left: handle1Pos.x, top: handle1Pos.y });
//             canvas.add(handle1);

//             // const handleLine = createHandleLine(canvas, anchor, handle1);
//             const handleLine = createHandleLine(canvas, anchor, handle1, 50);

//             // Optional opposite handle
//             let oppositeHandleLine;
//             if (seg[0] === 'C') {
//                 const handle2Pos = computeHandlePosition(seg, anchor, true);
//                 const handle2 = new fabric.Circle({
//                     radius: 4,
//                     fill: 'orange',
//                     stroke: 'red',
//                     strokeWidth: 1,
//                     originX: 'center',
//                     originY: 'center',
//                     selectable: true,
//                     evented: true,
//                     hoverCursor: 'crosshair',
//                 });
//                 handle2.set({ left: handle2Pos.x, top: handle2Pos.y });
//                 canvas.add(handle2);

//                 // oppositeHandleLine = createHandleLine(canvas, anchor, handle2);
//                 oppositeHandleLine = createHandleLine(canvas, anchor, handle2, 50);

//                 nodeData.oppositeHandle = handle2;
//                 nodeData.oppositeHandleLine = oppositeHandleLine;
//             }

//             nodeData.handle = handle1;
//             nodeData.handleLine = handleLine;
//         }

//         nodes.push(nodeData);
//     });

//     return nodes;
// }

export function addPathNodes(canvas: fabric.Canvas, path: fabric.Path) {
    if (!path.path) return [];

    // HARD lock path
    path.selectable = false;
    path.evented = false;

    const nodes: { node: fabric.Circle; seg: any[] }[] = [];

    path.path.forEach((seg: any[]) => {
        if (typeof seg[1] !== 'number' || typeof seg[2] !== 'number') return;

        const node = new fabric.Circle({
            radius: 5,
            fill: 'white',
            stroke: 'blue',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
            hasControls: false,
            hasBorders: false,
            selectable: true,
            evented: true,
            hoverCursor: 'pointer',
        });

        syncNodeToPath(node, path, seg);

        node.on('moving', () => {
            const center = path.getCenterPoint();
            const angle = fabric.util.degreesToRadians(path.angle || 0);
            const scaleX = path.scaleX || 1;
            const scaleY = path.scaleY || 1;

            const dx = node.left! - center.x;
            const dy = node.top! - center.y;

            const localX = dx * Math.cos(-angle) - dy * Math.sin(-angle);
            const localY = dx * Math.sin(-angle) + dy * Math.cos(-angle);

            seg[1] = localX / scaleX;
            seg[2] = localY / scaleY;

            path.dirty = true;
            path.setCoords();

            // 🔑 re-sync ALL nodes
            nodes.forEach((n) => syncNodeToPath(n.node, path, n.seg));

            canvas.requestRenderAll();
        });

        canvas.on('mouse:down', (e) => {
            const store = useStore.getState();
            if (store.activeTool && !e.target) {
                store.exitNodeMode(canvas);
            }
        });

        canvas.add(node);
        nodes.push({ node, seg });
    });

    return nodes;
}

/* ============================================================
   Node Management
============================================================ */
function addNode(canvas: fabric.Canvas, path: fabric.Path, x: number, y: number) {
    if (!path.path) return;

    const offset = path.pathOffset || { x: 0, y: 0 };
    const newSeg = ['L', x - offset.x, y - offset.y];

    path.path.push(newSeg);

    const anchor = new fabric.Circle({
        radius: 5,
        fill: 'white',
        stroke: 'blue',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hoverCursor: 'pointer',
    });
    anchor.set({ left: x, top: y });

    anchor.on('moving', () => updatePathSegmentFromNode(path, newSeg, anchor));
    anchor.on('mousedblclick', () => deleteNode(canvas, path, anchor, newSeg));

    canvas.add(anchor);
    path.dirty = true;
    path.setCoords();
    canvas.requestRenderAll();
}

function deleteNode(canvas: fabric.Canvas, path: fabric.Path, node: fabric.Circle, seg: any[]) {
    const index = path.path!.indexOf(seg);
    if (index > -1) path.path!.splice(index, 1);
    canvas.remove(node);
    path.dirty = true;
    path.setCoords();
    canvas.requestRenderAll();
}

/* ============================================================
   Fabric → Paper.js Conversion
============================================================ */
import paper from 'paper';

export async function fabricSelectionToPaper(
    canvas: fabric.Canvas,
): Promise<{ d: string; center: fabric.Point } | null> {
    const active = canvas.getActiveObject();
    if (!active) return null;

    const clone: fabric.Object = await active.clone();
    clone.set({ left: 0, top: 0, angle: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 });

    const center = active.getCenterPoint();
    const svg = clone.toSVG();

    const scope = new paper.PaperScope();
    scope.setup(new scope.Size(1, 1));
    scope.activate();

    const paperItem = scope.project.importSVG(svg, { expandShapes: true, insert: false });
    if (!paperItem) return null;

    let pathData: string | null = null;
    if (paperItem instanceof scope.Path || paperItem instanceof scope.CompoundPath)
        pathData = paperItem.pathData;
    else if (paperItem instanceof scope.Group) {
        const firstPath = paperItem.getItems({ class: scope.Path, recursive: true })[0];
        if (firstPath) pathData = firstPath.pathData;
    }

    scope.project.clear();
    if (!pathData) return null;
    return { d: pathData, center };
}

function enablePathInsert(canvas: fabric.Canvas, path: fabric.Path, nodes: PathNode[]) {
    path.on('mousedown', (opt) => {
        const pointer = canvas.getPointer(opt.e);
        const clickX = pointer.x;
        const clickY = pointer.y;

        if (!path.path) return;

        let minDist = Infinity;
        let insertIndex = 0;

        for (let i = 0; i < path.path.length - 1; i++) {
            const seg1 = path.path[i];
            const seg2 = path.path[i + 1];
            const x1 = seg1[1] + (path.pathOffset?.x || 0);
            const y1 = seg1[2] + (path.pathOffset?.y || 0);
            const x2 = seg2[1] + (path.pathOffset?.x || 0);
            const y2 = seg2[2] + (path.pathOffset?.y || 0);

            const dist = distanceToSegment(
                { x: clickX, y: clickY },
                { x: x1, y: y1 },
                { x: x2, y: y2 },
            );
            if (dist < minDist) {
                minDist = dist;
                insertIndex = i + 1;
            }
        }

        if (minDist < 20) {
            const newSeg = [
                'L',
                clickX - (path.pathOffset?.x || 0),
                clickY - (path.pathOffset?.y || 0),
            ];
            createAnchor(canvas, path, newSeg, insertIndex, clickX, clickY, nodes);
        }
    });
}

// // Insert node at index
// function insertNode(canvas: fabric.Canvas, path: fabric.Path, nodes: PathNode[], index: number, x: number, y: number) {
//   const offset = path.pathOffset || { x: 0, y: 0 };
//   const newSeg = ["L", x - offset.x, y - offset.y];

//   path.path.splice(index, 0, newSeg);

//   const anchor = new fabric.Circle({
//     radius: 5,
//     fill: "white",
//     stroke: "blue",
//     strokeWidth: 2,
//     originX: "center",
//     originY: "center",
//     selectable: true,
//     evented: true,
//     hoverCursor: "pointer",
//   });
//   anchor.set({ left: x, top: y });
//   canvas.add(anchor);

//   anchor.on("moving", () => updatePathSegmentFromNode(path, newSeg, anchor));
//   anchor.on("mousedblclick", () => deleteNode(canvas, path, anchor, newSeg));

//   nodes.splice(index, 0, { type: "anchor", index, seg: newSeg, node: anchor });

//   path.dirty = true;
//   path.setCoords();
//   canvas.requestRenderAll();
// }

// Distance from point to line segment
function distanceToSegment(
    p: { x: number; y: number },
    v: { x: number; y: number },
    w: { x: number; y: number },
) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    const t = Math.max(
        0,
        Math.min(1, ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2),
    );
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.hypot(p.x - projX, p.y - projY);
}

function addRotationHandle(canvas: fabric.Canvas, path: fabric.Path) {
    const bbox = path.getBoundingRect(true);
    const handle = new fabric.Circle({
        radius: 6,
        fill: 'green',
        stroke: 'black',
        strokeWidth: 1,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hoverCursor: 'crosshair',
    });

    handle.selectable = false;
    // handle.evented = false;

    handle.set({ left: bbox.left + bbox.width / 2, top: bbox.top - 30 });

    handle.on('moving', () => {
        const center = path.getCenterPoint();
        const dx = handle.left! - center.x;
        const dy = handle.top! - center.y;
        const angle = Math.atan2(dy, dx);
        path.set({ angle: fabric.util.radiansToDegrees(angle) });
        path.setCoords();
        canvas.requestRenderAll();
    });

    // canvas.add(handle);
    return handle;
}

function clampLine(line: fabric.Line, canvas: fabric.Canvas) {
    const maxX = canvas.width!;
    const maxY = canvas.height!;

    line.set({
        x1: Math.min(Math.max(0, line.x1!), maxX),
        y1: Math.min(Math.max(0, line.y1!), maxY),
        x2: Math.min(Math.max(0, line.x2!), maxX),
        y2: Math.min(Math.max(0, line.y2!), maxY),
    });
}

function createHandleLine(
    canvas: fabric.Canvas,
    anchor: fabric.Circle,
    handle: fabric.Circle,
    maxLength = 50,
) {
    const line = new fabric.Line([anchor.left!, anchor.top!, handle.left!, handle.top!], {
        stroke: 'yellow',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        strokeDashArray: [4, 2],
    });
    canvas.add(line);

    const updateLine = () => {
        const dx = handle.left! - anchor.left!;
        const dy = handle.top! - anchor.top!;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let x2 = handle.left!;
        let y2 = handle.top!;

        if (distance > maxLength) {
            const scale = maxLength / distance;
            x2 = anchor.left! + dx * scale;
            y2 = anchor.top! + dy * scale;
        }

        line.set({ x1: anchor.left, y1: anchor.top, x2, y2 });
        line.setCoords();
        canvas.requestRenderAll();
    };

    anchor.on('moving', updateLine);
    handle.on('moving', updateLine);

    updateLine();
    return line;
}

function insertNode(
    canvas: fabric.Canvas,
    path: fabric.Path,
    nodes: PathNode[],
    index: number,
    x: number,
    y: number,
) {
    const offset = path.pathOffset || { x: 0, y: 0 };
    const newSeg = ['L', x - offset.x, y - offset.y];
    path.path.splice(index, 0, newSeg);

    const anchor = new fabric.Circle({
        radius: 5,
        fill: 'white',
        stroke: 'blue',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hoverCursor: 'pointer',
    });
    anchor.set({ left: x, top: y });
    canvas.add(anchor);

    const nodeData: PathNode = { type: 'anchor', index, seg: newSeg, node: anchor };

    // Setup handles if segment is curve
    if (newSeg[0] === 'C' || newSeg[0] === 'Q') {
        // Create handle
        const handle = new fabric.Circle({
            radius: 5,
            fill: 'white',
            stroke: 'blue',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
            selectable: true,
            evented: true,
            hoverCursor: 'pointer',
        }); // same as before
        canvas.add(handle);

        // const handleLine = createHandleLine(canvas, anchor, handle);
        const handleLine = createHandleLine(canvas, anchor, handle, 50);

        nodeData.handle = handle;
        nodeData.handleLine = handleLine;

        if (newSeg[0] === 'C') {
            const oppHandle = new fabric.Circle({
                radius: 5,
                fill: 'white',
                stroke: 'blue',
                strokeWidth: 2,
                originX: 'center',
                originY: 'center',
                selectable: true,
                evented: true,
                hoverCursor: 'pointer',
            });
            canvas.add(oppHandle);
            const oppLine = createHandleLine(canvas, anchor, oppHandle);
            nodeData.oppositeHandle = oppHandle;
            nodeData.oppositeHandleLine = oppLine;
        }

        setHandlesVisible(nodeData, false); // hidden initially
    }

    // Anchor selection toggles handles
    anchor.on('selected', () => setHandlesVisible(nodeData, true));
    anchor.on('deselected', () => setHandlesVisible(nodeData, false));

    anchor.on('moving', () => updatePathSegmentFromNode(path, newSeg, anchor));
    anchor.on('mousedblclick', () => deleteNodeSmooth(canvas, path, nodes, nodeData));

    nodes.splice(index, 0, nodeData);

    path.dirty = true;
    path.setCoords();
    canvas.requestRenderAll();
}

function deleteNodeSmooth(
    canvas: fabric.Canvas,
    path: fabric.Path,
    nodes: PathNode[],
    nodeData: PathNode,
) {
    const index = nodes.indexOf(nodeData);
    if (index === -1) return;

    path.path!.splice(index, 1);

    canvas.remove(nodeData.node);
    if (nodeData.handle) canvas.remove(nodeData.handle);
    if (nodeData.oppositeHandle) canvas.remove(nodeData.oppositeHandle);
    if (nodeData.handleLine) canvas.remove(nodeData.handleLine);
    if (nodeData.oppositeHandleLine) canvas.remove(nodeData.oppositeHandleLine);

    nodes.splice(index, 1);

    path.dirty = true;
    path.setCoords();
    canvas.requestRenderAll();
}

function setHandlesVisible(nodeData: PathNode, visible: boolean) {
    if (nodeData.handle) nodeData.handle.set({ visible });
    if (nodeData.oppositeHandle) nodeData.oppositeHandle.set({ visible });
    if (nodeData.handleLine) nodeData.handleLine.set({ visible });
    if (nodeData.oppositeHandleLine) nodeData.oppositeHandleLine.set({ visible });
    nodeData.handlesVisible = visible;
}

function createAnchor(
    canvas: fabric.Canvas,
    path: fabric.Path,
    seg: any[],
    index: number,
    x: number,
    y: number,
    nodes: PathNode[],
) {
    const offset = path.pathOffset || { x: 0, y: 0 };

    const anchor = new fabric.Circle({
        radius: 5,
        fill: 'white',
        stroke: 'blue',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        hoverCursor: 'pointer',
    });
    anchor.set({ left: x, top: y });
    canvas.add(anchor);

    const nodeData: PathNode = { type: 'anchor', index, seg, node: anchor };

    // If curve, create handles
    if (seg[0] === 'C' || seg[0] === 'Q') {
        const handle1 = new fabric.Circle({
            radius: 4,
            fill: 'orange',
            originX: 'center',
            originY: 'center',
            selectable: true,
            evented: true,
        });
        canvas.add(handle1);
        const handleLine = createHandleLine(canvas, anchor, handle1, 50);

        nodeData.handle = handle1;
        nodeData.handleLine = handleLine;

        if (seg[0] === 'C') {
            const handle2 = new fabric.Circle({
                radius: 4,
                fill: 'orange',
                originX: 'center',
                originY: 'center',
                selectable: true,
                evented: true,
            });
            canvas.add(handle2);
            const handleLine2 = createHandleLine(canvas, anchor, handle2, 50);
            enableHandleMirroring(nodeData, anchor);

            nodeData.oppositeHandle = handle2;
            nodeData.oppositeHandleLine = handleLine2;
        }

        setHandlesVisible(nodeData, false); // hide initially

        // Toggle visibility on anchor selection
        anchor.on('selected', () => setHandlesVisible(nodeData, true));
        anchor.on('deselected', () => setHandlesVisible(nodeData, false));
    }

    anchor.on('moving', () => updatePathSegmentFromNode(path, seg, anchor));
    anchor.on('mousedblclick', () => deleteNodeSmooth(canvas, path, nodes, nodeData));

    nodes.splice(index, 0, nodeData);

    path.path!.splice(index, 0, seg);

    path.dirty = true;
    path.setCoords();
    canvas.requestRenderAll();

    return nodeData;
}

function enableHandleMirroring(nodeData: PathNode, anchor: fabric.Circle) {
    if (!nodeData.handle || !nodeData.oppositeHandle) return;

    nodeData.mirrorHandles = true;

    const mirrorHandle = (movedHandle: fabric.Circle, oppositeHandle: fabric.Circle) => {
        const ax = anchor.left!;
        const ay = anchor.top!;
        const hx = movedHandle.left!;
        const hy = movedHandle.top!;

        const dx = hx - ax;
        const dy = hy - ay;

        // Mirror opposite handle across anchor
        oppositeHandle.set({
            left: ax - dx,
            top: ay - dy,
        });
        oppositeHandle.setCoords();

        // Update line for opposite handle
        if (nodeData.oppositeHandleLine) {
            nodeData.oppositeHandleLine.set({ x2: oppositeHandle.left, y2: oppositeHandle.top });
        }

        canvas.requestRenderAll();
    };

    nodeData.handle.on('moving', () => mirrorHandle(nodeData.handle!, nodeData.oppositeHandle!));
    nodeData.oppositeHandle.on('moving', () =>
        mirrorHandle(nodeData.oppositeHandle!, nodeData.handle!),
    );
}

/* ============================================================
   Node Editor Slice
============================================================ */
export const createNodeEditorSlice = (set, get, store) => ({
    nodeMode: false,
    activePath: null as fabric.Path | null,
    nodes: [] as PathNode[],

    enterNodeMode: async () => {
        const { canvas } = get();

        const activeObj = canvas.getActiveObject();
        if (!activeObj) return;

        const pathD = await fabricSelectionToPaper(canvas);
        if (!pathD) return;

        const fabricPath = new fabric.Path(pathD.d, {
            left: pathD.center.x,
            top: pathD.center.y,
            fill: (activeObj as any).fill,
            stroke: (activeObj as any).stroke,
            strokeWidth: (activeObj as any).strokeWidth,
            opacity: activeObj.opacity,
            originX: 'center',
            originY: 'center',
            objectCaching: false,
            noScaleCache: true,
            selectable: false,
            evented: false,
        });

        fabricPath.set({
            angle: activeObj.angle,
            scaleX: activeObj.scaleX,
            scaleY: activeObj.scaleY,
        });

        normalizePrimitivePath(fabricPath);

        canvas.add(fabricPath);
        canvas.remove(activeObj);
        fabricPath.setCoords();

        const nodes = addPathNodes(canvas, fabricPath); // create anchors
        const rotationHandle = addRotationHandle(canvas, fabricPath);
        enablePathInsert(canvas, fabricPath, nodes);

        set({ nodeMode: true, activePath: fabricPath, nodes, rotationHandle });

        set({ nodeMode: true, activePath: fabricPath, nodes, rotationHandle });
        canvas.requestRenderAll();
    },

    exitNodeMode: (canvas: fabric.Canvas) => {
        const path = get().activePath;
        if (!path) return;

        // get().nodes.forEach(n => {
        //   canvas.remove(n.node);
        //   if (n.handle) canvas.remove(n.handle);
        //   if (n.oppositeHandle) canvas.remove(n.oppositeHandle);
        // });

        get().nodes.forEach((n) => {
            canvas.remove(n.node);
            if (n.handle) canvas.remove(n.handle);
            if (n.oppositeHandle) canvas.remove(n.oppositeHandle);
            if (n.handleLine) canvas.remove(n.handleLine);
            if (n.oppositeHandleLine) canvas.remove(n.oppositeHandleLine);
        });

        path.selectable = true;
        path.evented = true;
        path.setCoords();

        set({ nodeMode: false, activePath: null, nodes: [] });
        canvas.requestRenderAll();
    },

    addNodeAt: (canvas: fabric.Canvas, x: number, y: number) => {
        const path = get().activePath;
        if (!path) return;
        addNode(canvas, path, x, y);
    },
});
