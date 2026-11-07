/**
 * Connectors for the shape library.
 *
 * A connector is ONE fabric.Path whose `d` is rebuilt from `connectorData`:
 *   - 'simple' : straight line, drag the middle handle to bend it (quadratic curve)
 *   - 'elbow'  : orthogonal, port-aware routing with rounded corners
 *   - 'smooth' : cubic bezier leaving/entering the ports along their normals
 *
 * Ends can be attached to a shape port (top/right/bottom/left). Attached ends follow
 * the shape when it moves / scales / rotates.
 *
 * Everything is installed once per canvas by installConnectorBehavior(). Handles are
 * helper circles flagged `excludeFromExport`, so they are never saved.
 */
import { BRAND } from '@/lib/theme';
import * as fabric from 'fabric';

export type ConnectorMode = 'simple' | 'elbow' | 'smooth';
export type ArrowMode = 'none' | 'end' | 'both';
export type PortName = 'top' | 'right' | 'bottom' | 'left';

interface Pt {
    x: number;
    y: number;
}

interface Attach {
    id: string;
    port: PortName;
}

export interface ConnectorData {
    mode: ConnectorMode;
    start: Pt;
    end: Pt;
    from: Attach | null;
    to: Attach | null;
    /** simple mode: offset of the curve's midpoint from the straight midpoint */
    bend: Pt | null;
    arrow: ArrowMode;
}

export interface ConnectorStylePatch {
    mode?: ConnectorMode;
    arrow?: ArrowMode;
    dashed?: boolean;
    stroke?: string;
    strokeWidth?: number;
}

export interface ConnectorHooks {
    /** the selected connector changed (null = none) */
    onActive?: (connector: any | null) => void;
    /** something changed that should be saved (persist + undo state) */
    onCommit?: () => void;
}

const TRANSPARENT = 'rgba(0,0,0,0)';
const PORTS: PortName[] = ['top', 'right', 'bottom', 'left'];
const LOCAL: Record<PortName, [number, number]> = {
    top: [0, -0.5],
    right: [0.5, 0],
    bottom: [0, 0.5],
    left: [-0.5, 0],
};
const DIR: Record<PortName, [number, number]> = {
    top: [0, -1],
    right: [1, 0],
    bottom: [0, 1],
    left: [-1, 0],
};

const ELBOW_OFFSET = 24;
const ELBOW_RADIUS = 10;
const SNAP_PX = 36; // screen px: snap to a port
const HINT_PX = 140; // screen px: show port dots

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

/* ------------------------------ vector helpers ----------------------------- */

const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
const len = (a: Pt) => Math.hypot(a.x, a.y);
const norm = (a: Pt): Pt => {
    const l = len(a);
    return l < 1e-6 ? { x: 1, y: 0 } : { x: a.x / l, y: a.y / l };
};
const dot = (a: Pt, b: Pt) => a.x * b.x + a.y * b.y;
const n2 = (v: number) => +v.toFixed(2);
const fmt = (p: Pt) => `${n2(p.x)} ${n2(p.y)}`;

export const isConnector = (o: any) => o?.customType === 'connector';
const isHandle = (o: any) => o?.customType === 'connector-handle';

const connectable = (o: any) =>
    !!o &&
    o.visible !== false &&
    !o.excludeFromExport &&
    !isConnector(o) &&
    !isHandle(o) &&
    String(o.type).toLowerCase() !== 'activeselection';

const ensureId = (o: any): string => {
    if (!o.shapeId) o.shapeId = uid();
    return o.shapeId;
};

/* --------------------------------- ports ----------------------------------- */

/** Port position (scene coords) + outward axis direction, honouring rotate/scale/groups. */
function getPort(obj: any, port: PortName): { pt: Pt; dir: Pt } {
    const m = obj.calcTransformMatrix();
    const [lx, ly] = LOCAL[port];
    const p = fabric.util.transformPoint(new fabric.Point(lx * obj.width, ly * obj.height), m);
    const d = fabric.util.transformPoint(new fabric.Point(DIR[port][0], DIR[port][1]), m, true);
    const dir: Pt =
        Math.abs(d.x) > Math.abs(d.y)
            ? { x: Math.sign(d.x), y: 0 }
            : { x: 0, y: Math.sign(d.y) || 1 };
    return { pt: { x: p.x, y: p.y }, dir };
}

function resolveEnd(canvas: any, fallback: Pt, attach: Attach | null) {
    if (attach) {
        const o = canvas.getObjects().find((x: any) => x.shapeId === attach.id);
        if (o) {
            const p = getPort(o, attach.port);
            return { pt: p.pt, dir: p.dir as Pt | null, attach };
        }
    }
    return { pt: fallback, dir: null as Pt | null, attach: null as Attach | null };
}

/* -------------------------------- geometry --------------------------------- */

interface Geo {
    d: string;
    startDir: Pt; // pointing away from the path, out of the start
    endDir: Pt; // direction of travel into the end
}

function simpleGeo(s: Pt, e: Pt, bend: Pt | null): Geo {
    if (!bend) {
        return {
            d: `M ${fmt(s)} L ${fmt(e)}`,
            startDir: norm(sub(s, e)),
            endDir: norm(sub(e, s)),
        };
    }
    const mid = { x: (s.x + e.x) / 2 + bend.x, y: (s.y + e.y) / 2 + bend.y };
    // control point so the curve passes through `mid` at t = 0.5
    const c = { x: 2 * mid.x - (s.x + e.x) / 2, y: 2 * mid.y - (s.y + e.y) / 2 };
    return {
        d: `M ${fmt(s)} Q ${fmt(c)} ${fmt(e)}`,
        startDir: norm(sub(s, c)),
        endDir: norm(sub(e, c)),
    };
}

function smoothGeo(s: Pt, sd: Pt, e: Pt, ed: Pt): Geo {
    const k = Math.max(40, len(sub(e, s)) * 0.4);
    const c1 = add(s, mul(sd, k));
    const c2 = add(e, mul(ed, k));
    return {
        d: `M ${fmt(s)} C ${fmt(c1)} ${fmt(c2)} ${fmt(e)}`,
        startDir: norm(sub(s, c1)),
        endDir: norm(sub(e, c2)),
    };
}

function elbowPoints(s: Pt, sd: Pt, e: Pt, ed: Pt, hasS: boolean, hasE: boolean): Pt[] {
    const a = hasS ? add(s, mul(sd, ELBOW_OFFSET)) : s;
    const b = hasE ? add(e, mul(ed, ELBOW_OFFSET)) : e;
    const pts: Pt[] = [s];
    if (hasS) pts.push(a);

    const aH = sd.x !== 0;
    const bH = ed.x !== 0;

    if (aH && bH) {
        const facing = sd.x === -ed.x;
        if (facing && (b.x - a.x) * sd.x >= 0) {
            const mx = (a.x + b.x) / 2;
            pts.push({ x: mx, y: a.y }, { x: mx, y: b.y });
        } else if (!facing) {
            const mx = sd.x > 0 ? Math.max(a.x, b.x) : Math.min(a.x, b.x);
            pts.push({ x: mx, y: a.y }, { x: mx, y: b.y });
        } else {
            const my = (a.y + b.y) / 2;
            pts.push({ x: a.x, y: my }, { x: b.x, y: my });
        }
    } else if (!aH && !bH) {
        const facing = sd.y === -ed.y;
        if (facing && (b.y - a.y) * sd.y >= 0) {
            const my = (a.y + b.y) / 2;
            pts.push({ x: a.x, y: my }, { x: b.x, y: my });
        } else if (!facing) {
            const my = sd.y > 0 ? Math.max(a.y, b.y) : Math.min(a.y, b.y);
            pts.push({ x: a.x, y: my }, { x: b.x, y: my });
        } else {
            const mx = (a.x + b.x) / 2;
            pts.push({ x: mx, y: a.y }, { x: mx, y: b.y });
        }
    } else if (aH && !bH) {
        pts.push((b.x - a.x) * sd.x >= 0 ? { x: b.x, y: a.y } : { x: a.x, y: b.y });
    } else {
        pts.push((b.y - a.y) * sd.y >= 0 ? { x: a.x, y: b.y } : { x: b.x, y: a.y });
    }

    if (hasE) pts.push(b);
    pts.push(e);

    // drop duplicate + collinear points
    const out: Pt[] = [];
    for (const p of pts) {
        const last = out[out.length - 1];
        if (last && Math.abs(last.x - p.x) < 0.01 && Math.abs(last.y - p.y) < 0.01) continue;
        out.push(p);
    }
    for (let i = out.length - 2; i > 0; i--) {
        const p = out[i - 1];
        const c = out[i];
        const nx = out[i + 1];
        const sameX = Math.abs(p.x - c.x) < 0.01 && Math.abs(c.x - nx.x) < 0.01;
        const sameY = Math.abs(p.y - c.y) < 0.01 && Math.abs(c.y - nx.y) < 0.01;
        if (sameX || sameY) out.splice(i, 1);
    }
    return out;
}

function elbowGeo(s: Pt, sd: Pt, e: Pt, ed: Pt, hasS: boolean, hasE: boolean): Geo {
    const pts = elbowPoints(s, sd, e, ed, hasS, hasE);
    let d = `M ${fmt(pts[0])}`;
    for (let i = 1; i < pts.length - 1; i++) {
        const prev = pts[i - 1];
        const cur = pts[i];
        const next = pts[i + 1];
        const r = Math.min(ELBOW_RADIUS, len(sub(prev, cur)) / 2, len(sub(next, cur)) / 2);
        const p1 = add(cur, mul(norm(sub(prev, cur)), r));
        const p2 = add(cur, mul(norm(sub(next, cur)), r));
        d += ` L ${fmt(p1)} Q ${fmt(cur)} ${fmt(p2)}`;
    }
    const last = pts[pts.length - 1];
    d += ` L ${fmt(last)}`;
    const second = pts[pts.length - 2] ?? pts[0];
    return {
        d,
        startDir: norm(sub(pts[0], pts[1] ?? last)),
        endDir: norm(sub(last, second)),
    };
}

function head(tip: Pt, dir: Pt, size: number): string {
    const a = 0.5;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const bx = -dir.x;
    const by = -dir.y;
    const p1 = { x: tip.x + (bx * cos - by * sin) * size, y: tip.y + (bx * sin + by * cos) * size };
    const p2 = {
        x: tip.x + (bx * cos + by * sin) * size,
        y: tip.y + (-bx * sin + by * cos) * size,
    };
    return ` M ${fmt(p1)} L ${fmt(tip)} L ${fmt(p2)}`;
}

/** Re-resolves attached ends (writes them back into data) and returns the path string. */
function buildPathString(canvas: any, data: ConnectorData, strokeWidth: number): string {
    const S = resolveEnd(canvas, data.start, data.from);
    const E = resolveEnd(canvas, data.end, data.to);

    data.start = S.pt;
    data.end = E.pt;
    if (!S.attach) data.from = null;
    if (!E.attach) data.to = null;

    const delta = sub(E.pt, S.pt);
    const horiz = Math.abs(delta.x) >= Math.abs(delta.y);
    const inferred: Pt = horiz
        ? { x: Math.sign(delta.x) || 1, y: 0 }
        : { x: 0, y: Math.sign(delta.y) || 1 };
    const sd = S.dir ?? inferred;
    const ed = E.dir ?? { x: -inferred.x, y: -inferred.y };

    let geo: Geo;
    if (data.mode === 'elbow') geo = elbowGeo(S.pt, sd, E.pt, ed, !!S.dir, !!E.dir);
    else if (data.mode === 'smooth') geo = smoothGeo(S.pt, sd, E.pt, ed);
    else geo = simpleGeo(S.pt, E.pt, data.bend);

    const size = Math.max(10, strokeWidth * 4);
    let d = geo.d;
    if (data.arrow !== 'none') d += head(E.pt, geo.endDir, size);
    if (data.arrow === 'both') d += head(S.pt, geo.startDir, size);
    return d;
}

/* ---------------------------------- state ---------------------------------- */

interface Hint {
    pt: Pt;
    on: boolean;
    ref?: any;
}

interface State {
    installed: boolean;
    hooks: ConnectorHooks;
    active: any | null;
    handles: any[];
    hints: Hint[];
    hover: any | null;
    busy: boolean;
    moved: boolean;
}

const states = new WeakMap<object, State>();

function stateOf(canvas: any): State {
    let s = states.get(canvas);
    if (!s) {
        s = {
            installed: false,
            hooks: {},
            active: null,
            handles: [],
            hints: [],
            hover: null,
            busy: false,
            moved: false,
        };
        states.set(canvas, s);
    }
    return s;
}

/* -------------------------------- connector -------------------------------- */

export function applyConnectorDefaults(conn: any) {
    Object.assign(conn, {
        fill: TRANSPARENT,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        perPixelTargetFind: true,
        objectCaching: false,
        strokeUniform: true,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        hoverCursor: 'pointer',
        customType: 'connector',
    });
}

export function updateConnector(conn: any, skipHandle?: any) {
    const canvas = conn?.canvas;
    const data: ConnectorData | undefined = conn?.connectorData;
    if (!canvas || !data) return;

    const d = buildPathString(canvas, data, conn.strokeWidth || 2);

    // _setPath rebuilds width/height/pathOffset and re-centres the object, so the
    // absolute coordinates used in `d` stay where they are.
    conn._setPath(d, true);
    conn.setCoords();
    conn.dirty = true;

    syncHandles(canvas, conn, skipHandle);
    canvas.requestRenderAll();
}

export function createConnector(
    canvas: any,
    opts: {
        mode: ConnectorMode;
        start: Pt;
        end: Pt;
        from?: Attach | null;
        to?: Attach | null;
    },
) {
    const data: ConnectorData = {
        mode: opts.mode,
        start: opts.start,
        end: opts.end,
        from: opts.from ?? null,
        to: opts.to ?? null,
        bend: null,
        arrow: 'end',
    };

    const conn: any = new fabric.Path('M 0 0 L 1 1', {
        stroke: '#111827',
        strokeWidth: 2,
        fill: TRANSPARENT,
    });

    Object.assign(conn, { shapeId: uid(), connectorData: data });
    applyConnectorDefaults(conn);

    canvas.add(conn);
    updateConnector(conn);
    canvas.setActiveObject(conn);
    canvas.requestRenderAll();

    return conn;
}

function bestPortPair(a: any, b: any): { from: Attach; to: Attach } {
    const pa = PORTS.map((name) => ({ name, ...getPort(a, name) }));
    const pb = PORTS.map((name) => ({ name, ...getPort(b, name) }));
    let best = { cost: Infinity, i: 0, j: 0 };

    pa.forEach((x, i) =>
        pb.forEach((y, j) => {
            const v = sub(y.pt, x.pt);
            let cost = len(v);
            if (dot(x.dir, v) < 0) cost += 1000; // port faces away from the other shape
            if (dot(y.dir, mul(v, -1)) < 0) cost += 1000;
            if (cost < best.cost) best = { cost, i, j };
        }),
    );

    return {
        from: { id: ensureId(a), port: pa[best.i].name },
        to: { id: ensureId(b), port: pb[best.j].name },
    };
}

/**
 * Add a connector.
 *  - 2+ shapes selected  -> connects the first two with the best ports
 *  - 1 shape selected    -> starts attached to its right port
 *  - nothing selected    -> free connector in the middle of the viewport
 */
export function addConnectorSmart(canvas: any, mode: ConnectorMode) {
    const targets = canvas.getActiveObjects().filter(connectable);

    if (targets.length >= 2) {
        const { from, to } = bestPortPair(targets[0], targets[1]);
        const s = getPort(targets[0], from.port).pt;
        const e = getPort(targets[1], to.port).pt;
        return createConnector(canvas, { mode, start: s, end: e, from, to });
    }

    if (targets.length === 1) {
        const o = targets[0];
        const s = getPort(o, 'right').pt;
        return createConnector(canvas, {
            mode,
            start: s,
            end: { x: s.x + 160, y: s.y },
            from: { id: ensureId(o), port: 'right' },
        });
    }

    const c = canvas.getVpCenter();
    return createConnector(canvas, {
        mode,
        start: { x: c.x - 80, y: c.y },
        end: { x: c.x + 80, y: c.y },
    });
}

export function applyConnectorStyle(conn: any, patch: ConnectorStylePatch) {
    const canvas = conn?.canvas;
    const data: ConnectorData | undefined = conn?.connectorData;
    if (!canvas || !data) return;

    let reshow = false;

    if (patch.mode && patch.mode !== data.mode) {
        data.mode = patch.mode;
        if (patch.mode !== 'simple') data.bend = null;
        reshow = true;
    }
    if (patch.arrow) data.arrow = patch.arrow;
    if (patch.dashed !== undefined) conn.set('strokeDashArray', patch.dashed ? [8, 6] : null);
    if (patch.stroke) conn.set('stroke', patch.stroke);
    if (patch.strokeWidth) conn.set('strokeWidth', patch.strokeWidth);

    updateConnector(conn);
    if (reshow) showHandles(canvas, conn);

    stateOf(canvas).hooks.onCommit?.();
}

/* --------------------------------- handles --------------------------------- */

function handlePoint(data: ConnectorData, role: string): Pt {
    if (role === 'start') return data.start;
    if (role === 'end') return data.end;
    const mid = { x: (data.start.x + data.end.x) / 2, y: (data.start.y + data.end.y) / 2 };
    return data.bend ? add(mid, data.bend) : mid;
}

function placeHandle(h: any, p: Pt) {
    h.setPositionByOrigin(new fabric.Point(p.x, p.y), 'center', 'center');
    h.setCoords();
}

function clearHandles(canvas: any) {
    const st = stateOf(canvas);
    const list = st.handles;
    st.handles = [];
    st.busy = true;
    try {
        list.forEach((h) => canvas.remove(h));
    } finally {
        st.busy = false;
    }
}

function showHandles(canvas: any, conn: any) {
    clearHandles(canvas);
    const st = stateOf(canvas);
    const data: ConnectorData = conn.connectorData;
    const roles = data.mode === 'simple' ? ['start', 'end', 'bend'] : ['start', 'end'];

    roles.forEach((role) => {
        const h: any = new fabric.Circle({
            radius: role === 'bend' ? 5 : 7,
            fill: role === 'bend' ? BRAND.primary : '#ffffff',
            stroke: BRAND.primary,
            strokeWidth: 2,
            strokeUniform: true,
            originX: 'center',
            originY: 'center',
            hasControls: false,
            hasBorders: false,
            selectable: true,
            evented: true,
            objectCaching: false,
            excludeFromExport: true,
            hoverCursor: 'move',
            moveCursor: 'move',
        });

        Object.assign(h, { customType: 'connector-handle', __conn: conn, __role: role });
        placeHandle(h, handlePoint(data, role));
        canvas.add(h);
        st.handles.push(h);
    });

    st.handles.forEach((h) => canvas.bringObjectToFront(h));
}

function syncHandles(canvas: any, conn: any, skip?: any) {
    const st = stateOf(canvas);
    if (st.active !== conn) return;
    st.handles.forEach((h) => {
        if (h === skip) return;
        placeHandle(h, handlePoint(conn.connectorData, h.__role));
    });
}

function activate(canvas: any, conn: any) {
    const st = stateOf(canvas);
    if (st.active === conn) return;
    st.active = conn;
    showHandles(canvas, conn);
    st.hooks.onActive?.(conn);
}

function deactivate(canvas: any) {
    const st = stateOf(canvas);
    if (!st.active && !st.handles.length) return;
    st.active = null;
    st.hints = [];
    clearHandles(canvas);
    st.hooks.onActive?.(null);
    canvas.requestRenderAll();
}

/* ---------------------------------- snapping -------------------------------- */

function findSnap(canvas: any, p: Pt): { pt: Pt; attach: Attach } | null {
    const st = stateOf(canvas);
    const z = canvas.getZoom() || 1;
    const R = SNAP_PX / z;
    const H = HINT_PX / z;
    const point = new fabric.Point(p.x, p.y);

    let best: { o: any; port: any; dist: number } | null = null;
    const hints: Hint[] = [];

    for (const o of canvas.getObjects()) {
        if (!connectable(o)) continue;

        const ports = PORTS.map((name) => ({ name, ...getPort(o, name) }));
        let nearest = ports[0];
        let nd = Infinity;
        for (const pr of ports) {
            const d = len(sub(pr.pt, p));
            if (d < nd) {
                nd = d;
                nearest = pr;
            }
        }

        const inside = typeof o.containsPoint === 'function' && o.containsPoint(point);
        if (nd <= H || inside) ports.forEach((pr) => hints.push({ pt: pr.pt, on: false, ref: pr }));
        if ((inside || nd <= R) && (!best || nd < best.dist)) best = { o, port: nearest, dist: nd };
    }

    hints.forEach((h) => (h.on = !!best && h.ref === best.port));
    st.hints = hints;

    return best
        ? { pt: best.port.pt, attach: { id: ensureId(best.o), port: best.port.name } }
        : null;
}

function onHandleMoving(canvas: any, h: any) {
    const conn = h.__conn;
    const data: ConnectorData | undefined = conn?.connectorData;
    if (!data) return;

    const c = h.getCenterPoint();
    const p = { x: c.x, y: c.y };
    const st = stateOf(canvas);
    st.moved = true;

    if (h.__role === 'bend') {
        data.bend = {
            x: p.x - (data.start.x + data.end.x) / 2,
            y: p.y - (data.start.y + data.end.y) / 2,
        };
        st.hints = [];
    } else {
        const snap = findSnap(canvas, p);
        const key = h.__role === 'start' ? 'from' : 'to';
        if (snap) {
            data[key] = snap.attach;
            data[h.__role as 'start' | 'end'] = snap.pt;
            placeHandle(h, snap.pt);
        } else {
            data[key] = null;
            data[h.__role as 'start' | 'end'] = p;
        }
    }

    updateConnector(conn, h);
}

/* --------------------------------- install --------------------------------- */

function connectorsOf(canvas: any): any[] {
    return canvas.getObjects().filter(isConnector);
}

function refreshFor(canvas: any, target: any) {
    if (!target) return;
    const objs: any[] =
        String(target.type).toLowerCase() === 'activeselection' ? target.getObjects() : [target];
    const ids = objs.map((o) => o.shapeId).filter(Boolean);
    if (!ids.length) return;

    connectorsOf(canvas).forEach((c) => {
        const d: ConnectorData = c.connectorData;
        if (!d) return;
        if ((d.from && ids.includes(d.from.id)) || (d.to && ids.includes(d.to.id))) {
            updateConnector(c);
        }
    });
}

export function installConnectorBehavior(canvas: any, hooks: ConnectorHooks) {
    const st = stateOf(canvas);
    if (st.installed) return;
    st.installed = true;
    st.hooks = hooks;

    const hoverable = (o: any) =>
        !!o && !isHandle(o) && (o.customType === 'shape' || o.isTextShape || isConnector(o));

    // connectors that come back from JSON (load / undo) lose their runtime flags
    canvas.on('object:added', (e: any) => {
        const t = e?.target;
        if (isConnector(t)) applyConnectorDefaults(t);
    });

    const syncSelection = () => {
        const a = canvas.getActiveObject();
        if (isConnector(a)) activate(canvas, a);
        else if (!isHandle(a)) deactivate(canvas);
    };
    canvas.on('selection:created', syncSelection);
    canvas.on('selection:updated', syncSelection);
    canvas.on('selection:cleared', syncSelection);

    const onTransform = (e: any) => {
        const t = e?.target;
        if (isHandle(t)) {
            onHandleMoving(canvas, t);
            return;
        }
        refreshFor(canvas, t);
    };
    canvas.on('object:moving', onTransform);
    canvas.on('object:scaling', onTransform);
    canvas.on('object:rotating', onTransform);
    canvas.on('object:modified', (e: any) => {
        if (!isHandle(e?.target)) refreshFor(canvas, e?.target);
    });

    canvas.on('mouse:up', () => {
        if (!st.moved && !st.hints.length) return;
        const wasMoved = st.moved;
        st.moved = false;
        st.hints = [];
        canvas.requestRenderAll();
        if (wasMoved) st.hooks.onCommit?.();
    });

    // double-click the bend handle to straighten the connector again
    canvas.on('mouse:dblclick', (e: any) => {
        const t = e?.target;
        if (isHandle(t) && t.__role === 'bend' && t.__conn?.connectorData) {
            t.__conn.connectorData.bend = null;
            updateConnector(t.__conn);
            st.hooks.onCommit?.();
        }
    });

    canvas.on('object:removed', (e: any) => {
        const t = e?.target;
        if (!t) return;

        if (isHandle(t)) {
            // Delete pressed while a handle is selected -> remove the connector itself
            if (!st.busy && t.__conn && canvas.getObjects().includes(t.__conn))
                canvas.remove(t.__conn);
            return;
        }
        if (isConnector(t)) {
            if (st.active === t) deactivate(canvas);
            return;
        }
        if (t.shapeId) {
            connectorsOf(canvas).forEach((c) => {
                const d: ConnectorData = c.connectorData;
                if (d?.from?.id === t.shapeId) d.from = null;
                if (d?.to?.id === t.shapeId) d.to = null;
            });
        }
    });

    // hover outline
    canvas.on('mouse:over', (e: any) => {
        const t = e?.target;
        if (hoverable(t) && t !== canvas.getActiveObject()) {
            st.hover = t;
            canvas.requestRenderAll();
        }
    });
    canvas.on('mouse:out', () => {
        if (st.hover) {
            st.hover = null;
            canvas.requestRenderAll();
        }
    });

    // port dots while dragging an end + hover outline
    canvas.on('after:render', (e: any) => {
        if (!st.hover && !st.hints.length) return;
        const ctx: CanvasRenderingContext2D | undefined = e?.ctx ?? canvas.getContext?.();
        if (!ctx) return;

        const v = canvas.viewportTransform;
        const z = canvas.getZoom() || 1;

        ctx.save();
        ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);

        if (st.hover && st.hover.canvas === canvas && st.hover !== canvas.getActiveObject()) {
            const pts: Pt[] = st.hover.getCoords();
            ctx.beginPath();
            pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.closePath();
            ctx.lineWidth = 1.5 / z;
            ctx.strokeStyle = BRAND.primary;
            ctx.stroke();
        }

        st.hints.forEach((h) => {
            ctx.beginPath();
            ctx.arc(h.pt.x, h.pt.y, (h.on ? 6 : 4.5) / z, 0, Math.PI * 2);
            ctx.fillStyle = h.on ? BRAND.primary : '#ffffff';
            ctx.fill();
            ctx.lineWidth = 1.5 / z;
            ctx.strokeStyle = BRAND.primary;
            ctx.stroke();
        });

        ctx.restore();
    });
}
