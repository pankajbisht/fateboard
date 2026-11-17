/**
 * Layer compositor on a real Fabric canvas. jsdom has no 2D pixels here, so the contexts are recording fakes:
 * the tests check what draws where (straight onto the canvas or into a layer buffer), the composite calls
 * (opacity, blend, clipping), the stack order, hit testing, the drag cache and SVG export. Real pixels are
 * checked in the browser (e2e/doc-layers.spec.ts).
 */
import * as fabric from 'fabric';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeLayer, type DocLayer } from '../docLayers';
import { installLayerCompositor, type LayerCompositorHost } from '../layerCompositor';

const L = (id: string, patch: Partial<DocLayer> = {}) => makeLayer({ name: id, ...patch }, id);

type Fake = CanvasRenderingContext2D & { log: string[]; label: string };
let made = 0;
/** A recording 2D context on a fake canvas element. */
function fakeCtx(
    label: string,
    el: { width: number; height: number } = { width: 100, height: 100 },
) {
    const log: string[] = [];
    const ctx = {
        label,
        log,
        canvas: el,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        imageSmoothingEnabled: true,
        save() {},
        restore() {},
        setTransform() {},
        clearRect() {},
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        drawImage(src: { label?: string }) {
            log.push(
                `${src.label ?? 'canvas'} a=${this.globalAlpha} ${this.globalCompositeOperation}`,
            );
        },
    };
    Object.assign(el, { getContext: () => ctx });
    return ctx as unknown as Fake;
}
const buffers: Fake[] = [];
const createBuffer = () => {
    const el = { width: 0, height: 0, label: `buf${++made}` };
    buffers.push(fakeCtx(el.label, el));
    return el as unknown as HTMLCanvasElement;
};

let canvas: fabric.Canvas;
let layers: DocLayer[];
let uninstall: () => void;
let drawn: string[];

function setup(list: DocLayer[], extra: Partial<LayerCompositorHost> = {}) {
    canvas = new fabric.Canvas(document.createElement('canvas'), {
        width: 100,
        height: 100,
        renderOnAddRemove: false,
        preserveObjectStacking: true,
    });
    layers = list;
    drawn = [];
    uninstall = installLayerCompositor(canvas, { getLayers: () => layers, createBuffer, ...extra });
}

/** A rect that logs "<name>@<context label>" when it is drawn. */
function obj(name: string, layerId: string, left = 0, top = 0, size = 50) {
    const r = new fabric.Rect({
        left,
        top,
        width: size,
        height: size,
        originX: 'left',
        originY: 'top',
    });
    Object.assign(r, { layerId, name });
    vi.spyOn(r, 'render').mockImplementation((ctx) => {
        drawn.push(`${name}@${(ctx as Fake).label}`);
    });
    return r;
}

const renderTo = (ctx: Fake) =>
    (canvas as unknown as { _renderObjects: (c: unknown, o: unknown) => void })._renderObjects(
        ctx,
        canvas.getObjects(),
    );

afterEach(() => {
    uninstall?.();
    canvas?.dispose();
});

describe('layer compositor', () => {
    it('one plain layer (every old document) uses plain Fabric rendering', () => {
        setup([L('a')]);
        canvas.add(obj('x', 'a'), obj('y', 'a'));
        renderTo(fakeCtx('main'));
        expect(drawn).toEqual(['x@main', 'y@main']);
    });

    it('draws by layer whatever the add order, and re-sorts the stack (hit testing walks it)', () => {
        setup([L('bottom'), L('top')]);
        const red = obj('red', 'top');
        const blue = obj('blue', 'bottom');
        canvas.add(red, blue);
        renderTo(fakeCtx('main'));
        expect(drawn).toEqual(['blue@main', 'red@main']);
        expect(canvas.getObjects()).toEqual([blue, red]);
    });

    it('hidden layers and hidden folders draw nothing; objects with no layer go to the bottom one', () => {
        setup([
            L('a'),
            L('h', { visible: false }),
            L('f', { kind: 'folder', visible: false }),
            L('b', { parentId: 'f' }),
        ]);
        canvas.add(obj('x', 'h'), obj('y', 'b'), obj('z', 'nope'));
        renderTo(fakeCtx('main'));
        expect(drawn).toEqual(['z@main']);
    });

    it('layer opacity / blend: the layer draws into one buffer, composited once', () => {
        setup([L('a', { opacity: 0.5, blend: 'multiply' })]);
        canvas.add(obj('x', 'a'), obj('y', 'a', 30, 30));
        const main = fakeCtx('main');
        renderTo(main);
        expect(drawn.every((d) => d.startsWith('x@buf') || d.startsWith('y@buf'))).toBe(true);
        expect(main.log).toEqual([expect.stringMatching(/^buf\d+ a=0.5 multiply$/)]);
    });

    it('clipping: the clipped layer is masked by the base, then the base composites once', () => {
        setup([L('base'), L('ink', { clip: true, blend: 'screen' })]);
        canvas.add(obj('b', 'base'), obj('i', 'ink'));
        const main = fakeCtx('main');
        renderTo(main);
        expect(drawn.find((d) => d.startsWith('b@'))).toMatch(/^b@buf/);
        expect(drawn.find((d) => d.startsWith('i@'))).toMatch(/^i@buf/);
        const blits = buffers.flatMap((b) => b.log);
        expect(blits.some((l) => l.endsWith('destination-in'))).toBe(true); // ink masked by the base
        expect(blits.some((l) => l.endsWith('screen'))).toBe(true); // then blended onto it
        expect(main.log).toEqual([expect.stringMatching(/^buf\d+ a=1 source-over$/)]);
    });

    it('objects on hidden or locked layers cannot be clicked or kept selected', () => {
        setup([L('a', { locked: true }), L('b')]);
        const locked = obj('locked', 'a', 0, 0, 100);
        const free = obj('free', 'b', 0, 0, 20);
        canvas.add(locked, free);
        locked.setCoords();
        free.setCoords();
        const check = (o: fabric.FabricObject) =>
            (
                canvas as unknown as { _checkTarget: (o: unknown, p: fabric.Point) => boolean }
            )._checkTarget(o, new fabric.Point(10, 10));
        expect(check(locked)).toBe(false);
        expect(check(free)).toBe(true);
        canvas.setActiveObject(new fabric.ActiveSelection([locked, free], { canvas }));
        canvas.fire('selection:created', { selected: [locked, free] } as never);
        expect(canvas.getActiveObject()).toBe(free);
    });

    it('while one layer is dragged, the layers below come from a cache', () => {
        setup([L('back'), L('front')]);
        const many = Array.from({ length: 25 }, (_, i) => obj(`b${i}`, 'back'));
        const moving = obj('moving', 'front');
        canvas.add(...many, moving);
        const main = fakeCtx('main', canvas.getElement());
        (canvas as unknown as { _currentTransform: unknown })._currentTransform = {
            target: moving,
        };
        renderTo(main); // first frame: draws everything, keeps the back layer as a picture
        expect(drawn.filter((d) => d.startsWith('b')).length).toBe(25);
        drawn = [];
        main.log.length = 0;
        renderTo(main);
        expect(drawn).toEqual(['moving@main']); // the back layer was not redrawn
        expect(main.log).toEqual([expect.stringMatching(/^buf\d+ a=1 copy$/)]);
        (canvas as unknown as { _currentTransform: unknown })._currentTransform = null;
        drawn = [];
        renderTo(main);
        expect(drawn.length).toBe(26); // drag over: full redraw
    });

    it('SVG export leaves out hidden layers and wraps layer opacity / blend', () => {
        setup([L('a', { visible: false }), L('b', { opacity: 0.5, blend: 'multiply' })]);
        const hidden = new fabric.Rect({ width: 10, height: 10, fill: '#ff0000' });
        const shown = new fabric.Rect({ width: 10, height: 10, fill: '#00ff00' });
        Object.assign(hidden, { layerId: 'a' });
        Object.assign(shown, { layerId: 'b' });
        canvas.add(hidden, shown);
        const svg = canvas.toSVG();
        expect(svg).not.toContain('rgb(255,0,0)');
        expect(svg).toContain('rgb(0,255,0)');
        expect(svg).toContain('<g opacity="0.5" style="mix-blend-mode: multiply">');
    });

    it('master page underlay: drawn under every layer, plain or layered, and first in SVG', () => {
        const master = obj('master', 'none');
        const shown = new fabric.Rect({ width: 5, height: 5, fill: '#0000ff' });
        for (const list of [[L('a')], [L('a', { opacity: 0.5 })]]) {
            setup(list, { underlay: () => [master] });
            canvas.add(obj('x', 'a'));
            renderTo(fakeCtx('main'));
            expect(drawn[0]).toBe('master@main');
            uninstall();
            canvas.dispose();
        }
        setup([L('a')], { underlay: () => [shown] });
        const svg = canvas.toSVG();
        expect(svg).toContain('rgb(0,0,255)');
    });

    it('page guides overlay: on the board only, never in exports', () => {
        const paint = vi.fn();
        setup([L('a')], { paintOverlay: paint });
        renderTo(fakeCtx('export'));
        expect(paint).not.toHaveBeenCalled();
        renderTo(fakeCtx('main', canvas.getElement()));
        expect(paint).toHaveBeenCalledTimes(1);
    });

    it('uninstall puts plain Fabric back', () => {
        setup([L('a', { visible: false })]);
        canvas.add(obj('x', 'a'));
        uninstall();
        renderTo(fakeCtx('main'));
        expect(drawn).toEqual(['x@main']);
        expect(Object.prototype.hasOwnProperty.call(canvas, '_renderObjects')).toBe(false);
    });
});
