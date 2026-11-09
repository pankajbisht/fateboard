/**
 * Node toolbar operations (NodeEditor slice actions) on a real Fabric shape in a fake canvas.
 * Rect 100 × 50 at (100, 100), no stroke: nodes TL (100,100), TR (200,100), BR (200,150), BL (100,150).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { createFakeCanvas } from '@/test/fakeCanvas';

/* eslint-disable @typescript-eslint/no-explicit-any */

let canvas: any;
let prev: any;
const state = () => useStore.getState() as any;
const node = () => state().selectedNode;

const pointer = (type: string, x: number, y: number) =>
    canvas.fire(type, { e: { button: 0 }, scenePoint: new fabric.Point(x, y) });
/** Click a node to select it. */
const pick = (x: number, y: number) => {
    pointer('mouse:down', x, y);
    pointer('mouse:up', x, y);
};

const edit = (obj: fabric.FabricObject) => {
    obj.setCoords();
    canvas.add(obj);
    canvas.setActiveObject(obj);
    state().enterNodeMode();
    expect(state().nodeMode).toBe(true);
};
const editRect = () =>
    edit(
        new fabric.Rect({
            left: 100,
            top: 100,
            width: 100,
            height: 50,
            originX: 'left',
            originY: 'top',
            strokeWidth: 0,
        }),
    );
const bounds = () => {
    const b = (state().activePath as fabric.Path).getBoundingRect();
    return [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 100) / 100);
};

beforeEach(() => {
    prev = useStore.getState();
    canvas = createFakeCanvas();
    canvas.setCursor = () => undefined;
    useStore.setState({ canvas } as any);
});

afterEach(() => {
    state().nodeEditor?.cancel();
    useStore.setState({ canvas: prev.canvas } as any);
});

describe('selected node info', () => {
    it('reports position (scene px), path state and what is possible', () => {
        editRect();
        expect(node()).toMatchObject({
            index: 0,
            x: 100,
            y: 100,
            closed: true,
            nodeCount: 4,
            canDelete: true,
            canBreak: true,
        });
    });
});

describe('add / delete', () => {
    it('Add node splits the segment after the selected node in the middle; the shape does not change', () => {
        editRect();
        const before = bounds();
        expect(state().addNodeToPath()).toBe(true);
        expect(node()).toMatchObject({ index: 1, x: 150, y: 100, nodeCount: 5 });
        expect(bounds()).toEqual(before);
    });

    it('a triangle cannot lose a node (a closed path needs 3)', () => {
        edit(
            new fabric.Triangle({
                left: 0,
                top: 0,
                width: 100,
                height: 100,
                originX: 'left',
                originY: 'top',
            }),
        );
        expect(node().canDelete).toBe(false);
        expect(state().deleteSelectedNode()).toBe(false);
    });
});

describe('node type and segments', () => {
    it('Smooth gives the node collinear handles; Corner keeps the handles but frees them', () => {
        editRect();
        state().setSelectedNodeType('smooth');
        expect(node()).toMatchObject({ type: 'smooth', hasHandles: true });
        state().setSelectedNodeType('corner');
        expect(node()).toMatchObject({ type: 'corner', hasHandles: true });
    });

    it('Curved segments add handles without changing the shape; Straight removes them', () => {
        editRect();
        const before = bounds();
        state().setSelectedSegments('curve');
        expect(node().hasHandles).toBe(true);
        expect(bounds()).toEqual(before);
        state().setSelectedSegments('line');
        expect(node().hasHandles).toBe(false);
        expect(bounds()).toEqual(before);
    });
});

describe('open / close / break', () => {
    it('Open path cuts a closed path at the selected node; Close path joins it again', () => {
        editRect();
        const before = bounds();
        expect(state().setPathClosed(false)).toBe(true);
        expect(node()).toMatchObject({ closed: false, nodeCount: 5 });
        expect(bounds()).toEqual(before);

        expect(state().setPathClosed(true)).toBe(true);
        expect(node()).toMatchObject({ closed: true, nodeCount: 4 });
        expect(bounds()).toEqual(before);
    });

    it('Break path splits an open path in two at a middle node', () => {
        edit(new fabric.Path('M 0 0 L 50 0 L 100 0', { strokeWidth: 0 }));
        const [x, y] = [node().x + 50, node().y]; // the middle node
        pick(x, y);
        expect(node().index).toBe(1);

        expect(state().breakPathAtSelectedNode()).toBe(true);
        const subs = (state().activePath.path as any[]).filter((c) => c[0] === 'M');
        expect(subs).toHaveLength(2);
        expect(node()).toMatchObject({ subPathIndex: 1, index: 0, nodeCount: 2 });
    });

    it('an end node of an open path cannot be broken', () => {
        edit(new fabric.Path('M 0 0 L 50 0 L 100 0', { strokeWidth: 0 }));
        expect(node()).toMatchObject({ index: 0, canBreak: false });
        expect(state().breakPathAtSelectedNode()).toBe(false);
    });
});

describe('position', () => {
    it('moveSelectedNode places the node at exact scene coordinates', () => {
        editRect();
        state().moveSelectedNode(120, 80);
        expect(node()).toMatchObject({ x: 120, y: 80 });
        expect(bounds()[1]).toBe(80);
    });
});
