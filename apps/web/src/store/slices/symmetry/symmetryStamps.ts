/**
 * Symmetry slice: Pattern maker (one wallpaper cell → a seamless PNG tile) and Symmetry stamps (save the selected
 * symmetric shape as a stamp, then click to stamp it; the current symmetry copies each stamp too). Stamps are
 * saved in the browser (`@/lib/storage` local list "symmetry-stamps"), as object JSON through CUSTOM_PROPS.
 */
import * as fabric from 'fabric';
import { CUSTOM_PROPS } from '@/lib/serialization';
import { readLocalList, writeLocalList } from '@/lib/storage';
import { downloadBlob } from '@/lib/export/downloadBlob';
import { wallpaperLattice } from '@/lib/canvas/symmetryGroups';
import { copiesForPlan } from '../../brushes/symmetryCopies';
import type { SymmetryPeers } from '../createSymmetrySlice';
import { clientToScene } from './symmetryPointer';
import { symmetryFrameOf } from './symmetrySetup';

const STAMPS_KEY = 'symmetry-stamps';
const MAX_STAMPS = 24;
const MAX_STAMP_CHARS = 400_000;

export type SymmetryStamp = { id: string; name: string; objects: Record<string, unknown>[] };

export interface SymmetryStampActions {
    symmetryStamps: SymmetryStamp[];
    symmetryStampArmed: string | null;
    saveSymmetryStamp: (name?: string) => SymmetryStamp | null;
    armSymmetryStamp: (id: string | null) => void;
    deleteSymmetryStamp: (id: string) => Promise<boolean>;
    /** Pattern maker: the wallpaper cell as a seamless PNG. */
    exportSymmetryTile: () => Promise<boolean>;
}

type Set = (partial: Record<string, unknown>, replace: false, action: string) => void;

const isStamp = (v: unknown): v is SymmetryStamp =>
    !!v &&
    typeof v === 'object' &&
    typeof (v as SymmetryStamp).id === 'string' &&
    typeof (v as SymmetryStamp).name === 'string' &&
    Array.isArray((v as SymmetryStamp).objects);

function loadStamps(): SymmetryStamp[] {
    try {
        return readLocalList(STAMPS_KEY, isStamp);
    } catch {
        return [];
    }
}

/** Renders the scene rectangle (left, top, w, h) at `mult` without helpers. */
function renderRegion(
    canvas: fabric.Canvas,
    left: number,
    top: number,
    w: number,
    h: number,
    mult: number,
) {
    const vpt = canvas.viewportTransform.slice() as fabric.TMat2D;
    const skip = canvas.skipOffscreen;
    const helpers = canvas
        .getObjects()
        .filter((o) => (o as unknown as Record<string, unknown>)._isHelper && o.visible);
    helpers.forEach((o) => o.set({ visible: false }));
    try {
        canvas.skipOffscreen = false;
        canvas.viewportTransform = [1, 0, 0, 1, -left, -top];
        return canvas.toCanvasElement(mult, { left: 0, top: 0, width: w, height: h });
    } finally {
        canvas.viewportTransform = vpt;
        canvas.skipOffscreen = skip;
        helpers.forEach((o) => o.set({ visible: true }));
        canvas.requestRenderAll();
    }
}

export function createSymmetryStamps(set: Set, peers: () => SymmetryPeers) {
    const toast = (message: string) => peers().showToast?.({ message });
    const write = (list: SymmetryStamp[]) => {
        set({ symmetryStamps: list }, false, 'symmetry/stamps');
        writeLocalList(STAMPS_KEY, list);
    };
    return {
        symmetryStamps: loadStamps(),
        symmetryStampArmed: null,

        saveSymmetryStamp: (name) => {
            const canvas = peers().canvas;
            const objects = canvas?.getActiveObjects() ?? [];
            if (!canvas || !objects.length) {
                toast('Select the shape to save as a stamp first.');
                return null;
            }
            if (objects.some((o) => o instanceof fabric.FabricImage)) {
                toast('Stamps hold drawings and shapes, not photos.');
                return null;
            }
            const json = objects.map((o) => {
                // members of a selection: their place on the board, not inside the selection
                const m = o.calcTransformMatrix();
                const data = o.toObject([...CUSTOM_PROPS]) as Record<string, unknown>;
                const d = fabric.util.qrDecompose(m);
                return {
                    ...data,
                    left: d.translateX,
                    top: d.translateY,
                    originX: 'center',
                    originY: 'center',
                    angle: d.angle,
                    scaleX: d.scaleX,
                    scaleY: d.scaleY,
                    skewX: d.skewX,
                    skewY: 0,
                };
            });
            if (JSON.stringify(json).length > MAX_STAMP_CHARS) {
                toast('That shape is too big for a stamp. Simplify it or pick fewer objects.');
                return null;
            }
            const list = peers().symmetryStamps;
            const stamp: SymmetryStamp = {
                id: `stamp-${Math.random().toString(36).slice(2, 10)}`,
                name: (name ?? '').trim().slice(0, 40) || `Stamp ${list.length + 1}`,
                objects: json,
            };
            write([...list, stamp].slice(-MAX_STAMPS));
            toast(`Saved "${stamp.name}". Pick it and click the board to stamp.`);
            return stamp;
        },

        armSymmetryStamp: (id) => {
            set({ symmetryStampArmed: id }, false, 'symmetry/stampArm');
            if (id) toast('Click the board to stamp. Esc to stop.');
        },

        deleteSymmetryStamp: async (id) => {
            const s = peers();
            const stamp = s.symmetryStamps.find((x) => x.id === id);
            if (!stamp) return false;
            const ok = s.confirmDialog
                ? await s.confirmDialog({
                      title: 'Delete stamp?',
                      message: `"${stamp.name}" will be removed from this browser.`,
                      tone: 'danger',
                  })
                : true;
            if (!ok) return false;
            write(peers().symmetryStamps.filter((x) => x.id !== id));
            if (peers().symmetryStampArmed === id)
                set({ symmetryStampArmed: null }, false, 'symmetry/stampArm');
            return true;
        },

        exportSymmetryTile: async () => {
            const s = peers();
            const canvas = s.canvas;
            const frame = symmetryFrameOf(s);
            if (!canvas || !frame) return false;
            if (s.symmetry !== 'wallpaper') {
                toast(
                    'Pattern maker works with the Wallpaper mode: draw a motif, then export the tile.',
                );
                return false;
            }
            if (Math.abs(frame.rotation % 360) > 0.01) {
                toast('Turn the source back to 0° to export a straight tile.');
                return false;
            }
            const { a, b } = wallpaperLattice(
                s.symmetryOptions.wallpaper,
                s.symmetryOptions.tileSize,
            );
            // the repeat is a rectangle: one cell (square lattices) or two (hexagonal: w × w√3)
            const w = Math.abs(a.x);
            const h = b.x === 0 ? Math.abs(b.y) : Math.abs(b.y) * 2;
            const mult = Math.min(4, Math.max(0.25, 1024 / Math.max(w, h)));
            try {
                const el = renderRegion(
                    canvas,
                    frame.center.x - w / 2,
                    frame.center.y - h / 2,
                    w,
                    h,
                    mult,
                );
                const blob = await new Promise<Blob | null>((res) => el.toBlob(res, 'image/png'));
                el.width = 0;
                el.height = 0;
                if (!blob) throw new Error('empty tile');
                downloadBlob(blob, `symmetry-tile-${s.symmetryOptions.wallpaper}.png`);
                return true;
            } catch (err) {
                console.error('[symmetry] tile export failed', err);
                toast('The tile could not be exported.');
                return false;
            }
        },
    } satisfies SymmetryStampActions;
}

/** Stamp clicks while a stamp is armed; returns the disposer. */
export function attachSymmetryStamps(
    canvas: fabric.Canvas,
    peers: () => SymmetryPeers,
    disarm: () => void,
) {
    const wrapper = canvas.upperCanvasEl?.parentElement as HTMLElement | null;
    if (!wrapper) return () => {};
    const onDown = async (e: PointerEvent) => {
        const s = peers();
        const stamp = s.symmetryStamps.find((x) => x.id === s.symmetryStampArmed);
        if (!stamp || e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const p = clientToScene(canvas, e.clientX, e.clientY);
        try {
            const objs = (await fabric.util.enlivenObjects(stamp.objects)) as fabric.FabricObject[];
            const placed: fabric.FabricObject =
                objs.length === 1
                    ? objs[0]
                    : new fabric.Group(objs, { originX: 'left', originY: 'top' });
            placed.setPositionByOrigin(new fabric.Point(p.x, p.y), 'center', 'center');
            placed.setCoords();
            const plan = s.symmetry && s.symmetry !== 'none' ? s.symmetryCopyPlan() : null;
            const copies = plan ? await copiesForPlan(placed, plan) : [];
            if (peers().canvas !== canvas) return;
            canvas.add(placed, ...copies);
            canvas.requestRenderAll();
        } catch (err) {
            console.error('[symmetry] stamp failed', err);
        }
    };
    const block = (e: Event) => {
        if (peers().symmetryStampArmed) e.stopPropagation();
    };
    const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && peers().symmetryStampArmed) disarm();
    };
    wrapper.addEventListener('pointerdown', onDown, true);
    wrapper.addEventListener('mousedown', block, true);
    window.addEventListener('keydown', onKey);
    return () => {
        wrapper.removeEventListener('pointerdown', onDown, true);
        wrapper.removeEventListener('mousedown', block, true);
        window.removeEventListener('keydown', onKey);
    };
}
