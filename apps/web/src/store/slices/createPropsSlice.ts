import type { Canvas, FabricObject } from 'fabric';
import type { PropData, PropLight } from '@/props/types';
import { creationScaleOf } from '@/lib/canvas/creationScale';
import { PROP_DRAG_TYPE } from '@/props/dragType';
import type { SliceCreator } from '../types';
import {
    PROP_ID as ID,
    RECENT_MAX,
    clampLine,
    pageBox,
    pageLight,
    readPropPrefs,
    savePropPrefs,
    snapToGround,
} from './props/propPage';
import type { PageActionContext } from './props/propActions';
import {
    createPropLibrary,
    type PropLibraryActions,
    type PropLibraryState,
} from './props/propLibrary';

/**
 * Scene Objects (props library, docs/PROPS.md): manga scenery placed on the page from the left rail
 * "Scene Objects" panel, by click (view centre) or drag and drop (the drop point). The prop code
 * (`@/props/board` + the catalogue) loads on first use, so the editor's first load does not grow.
 */
export interface PropsSlice extends PropLibraryState, PropLibraryActions {
    /** Starred props (ids), shown under "Favorites" in the panel. Saved per browser. */
    propFavorites: string[];
    /** Recently added props, newest first, at most 12. Saved per browser. */
    propRecent: string[];
    togglePropFavorite: (propId: string) => void;
    /** Put a prop at the front of the recent list (addProp calls it). */
    notePropUsed: (propId: string) => void;
    /** Place a prop (`at`: page point for its centre, default the view centre). True when placed. */
    addProp: (propId: string, opts?: { at?: { x: number; y: number } }) => Promise<boolean>;
    /** Restyle the selected prop in place (colours, outline, tone, variant): one undo step. True when done. */
    updateSelectedProp: (patch: Partial<Omit<PropData, 'v' | 'propId'>>) => Promise<boolean>;
    /** Another variant of the selected prop (or, without variants, another main colour). */
    randomizeSelectedProp: () => Promise<boolean>;
    /** Lay out a scene preset on three new page layers (Background, Midground, Foreground). Props placed. */
    applyPropScene: (sceneId: string) => Promise<number>;
    /** Day / sunset / night for every prop on the page, one undo step. Props restyled. */
    setPropTimeOfDay: (light: PropLight) => Promise<number>;
    /** Snap dragged props onto the ground line. Saved per browser. */
    propGroundSnap: boolean;
    /** The ground line, a fraction of the page height from the top (0.5 … 1). Saved per browser. */
    propGroundLine: number;
    setPropGroundSnap: (on: boolean) => void;
    setPropGroundLine: (fraction: number) => void;
    /** Accept props dragged from the panel onto `canvas`; returns the disposer. The slice binds each new board itself. */
    bindProps: (canvas: Canvas) => () => void;
}

export { PROP_DRAG_TYPE };

/** Main colours Randomize picks from when a prop has no variants (clear, manga-friendly hues). */
const RANDOM_COLORS = [
    '#e2504c',
    '#f2b233',
    '#7cc36b',
    '#5b8ec9',
    '#9b7fe8',
    '#f29ac0',
    '#3fa7a0',
    '#a8744a',
];
type Peers = PropsSlice & {
    canvas?: Canvas | null;
    boardMode?: 'design' | 'whiteboard' | null;
    pageWidth?: number;
    pageHeight?: number;
    isPageSwitching?: boolean;
    _isRestoring?: boolean;
    saveState?: (immediate?: boolean) => void;
    pauseHistory?: () => void;
    resumeHistory?: () => void;
    showToast?: (o: { message: string; tone?: string }) => void;
    addPageLayer?: (kind?: 'layer') => string | null;
    updatePageLayer?: (id: string, patch: { name?: string }) => void;
    setActiveLayer?: (id: string) => void;
};

type DragLike = {
    dataTransfer?: {
        types?: readonly string[] | DOMStringList;
        getData: (t: string) => string;
    } | null;
    preventDefault?: () => void;
};

const carriesProp = (e: DragLike | undefined) =>
    !!e?.dataTransfer?.types && Array.from(e.dataTransfer.types).includes(PROP_DRAG_TYPE);

export const createPropsSlice: SliceCreator<PropsSlice> = (set, get, store) => {
    const peers = () => get() as Peers;
    const saved = readPropPrefs();
    const savePrefs = () => {
        const p = peers();
        savePropPrefs({
            favorites: p.propFavorites,
            recent: p.propRecent,
            groundSnap: p.propGroundSnap,
            groundLine: p.propGroundLine,
        });
    };
    const pageCtx = (): PageActionContext => ({ peers, oneStep });
    /** One of the user's own props (phase 6): placed like a catalogue prop, without restyling. */
    const placeUserProp = async (canvas: Canvas, id: string, at?: { x: number; y: number }) => {
        if (peers().propUserLibraryStatus !== 'ready') await peers().loadPropLibrary();
        const prop = peers().propUserLibrary.find((p) => p.id === id);
        if (!prop) return false;
        const board = await import('@/props/board');
        const obj = await board.buildUserPropObject(prop);
        if (!obj || peers().canvas !== canvas) return false;
        const p = at ?? canvas.getVpCenter();
        obj.scale(creationScaleOf(peers()));
        obj.set({ left: p.x, top: p.y });
        obj.setCoords();
        canvas.add(obj);
        canvas.setActiveObject(obj);
        canvas.requestRenderAll();
        peers().notePropUsed(id);
        return true;
    };
    /** One board history step around several canvas changes (CANVAS.md "History"). */
    const oneStep = async <T>(fn: () => Promise<T>): Promise<T> => {
        peers().pauseHistory?.();
        try {
            return await fn();
        } finally {
            peers().resumeHistory?.();
            peers().saveState?.(true);
        }
    };

    // follow the board: bind the new canvas, let go of the old one (a mode switch makes a new canvas)
    let bound: Canvas | null = null;
    let unbind: (() => void) | null = null;
    store?.subscribe?.((state: Peers) => {
        const canvas = state.canvas ?? null;
        if (canvas === bound) return;
        unbind?.();
        unbind = null;
        bound = canvas;
        if (canvas) unbind = peers().bindProps(canvas);
    });

    return {
        ...createPropLibrary({ set, get: () => peers() }),
        propFavorites: saved.favorites,
        propRecent: saved.recent,
        propGroundSnap: saved.groundSnap,
        propGroundLine: saved.groundLine,

        setPropGroundSnap: (on) => {
            set({ propGroundSnap: on }, false, 'props/groundSnap');
            savePrefs();
        },
        setPropGroundLine: (fraction) => {
            set({ propGroundLine: clampLine(fraction) }, false, 'props/groundLine');
            savePrefs();
        },

        // page-wide actions load on first use (out of the store chunk)
        setPropTimeOfDay: async (light) =>
            (await import('./props/propActions')).relightPage(pageCtx(), light),

        applyPropScene: async (sceneId) =>
            (await import('./props/propActions')).layOutScene(pageCtx(), sceneId),

        togglePropFavorite: (propId) => {
            if (!ID.test(propId)) return;
            const list = peers().propFavorites;
            set(
                {
                    propFavorites: list.includes(propId)
                        ? list.filter((x) => x !== propId)
                        : [...list, propId],
                },
                false,
                'props/toggleFavorite',
            );
            savePrefs();
        },

        notePropUsed: (propId) => {
            if (!ID.test(propId)) return;
            const recent = [propId, ...peers().propRecent.filter((x) => x !== propId)].slice(
                0,
                RECENT_MAX,
            );
            set({ propRecent: recent }, false, 'props/used');
            savePrefs();
        },

        updateSelectedProp: async (patch) => {
            const { canvas } = peers();
            if (!canvas) return false;
            try {
                const board = await import('@/props/board');
                const target = canvas.getActiveObject();
                const current = board.readPropData(target);
                if (!target || !current || !board.isPropGroup(target)) return false;
                const next: PropData = {
                    ...current,
                    ...patch,
                    colors: { ...current.colors, ...(patch.colors ?? {}) },
                    tone: { ...current.tone, ...(patch.tone ?? {}) },
                };
                const fresh = await board.buildPropObject(next);
                if (!fresh || canvas.getActiveObject() !== target) return false;
                const data = board.readPropData(fresh)!;
                // one board history step for the whole restyle (CANVAS.md "History")
                peers().pauseHistory?.();
                try {
                    board.swapPropDrawing(target, fresh, data);
                    canvas.fire('object:modified', { target });
                } finally {
                    peers().resumeHistory?.();
                }
                peers().saveState?.(true);
                canvas.requestRenderAll();
                return true;
            } catch (err) {
                console.error('[props] could not restyle the prop', err);
                peers().showToast?.({ message: 'Could not change the scene object.' });
                return false;
            }
        },

        randomizeSelectedProp: async () => {
            const { canvas } = peers();
            if (!canvas) return false;
            try {
                const [board, catalog] = await Promise.all([
                    import('@/props/board'),
                    import('@/props/catalog'),
                ]);
                const current = board.readPropData(canvas.getActiveObject());
                const def = current && catalog.getProp(current.propId);
                if (!current || !def) return false;
                const variants = def.variants?.length ?? 0;
                if (variants > 1) {
                    const step = 1 + Math.floor(Math.random() * (variants - 1));
                    return peers().updateSelectedProp({
                        variant: (current.variant + step) % variants,
                    });
                }
                const slot = Object.keys(def.colors)[0];
                const now = current.colors[slot] ?? def.colors[slot];
                const choices = RANDOM_COLORS.filter((c) => c !== now);
                const color = choices[Math.floor(Math.random() * choices.length)];
                return peers().updateSelectedProp({ colors: { [slot]: color } });
            } catch (err) {
                console.error('[props] could not randomize the prop', err);
                return false;
            }
        },

        addProp: async (propId, opts = {}) => {
            const { canvas } = peers();
            if (!canvas) return false;
            try {
                if (propId.startsWith('user-')) return await placeUserProp(canvas, propId, opts.at);
                const [board, catalog, parse] = await Promise.all([
                    import('@/props/board'),
                    import('@/props/catalog'),
                    import('@/props/schema/parse'),
                ]);
                const def = catalog.getProp(propId);
                if (!def) return false;
                const obj = await board.buildPropObject({
                    propId,
                    shadow: parse.shadowByDefault(def),
                    light: pageLight(canvas),
                });
                // the board may have been switched while the prop code loaded
                if (!obj || peers().canvas !== canvas) return false;
                const at = opts.at ?? canvas.getVpCenter();
                obj.scale(creationScaleOf(peers()));
                obj.set({ left: at.x, top: at.y });
                obj.setCoords();
                canvas.add(obj as FabricObject); // object:added → history + autosave
                canvas.setActiveObject(obj as FabricObject);
                canvas.requestRenderAll();
                peers().notePropUsed(propId);
                return true;
            } catch (err) {
                console.error('[props] could not place the prop', err);
                peers().showToast?.({ message: 'Could not place the scene object.' });
                return false;
            }
        },

        bindProps: (canvas) => {
            const busy = () => !!(peers().isPageSwitching || peers()._isRestoring);
            // the browser only fires `drop` where `dragover` was cancelled: only for our payload, so file
            // and layer drags keep their own behaviour
            const onOver = ({ e }: { e?: DragLike }) => {
                if (carriesProp(e)) e?.preventDefault?.();
            };
            const onDrop = ({
                e,
                scenePoint,
            }: {
                e?: DragLike;
                scenePoint?: { x: number; y: number };
            }) => {
                if (!carriesProp(e) || busy()) return;
                e?.preventDefault?.();
                const id = e?.dataTransfer?.getData(PROP_DRAG_TYPE) ?? '';
                if (!id) return;
                void peers().addProp(
                    id,
                    scenePoint ? { at: { x: scenePoint.x, y: scenePoint.y } } : {},
                );
            };
            // ground line: a dragged prop's base snaps onto it within 14 screen px
            const onMoving = ({ target }: { target?: FabricObject & { propData?: unknown } }) => {
                const p = peers();
                if (!p.propGroundSnap || !target?.propData || busy()) return;
                const box = pageBox(p);
                snapToGround(
                    target,
                    box.top + p.propGroundLine * box.height,
                    14 / (canvas.getZoom?.() || 1),
                );
            };
            const offs = [
                canvas.on('dragover', onOver as never),
                canvas.on('drop', onDrop as never),
                canvas.on('object:moving', onMoving as never),
            ];
            return () => offs.forEach((off) => off());
        },
    };
};
