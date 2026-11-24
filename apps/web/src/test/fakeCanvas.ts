/**
 * Minimal stand-in for `fabric.Canvas`, for slice unit tests that need canvas *behaviour*
 * (objects, events, JSON round-trips) but no rendering.
 *
 * Objects can be plain objects or real Fabric objects. `toObject(props)` calls `obj.toObject(props)`
 * when the object has one, so real Fabric objects serialize their custom props like the real canvas.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Handler = (e?: any) => void;

export interface FakeCanvas {
    getObjects: () => any[];
    add: (...objs: any[]) => void;
    remove: (...objs: any[]) => void;
    insertAt: (index: number, ...objs: any[]) => void;
    moveObjectTo: (obj: any, index: number) => void;
    toObject: (props?: string[]) => { version: string; objects: any[]; background?: unknown };
    loadFromJSON: (json: unknown) => Promise<void>;
    discardActiveObject: () => void;
    setActiveObject: (obj: any) => void;
    getActiveObject: () => any;
    getActiveObjects: () => any[];
    requestRenderAll: () => void;
    renderAll: () => void;
    on: (name: string, handler: Handler) => () => void;
    off: (name: string, handler?: Handler) => void;
    fire: (name: string, e?: any) => void;
    getWidth: () => number;
    getHeight: () => number;
    setDimensions: (dims: { width?: number; height?: number }) => void;
    setViewportTransform: (vpt: number[]) => void;
    calcOffset: () => void;
    getZoom: () => number;
    /** Like Fabric: the scene point at the middle of the view. */
    getVpCenter: () => { x: number; y: number };
    zoomToPoint: (point: { x: number; y: number }, zoom: number) => void;
    toDataURL: (opts?: unknown) => string;
    clear: () => void;
    viewportTransform: number[];
    backgroundColor: unknown;
    clipPath?: any;
    /** test helpers */
    listenerCount: (name: string) => number;
    renderCount: () => number;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export function createFakeCanvas(
    initial: any[] = [],
    size = { width: 800, height: 600 },
): FakeCanvas {
    let objects: any[] = [...initial];
    let active: any[] = [];
    let width = size.width;
    let height = size.height;
    let renders = 0;
    const handlers: Record<string, Handler[]> = {};

    const fire = (name: string, e?: any) => [...(handlers[name] ?? [])].forEach((h) => h(e));

    const canvas: FakeCanvas = {
        viewportTransform: [1, 0, 0, 1, 0, 0],
        backgroundColor: '#ffffff',
        getObjects: () => objects,
        add: (...objs) => {
            objects.push(...objs);
            objs.forEach((o) => {
                // plain test objects get a back-reference; real Fabric objects are left alone
                if (o && typeof o === 'object' && typeof o.toObject !== 'function')
                    o.canvas = canvas;
                fire('object:added', { target: o });
            });
        },
        remove: (...objs) => {
            objects = objects.filter((o) => !objs.includes(o));
            active = active.filter((o) => !objs.includes(o));
            objs.forEach((o) => fire('object:removed', { target: o }));
        },
        insertAt: (index, ...objs) => {
            objects.splice(index, 0, ...objs);
            objs.forEach((o) => fire('object:added', { target: o }));
        },
        moveObjectTo: (obj, index) => {
            const from = objects.indexOf(obj);
            if (from === -1) return;
            objects.splice(from, 1);
            objects.splice(Math.max(0, Math.min(index, objects.length)), 0, obj);
        },
        toObject: (props = []) => ({
            version: 'fake',
            background: canvas.backgroundColor,
            objects: objects.map((o) =>
                typeof o?.toObject === 'function' ? o.toObject(props) : clone(o),
            ),
            // like Fabric: the canvas clip path is part of the document
            ...(canvas.clipPath
                ? {
                      clipPath:
                          typeof canvas.clipPath.toObject === 'function'
                              ? canvas.clipPath.toObject(props)
                              : clone(canvas.clipPath),
                  }
                : {}),
        }),
        loadFromJSON: async (json) => {
            const data: any = typeof json === 'string' ? JSON.parse(json) : json;
            objects.forEach((o) => fire('object:removed', { target: o }));
            objects = (data?.objects ?? []).map((o: any) => clone(o));
            active = [];
            // like Fabric (enlivenObjectEnlivables): a document without a clip path removes it
            canvas.clipPath = data?.clipPath ?? undefined;
            objects.forEach((o) => fire('object:added', { target: o }));
        },
        discardActiveObject: () => {
            const had = active.length > 0;
            // like Fabric: a discarded multi-selection hands its objects back in canvas coordinates
            const a = active[0];
            if (a && String(a.type).toLowerCase() === 'activeselection') a.removeAll?.();
            active = [];
            if (had) fire('selection:cleared', {});
        },
        setActiveObject: (obj) => {
            active = obj ? [obj] : [];
        },
        getActiveObject: () => active[0],
        // like Fabric: a multi-selection reports the objects inside it
        getActiveObjects: () => {
            const a = active[0];
            const isSelection =
                a &&
                typeof a.getObjects === 'function' &&
                String(a.type).toLowerCase() === 'activeselection';
            return isSelection ? a.getObjects() : active;
        },
        requestRenderAll: () => {
            renders += 1;
        },
        renderAll: () => {
            renders += 1;
        },
        on: (name, handler) => {
            (handlers[name] ??= []).push(handler);
            return () => canvas.off(name, handler);
        },
        off: (name, handler) => {
            handlers[name] = handler ? (handlers[name] ?? []).filter((h) => h !== handler) : [];
        },
        fire,
        getWidth: () => width,
        getHeight: () => height,
        setDimensions: (dims) => {
            if (dims.width !== undefined) width = dims.width;
            if (dims.height !== undefined) height = dims.height;
        },
        setViewportTransform: (vpt) => {
            canvas.viewportTransform = [...vpt];
        },
        calcOffset: () => undefined,
        getZoom: () => canvas.viewportTransform[0],
        getVpCenter: () => {
            const [zoom, , , , tx, ty] = canvas.viewportTransform;
            return { x: (width / 2 - tx) / zoom, y: (height / 2 - ty) / zoom };
        },
        zoomToPoint: (_point, zoom) => {
            canvas.viewportTransform = [
                zoom,
                0,
                0,
                zoom,
                canvas.viewportTransform[4],
                canvas.viewportTransform[5],
            ];
        },
        toDataURL: () => 'data:image/png;base64,FAKE',
        clear: () => {
            const removed = objects;
            objects = [];
            active = [];
            removed.forEach((o) => fire('object:removed', { target: o }));
        },
        listenerCount: (name) => (handlers[name] ?? []).length,
        renderCount: () => renders,
    };

    initial.forEach((o) => {
        if (o && typeof o === 'object' && typeof o.toObject !== 'function') o.canvas = canvas;
    });

    return canvas;
}
