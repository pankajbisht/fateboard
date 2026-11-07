import type { SliceCreator } from '../types';
import * as fabric from 'fabric';
import { getShapeDef, setCustomShapes, type ShapeDef } from '@hooks/shape/shapeCatalog';
import {
    addConnectorSmart,
    applyConnectorStyle,
    installConnectorBehavior,
    type ConnectorHooks,
    type ConnectorMode,
    type ConnectorStylePatch,
} from '@/lib/utils/shapeConnectors';
import {
    openShapeTextEditor,
    closeShapeTextEditor as closeEditor,
} from '@/lib/utils/shapeTextEditor';
import { installShapeTextFonts } from '@/lib/utils/shapeTextFonts';
import { PAINT_DEFAULTS } from '@/lib/paintToggle';

export interface NormalizedPath {
    d: string;
    w: number;
    h: number;
    open: boolean;
}

export interface ShapeResult {
    ok: boolean;
    error?: string;
    type?: string;
}

export interface ShapeSlice {
    addShape: (shapeType: string, options?: Record<string, any>) => void;
    generateStarPoints: (
        numPoints: number,
        outerRadius: number,
        innerRadius: number,
    ) => { x: number; y: number }[];
    createArrowShape: (obj: Record<string, any>) => fabric.Object;

    /** text shapes */
    fitTextShape: (group: fabric.Object) => void;
    /** idempotent: wires text-shape + connector behaviour onto a canvas */
    installShapeBehavior: (canvas: fabric.Canvas) => void;

    /** connectors */
    activeConnector: any | null;
    addConnector: (mode?: ConnectorMode) => void;
    updateConnectorStyle: (patch: ConnectorStylePatch) => void;

    /** user-made shapes */
    customShapes: ShapeDef[];
    saveSelectionAsShape: (name: string, opts?: { text?: boolean }) => ShapeResult;
    saveCustomPath: (name: string, d: string, opts?: { text?: boolean }) => ShapeResult;
    removeCustomShape: (type: string) => void;
    normalizePathData: (d: string) => NormalizedPath | null;
    /** open / close the in-place text editor of a text shape */
    editShapeText: (group: fabric.Object) => void;
    closeShapeTextEditor: (commit?: boolean) => void;
}

export interface FabricObjectWithMaster extends fabric.Object {
    __master?: fabric.Object; // reference to the parent
    __instances?: fabric.Object[]; // clones linked to this master
}

const TRANSPARENT = 'rgba(0,0,0,0)';
// one source for new-shape paint (also what the dock's Add fill / Add stroke put back)
const DEFAULT_FILL = PAINT_DEFAULTS.shape.fill;
const DEFAULT_STROKE = PAINT_DEFAULTS.shape.stroke;
const DEFAULT_STROKE_WIDTH = PAINT_DEFAULTS.shape.strokeWidth;
const TEXT_FONT = 'Inter, Arial, sans-serif';
const CUSTOM_KEY = 'fateboard.customShapes.v1';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

/* -------------------------------------------------------------------------- */
/* Building shapes                                                            */
/* -------------------------------------------------------------------------- */

/** Scale an object so its (stroke-less) box becomes w x h. */
function fit(obj: fabric.Object, w: number, h: number) {
    obj.set({
        scaleX: w / (obj.width || 1),
        scaleY: h / (obj.height || 1),
    });
    obj.setCoords();
}

/** The plain fabric object for a catalog entry (no text). */
function buildBase(
    def: ShapeDef,
    w: number,
    h: number,
    style: Record<string, any>,
): fabric.Object | null {
    switch (def.kind) {
        case 'rect': {
            const r = def.rx === 'full' ? Math.min(w, h) / 2 : (def.rx ?? 0);
            return new fabric.Rect({ ...style, width: w, height: h, rx: r, ry: r });
        }

        case 'circle':
            return new fabric.Circle({ ...style, radius: w / 2 });

        case 'ellipse':
            return new fabric.Ellipse({ ...style, rx: w / 2, ry: h / 2 });

        case 'triangle':
            return new fabric.Triangle({ ...style, width: w, height: h });

        case 'line':
            return new fabric.Line([-w / 2, 0, w / 2, 0], { ...style, hasBorders: false });

        case 'polygon': {
            // polygons derive their size from the points, so scale afterwards
            const poly = new fabric.Polygon(def.points!, { ...style });
            fit(poly, w, h);
            return poly;
        }

        case 'path': {
            const path = new fabric.Path(def.d!, {
                ...style,
                fillRule: def.evenodd ? 'evenodd' : 'nonzero',
            });
            fit(path, w, h);
            return path;
        }

        default:
            return null;
    }
}

/** Build the fabric object for a catalog entry (wraps it with a textbox when def.text). */
function buildShape(def: ShapeDef, raw: Record<string, any>): fabric.Object | null {
    const { width, height, radius, rx, ry, ...style } = raw;

    // size: explicit width/height > legacy radius / rx / ry > catalog default
    let w: number = width ?? def.w;
    let h: number = height ?? def.h;
    if (width == null && height == null) {
        if (rx && ry) {
            w = rx * 2;
            h = ry * 2;
        } else if (radius || rx) {
            w = (radius ?? rx) * 2;
            h = (def.h / def.w) * w;
        }
    }

    // open shapes (lines, arrows, braces…) have no fill and need a visible stroke
    if (def.open || def.kind === 'line') {
        style.fill = TRANSPARENT;
        style.strokeWidth = Math.max(style.strokeWidth ?? 2, 1);
    }

    if (!def.text) return buildBase(def, w, h, style);

    // ---- shape + editable text (Figma / Canva style) ----
    const {
        left,
        top,
        originX,
        originY,
        hasControls,
        customType,
        objectCaching: _objectCaching, // dropped: text shapes set their own caching
        ...baseStyle
    } = style;

    const base = buildBase(def, w, h, {
        ...baseStyle,
        left: 0,
        top: 0,
        originX: 'center',
        originY: 'center',
    });
    if (!base) return null;

    const inset = def.textInset ?? 0.9;

    const text = new fabric.Textbox('', {
        width: Math.max(w * inset - 8, 24),
        fontSize: 18,
        fontFamily: TEXT_FONT,
        fill: '#111827',
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        left: 0,
        top: 0,
        objectCaching: false,
        splitByGrapheme: true,
    });

    const group: any = new fabric.Group([base, text], {
        left,
        top,
        originX,
        originY,
        hasControls,
        customType,
        objectCaching: false,
    } as Partial<fabric.GroupProps> & { customType?: string });

    Object.assign(group, { isTextShape: true, textInset: inset });
    attachParts(group);
    fitTextShape(group);

    return group;
}

/* -------------------------------------------------------------------------- */
/* Text shapes: parts, fitting, resizing                                      */
/* -------------------------------------------------------------------------- */

function getParts(group: any): { box: any; text: any } {
    const objs: any[] = group?.getObjects?.() ?? [];
    const text = group.__text ?? objs.find((o) => o instanceof fabric.Textbox);
    const box = group.__box ?? objs.find((o) => o !== text && !(o instanceof fabric.Textbox));
    return { box, text };
}

/** (Re)creates the references the canvas slice / dblclick editing relies on. */
function attachParts(group: any) {
    const { box, text } = getParts(group);
    if (!box || !text) return;
    group.__box = box;
    group.__text = text;
    text.__group = group;
}

/** Make the textbox follow the shape width and grow the shape if the text is taller. */
export function fitTextShape(group: any) {
    if (!group?.isTextShape) return;

    const { box, text } = getParts(group);
    if (!box || !text) return;

    const inset = group.textInset ?? 0.9;
    const bw = box.width * (box.scaleX || 1);
    const bh = box.height * (box.scaleY || 1);

    text.set({ width: Math.max(bw * inset - 8, 24) });
    text.initDimensions?.();

    const needed = (text.height * (text.scaleY || 1) + 12) / inset;

    if (needed > bh) {
        if (box instanceof fabric.Rect) box.set({ height: needed });
        else box.set({ scaleY: needed / (box.height || 1) });
    }

    box.setCoords?.();
    group.set('dirty', true);
    group.triggerLayout?.();
    group.setCoords();
    group.canvas?.requestRenderAll();
}

/** While dragging a handle: keep the text un-stretched and re-wrapped. */
function liveScaleTextShape(g: any) {
    if (!g?.isTextShape) return;

    const { box, text } = getParts(g);
    if (!box || !text || !g.getObjects().includes(text)) return;

    const sx = g.scaleX || 1;
    const sy = g.scaleY || 1;
    const inset = g.textInset ?? 0.9;
    const screenW = box.width * (box.scaleX || 1) * sx;

    text.set({
        scaleX: 1 / sx,
        scaleY: 1 / sy,
        width: Math.max(screenW * inset - 8, 24),
    });
    text.initDimensions?.();
    g.set('dirty', true);
}

/** After resizing: push the group scale into the shape so text keeps its size. */
function bakeTextShape(g: any) {
    if (!g?.isTextShape) return;

    const sx = g.scaleX || 1;
    const sy = g.scaleY || 1;
    const { box, text } = getParts(g);
    if (!box || !text) return;

    const textScaled = (text.scaleX || 1) !== 1 || (text.scaleY || 1) !== 1;

    // plain moves / rotations: nothing to do
    if (sx === 1 && sy === 1 && !textScaled) return;

    if (sx !== 1 || sy !== 1) {
        if (box instanceof fabric.Rect) {
            box.set({ width: box.width * sx, height: box.height * sy });
        } else {
            box.set({ scaleX: (box.scaleX || 1) * sx, scaleY: (box.scaleY || 1) * sy });
        }
    }

    text.set({ scaleX: 1, scaleY: 1 });
    g.set({ scaleX: 1, scaleY: 1 });
    fitTextShape(g);
}
/** Groups coming back from JSON (reload, undo) lose their __text/__box references. */
function rehydrateTextShape(g: any) {
    if (g?.isTextShape && !g.__text) attachParts(g);
}

/* -------------------------------------------------------------------------- */
/* Canvas wiring (once per canvas)                                            */
/* -------------------------------------------------------------------------- */

const installed = new WeakSet<object>();

function installBehavior(canvas: any, hooks: ConnectorHooks) {
    if (!canvas || installed.has(canvas)) return;
    installed.add(canvas);

    // lets thin connectors be picked with the mouse
    canvas.targetFindTolerance = Math.max(canvas.targetFindTolerance ?? 0, 6);

    canvas.on('object:added', (e: any) => rehydrateTextShape(e?.target));
    canvas.on('object:scaling', (e: any) => liveScaleTextShape(e?.target));
    canvas.on('object:modified', (e: any) => bakeTextShape(e?.target));

    // objects scaled inside a multi-selection get their transform baked on deselect
    const bakeDeselected = (e: any) => (e?.deselected ?? []).forEach(bakeTextShape);
    canvas.on('selection:cleared', bakeDeselected);
    canvas.on('selection:updated', bakeDeselected);

    installConnectorBehavior(canvas, hooks);
    // fonts only: formatting goes through the app's one text float (FloatingTextToolbar)
    installShapeTextFonts(canvas, { getParts, fit: fitTextShape });
}

/* -------------------------------------------------------------------------- */
/* Custom shapes                                                              */
/* -------------------------------------------------------------------------- */

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);

function loadCustomShapes(): ShapeDef[] {
    try {
        if (typeof window === 'undefined') return [];
        const raw = window.localStorage.getItem(CUSTOM_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list)
            ? list.filter((s) => s && typeof s.type === 'string' && typeof s.d === 'string')
            : [];
    } catch {
        return [];
    }
}

function saveCustomShapes(list: ShapeDef[]) {
    try {
        window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
    } catch {
        /* storage full / blocked: the shapes still work for this session */
    }
}

/** fabric.Path (already simplified to absolute M/L/C/Q/Z) -> path in a 100x100 box. */
function normalizePathObject(p: any): NormalizedPath | null {
    const cmds: any[][] = p?.path;
    if (!Array.isArray(cmds) || cmds.length < 2) return null;

    const pw = p.width || 1;
    const ph = p.height || 1;
    const ox = (p.pathOffset?.x ?? 0) - pw / 2;
    const oy = (p.pathOffset?.y ?? 0) - ph / 2;

    const d = cmds
        .map((c) =>
            c
                .map((v, i) =>
                    i === 0
                        ? v
                        : i % 2 === 1
                          ? round2(((v - ox) / pw) * 100)
                          : round2(((v - oy) / ph) * 100),
                )
                .join(' '),
        )
        .join(' ');

    return {
        d,
        w: Math.max(pw * (p.scaleX || 1), 1),
        h: Math.max(ph * (p.scaleY || 1), 1),
        open: !/z/i.test(d),
    };
}

function normalizePoints(
    points: { x: number; y: number }[],
    closed: boolean,
): NormalizedPath | null {
    if (!points || points.length < 2) return null;

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const w = Math.max(...xs) - minX || 1;
    const h = Math.max(...ys) - minY || 1;

    const d =
        'M ' +
        points
            .map((p) => `${round2(((p.x - minX) / w) * 100)} ${round2(((p.y - minY) / h) * 100)}`)
            .join(' L ') +
        (closed ? ' Z' : '');

    return { d, w, h, open: !closed };
}

function normalizeObject(obj: any): NormalizedPath | null {
    switch (String(obj?.type).toLowerCase()) {
        case 'path':
            return normalizePathObject(obj);
        case 'polygon':
            return normalizePoints(obj.points, true);
        case 'polyline':
            return normalizePoints(obj.points, false);
        case 'rect':
            return { d: 'M 0 0 H 100 V 100 H 0 Z', w: obj.width, h: obj.height, open: false };
        case 'circle':
        case 'ellipse':
            return {
                d: 'M 0 50 A 50 50 0 1 0 100 50 A 50 50 0 1 0 0 50 Z',
                w: obj.getScaledWidth?.() ?? 100,
                h: obj.getScaledHeight?.() ?? 100,
                open: false,
            };
        case 'triangle':
            return { d: 'M 50 0 L 100 100 L 0 100 Z', w: obj.width, h: obj.height, open: false };
        default:
            return null;
    }
}

function makeCustomDef(
    name: string,
    n: NormalizedPath,
    opts: { text?: boolean; fill?: string } = {},
): ShapeDef {
    // keep the object's proportions, but give the library a sensible default size
    const k = 120 / Math.max(n.w, n.h, 1);

    return {
        type: `custom-${uid()}`,
        label: name.trim() || 'Custom shape',
        category: 'custom',
        kind: 'path',
        w: clamp(Math.round(n.w * k), 24, 360),
        h: clamp(Math.round(n.h * k), 24, 360),
        d: n.d,
        open: n.open,
        text: !!opts.text,
        textInset: 0.8,
        fill: opts.fill,
        keywords: name,
        custom: true,
    };
}

/* -------------------------------------------------------------------------- */
/* Slice                                                                      */
/* -------------------------------------------------------------------------- */

export const createShapeSlice: SliceCreator<ShapeSlice> = (set, get) => {
    const api = () => get() as any;

    const hooks: ConnectorHooks = {
        onActive: (connector) => set({ activeConnector: connector } as any),
        onCommit: () => {
            api().persist?.();
            api().saveState?.();
        },
    };

    const initialCustom = loadCustomShapes();
    setCustomShapes(initialCustom);

    const commitCustom = (list: ShapeDef[]) => {
        setCustomShapes(list);
        saveCustomShapes(list);
        set({ customShapes: list } as any);
    };

    return {
        activeConnector: null,
        customShapes: initialCustom,

        installShapeBehavior: (canvas) => installBehavior(canvas, hooks),

        fitTextShape: (group) => fitTextShape(group),

        addShape: (shapeType, options = {}) => {
            const canvas = get().canvas;
            if (!canvas) return;

            const def = getShapeDef(shapeType);
            if (!def) {
                console.warn('Shape not supported:', shapeType);
                return;
            }

            installBehavior(canvas, hooks);

            const center = canvas.getVpCenter();

            // drop undefined values so they cannot overwrite the defaults below
            const clean = Object.fromEntries(
                Object.entries(options).filter(([, v]) => v !== undefined),
            );

            const merged = {
                left: center.x,
                top: center.y,
                originX: 'center',
                originY: 'center',
                hasControls: true,
                customType: 'shape',
                // new shapes: white background + black border (not the store's colours)
                fill: def.fill ?? DEFAULT_FILL,
                stroke: DEFAULT_STROKE,
                strokeWidth: DEFAULT_STROKE_WIDTH,
                strokeUniform: true, // stroke keeps its width when the shape is resized
                strokeLineJoin: 'round',
                strokeLineCap: 'round',
                objectCaching: false,
                ...clean,
            };

            const shape = buildShape(def, merged);
            if (!shape) return;

            Object.assign(shape, { shapeId: uid(), __instances: [] });

            canvas.add(shape);
            canvas.setActiveObject(shape);
            canvas.requestRenderAll();

            get().setToolbar({ target: shape });
            get().updateFromFabric(shape);
            get().saveState?.();
            get().addLayer(shape, def.type);
        },

        /* ------------------------------ connectors ------------------------------ */

        addConnector: (mode = 'simple') => {
            const canvas = get().canvas;
            if (!canvas) return;

            installBehavior(canvas, hooks);

            const conn = addConnectorSmart(canvas, mode);

            api().addLayer?.(conn, 'connector');
            hooks.onCommit?.();
        },

        updateConnectorStyle: (patch) => {
            const conn = api().activeConnector;
            if (conn) applyConnectorStyle(conn, patch);
        },

        /* ----------------------------- custom shapes ---------------------------- */

        normalizePathData: (d) => {
            try {
                if (!d.trim()) return null;
                const n = normalizePathObject(new fabric.Path(d.trim()));
                return n && n.d.length > 4 ? n : null;
            } catch {
                return null;
            }
        },

        saveCustomPath: (name, d, opts = {}) => {
            const n = api().normalizePathData(d) as NormalizedPath | null;
            if (!n) return { ok: false, error: 'That does not look like valid SVG path data.' };

            const def = makeCustomDef(name, n, opts);
            commitCustom([...api().customShapes, def]);
            return { ok: true, type: def.type };
        },

        saveSelectionAsShape: (name, opts = {}) => {
            const canvas = get().canvas;
            const obj: any = canvas?.getActiveObject();

            if (!obj) return { ok: false, error: 'Select a shape on the canvas first.' };

            const n = normalizeObject(obj);
            if (!n) {
                return {
                    ok: false,
                    error: 'Select a single path, polygon or basic shape (groups are not supported).',
                };
            }

            if (obj.getScaledWidth && obj.getScaledHeight) {
                n.w = obj.getScaledWidth();
                n.h = obj.getScaledHeight();
            }

            const fill =
                typeof obj.fill === 'string' && obj.fill && obj.fill !== TRANSPARENT
                    ? obj.fill
                    : undefined;

            const def = makeCustomDef(name, n, { text: opts.text, fill });
            commitCustom([...api().customShapes, def]);
            return { ok: true, type: def.type };
        },

        removeCustomShape: (type) => {
            commitCustom((api().customShapes as ShapeDef[]).filter((s) => s.type !== type));
        },

        /* ------------------------------- legacy API ------------------------------ */

        // kept for backwards compatibility with other code
        generateStarPoints: (numPoints = 5, outerRadius = 50, innerRadius = 20) => {
            const points: { x: number; y: number }[] = [];
            const angle = Math.PI / numPoints;

            for (let i = 0; i < 2 * numPoints; i++) {
                const r = i % 2 === 0 ? outerRadius : innerRadius;
                const a = i * angle - Math.PI / 2; // start from the top
                points.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
            }

            return points;
        },

        editShapeText: (group: any) => {
            const canvas = get().canvas;
            if (!canvas || !group?.isTextShape) return;

            set({ isEditingText: true } as any);

            openShapeTextEditor(canvas, group, {
                getText: (g) => getParts(g).text,
                fit: fitTextShape,
                onEnd: (changed, reselect) => {
                    set({ isEditingText: false } as any);

                    if (changed) hooks.onCommit?.(); // persist + one undo step

                    if (reselect) {
                        canvas.setActiveObject(group);
                        canvas.requestRenderAll();
                    }
                },
            });
        },

        closeShapeTextEditor: (commit = true) => closeEditor(commit),

        // kept for backwards compatibility: now a single stroked path (line + open head)
        createArrowShape: ({
            width = 120,
            stroke = 'black',
            strokeWidth = 2,
            headLength = 14,
            headWidth = 14,
            left = 0,
            top = 0,
        }) =>
            new fabric.Path(
                `M 0 0 H ${width} M ${width - headLength} ${-headWidth / 2} L ${width} 0 L ${width - headLength} ${headWidth / 2}`,
                {
                    stroke,
                    strokeWidth,
                    fill: TRANSPARENT,
                    strokeLineCap: 'round',
                    strokeLineJoin: 'round',
                    strokeUniform: true,
                    left,
                    top,
                    originX: 'center',
                    originY: 'center',
                },
            ),
    };
};
