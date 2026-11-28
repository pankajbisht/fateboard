/**
 * Symmetry slice: where the symmetry comes from (source + edge, reference pins), the newer modes' settings
 * (glide, spiral, wallpaper, Mirror Chain), per-copy variation, readable text, presets and the dice.
 * The drawing mode / angle / count / free centre stay in the Brush slice (`symmetry*`, `setSymmetry`).
 * It owns the board side too: the guide + handles (symmetry/symmetryGuide.ts), dragging them
 * (symmetry/symmetryPointer.ts) and the live ghosts while drawing (brushes/symmetryPreview.ts).
 * Everything here is UI state (not in the document, not in history); user presets are saved in the browser.
 */
import type * as fabric from 'fabric';
import { SYMMETRY_COUNT, type SymmetryMode } from '@/lib/canvas/symmetry';
import { HEAVY_COPIES, type ChainStep, type ChainStepKind } from '@/lib/canvas/symmetryGroups';
import {
    isSymmetryEdge,
    type FrameBox,
    type SymmetryEdge,
    type SymmetryPin,
    type SymmetrySourceKind,
} from '@/lib/canvas/symmetryFrame';
import type { Pt } from '@/lib/canvas/symmetryMath';
import type { CopyOptions, CopyPlan } from '../brushes/symmetryCopies';
import type { SliceCreator } from '../types';
import { createSymmetryEditActions, newSymmetryId as newId } from './symmetry/symmetryEditActions';
import { createSymmetryPresetActions } from './symmetry/symmetryPresetActions';
import type { GuidePeers } from './symmetry/symmetryGuide';
import {
    createSymmetryAnimation,
    type SymmetryAnimationActions,
} from './symmetry/symmetryAnimation';
import { wireSymmetryBoard } from './symmetry/symmetryBoard';
import { createSymmetryCheck, type SymmetryCheckActions } from './symmetry/symmetryCheck';
import {
    createSymmetryLinkActions,
    type SymmetryLinkActions,
} from './symmetry/symmetryLinkActions';
import { linkCopies } from './symmetry/symmetryLinks';
import { curvePolyline, warpAcrossCurve } from './symmetry/symmetryObjects';
import { createSymmetryPlay, type SymmetryPlayActions } from './symmetry/symmetryPlay';
import { createSymmetryShapeTools, type SymmetryShapeTools } from './symmetry/symmetryShapeTools';
import { createSymmetryStamps, type SymmetryStampActions } from './symmetry/symmetryStamps';
import { BUILTIN_SYMMETRY_PRESETS, type SymmetryPreset } from './symmetry/symmetryPresets';
import {
    DEFAULT_SYMMETRY_OPTIONS,
    DEFAULT_SYMMETRY_VARIATION,
    findObjectById,
    objectBox,
    sanitizeSymmetryOptions,
    sanitizeSymmetryVariation,
    symmetryPlanOf,
    type SymmetryModeOptions,
    type SymmetryVariation,
} from './symmetry/symmetrySetup';

export interface SymmetrySlice
    extends
        SymmetryLinkActions,
        SymmetryShapeTools,
        SymmetryCheckActions,
        SymmetryAnimationActions,
        SymmetryStampActions,
        SymmetryPlayActions {
    symmetrySource: SymmetrySourceKind;
    symmetryEdge: SymmetryEdge;
    /** Selection source: the selection's box when it was picked. Object source: its last known box. */
    symmetryBox: FrameBox | null;
    symmetryObjectId: string | null;
    symmetryPins: SymmetryPin[];
    symmetryPinId: string | null;
    symmetryOptions: SymmetryModeOptions;
    symmetryChain: ChainStep[];
    symmetryVariation: SymmetryVariation;
    symmetryPanelOpen: boolean;
    symmetryPresets: SymmetryPreset[];
    /** Pick the source; returns false (with a toast) when it needs a selection and there is none. */
    setSymmetrySource: (kind: SymmetrySourceKind) => boolean;
    setSymmetryEdge: (edge: SymmetryEdge) => void;
    setSymmetryOptions: (patch: Partial<SymmetryModeOptions>) => void;
    setSymmetryVariation: (patch: Partial<SymmetryVariation>) => void;
    /** Adds a reference pin (at `at`, else the current centre), makes it the source; returns its id. */
    addSymmetryPin: (at?: Pt) => string | null;
    updateSymmetryPin: (id: string, patch: Partial<Omit<SymmetryPin, 'id'>>) => void;
    removeSymmetryPin: (id: string) => void;
    /** Makes a pin the source. */
    pickSymmetryPin: (id: string) => void;
    addSymmetryStep: (kind: ChainStepKind) => void;
    updateSymmetryStep: (id: string, patch: Partial<ChainStep>) => void;
    /** Moves a chain step up (-1) or down (+1), like layers. */
    moveSymmetryStep: (id: string, by: -1 | 1) => void;
    removeSymmetryStep: (id: string) => void;
    setSymmetryPanelOpen: (open: boolean) => void;
    /** M: off ↔ the last mode used. Returns the new mode. */
    toggleSymmetry: () => SymmetryMode;
    /** Shift + [ / ]: fewer / more copies. Returns the new count. */
    stepSymmetryCount: (delta: number) => number;
    /** The copies a stroke gets now, and how to make them (null = symmetry off). */
    symmetryCopyPlan: () => CopyPlan | null;
    /** Copies per stroke now, how many the setup wanted (over the cap = cut), and whether it is heavy. */
    symmetryCopyStats: () => { count: number; wanted: number; heavy: boolean };
    applySymmetryPreset: (preset: SymmetryPreset) => void;
    saveSymmetryPreset: (name?: string) => SymmetryPreset | null;
    deleteSymmetryPreset: (id: string) => Promise<boolean>;
    /** Dice: a random setup (seeded); returns it so the panel can offer "lock this one". */
    rollSymmetryDice: (seed?: number) => SymmetryPreset;
}

export type SymmetryPeers = SymmetrySlice &
    GuidePeers & {
        zoom?: number;
        _isRestoring?: boolean;
        setSymmetry?: (mode: string) => void;
        updateBrush?: (patch: Record<string, unknown>) => void;
        showToast?: (o: { message: string; actionLabel?: string; onAction?: () => void }) => void;
        confirmDialog?: (o: {
            title: string;
            message: string;
            tone?: 'danger';
        }) => Promise<boolean>;
        persist?: () => void;
        saveState?: () => void;
    };

export const createSymmetrySlice: SliceCreator<SymmetrySlice> = (set, get, store) => {
    const peers = () => get() as unknown as SymmetryPeers;
    const toast = (message: string) => peers().showToast?.({ message });
    const setAny = set as unknown as (p: Record<string, unknown>, r: false, a: string) => void;
    const check = createSymmetryCheck(setAny, peers);
    const anim = createSymmetryAnimation(setAny, peers);
    let lastMode: SymmetryMode = 'x';
    wireSymmetryBoard({ set: setAny, store, peers, check, anim });

    const enableIfOff = (mode: SymmetryMode) => {
        const s = peers();
        if ((s.symmetry ?? 'none') === 'none') s.setSymmetry?.(mode);
    };

    return {
        symmetrySource: 'free',
        symmetryEdge: 'center',
        symmetryBox: null,
        symmetryObjectId: null,
        symmetryPins: [],
        symmetryPinId: null,
        symmetryOptions: DEFAULT_SYMMETRY_OPTIONS,
        symmetryChain: [],
        symmetryVariation: DEFAULT_SYMMETRY_VARIATION,
        symmetryPanelOpen: false,
        ...createSymmetryEditActions(set, get, peers),
        ...createSymmetryLinkActions(peers),
        ...createSymmetryShapeTools(setAny, peers),
        ...check.actions,
        ...anim.actions,
        ...createSymmetryStamps(setAny, peers),
        ...createSymmetryPlay(setAny, peers),
        ...createSymmetryPresetActions(set, get, peers),

        setSymmetrySource: (kind) => {
            const s = peers();
            const canvas = s.canvas;
            if (kind === 'selection' || kind === 'object') {
                const active = canvas?.getActiveObject();
                if (!canvas || !active) {
                    toast(
                        kind === 'object'
                            ? 'Select the object that should act as the mirror first.'
                            : 'Select something first: its centre or edges become the mirror.',
                    );
                    return false;
                }
                const box = objectBox(active);
                if (kind === 'object') {
                    if (canvas.getActiveObjects().length !== 1) {
                        toast('Select one object to use it as the mirror.');
                        return false;
                    }
                    const obj = active as fabric.FabricObject & { id?: string };
                    if (!obj.id) {
                        obj.id = newId('obj');
                        s.persist?.();
                    }
                    set(
                        { symmetrySource: kind, symmetryObjectId: obj.id, symmetryBox: box },
                        false,
                        'symmetry/source',
                    );
                } else set({ symmetrySource: kind, symmetryBox: box }, false, 'symmetry/source');
                enableIfOff('x');
                return true;
            }
            if (kind === 'pin') {
                if (!s.symmetryPins.length) get().addSymmetryPin();
                const pins = peers().symmetryPins;
                const pinId = pins.some((p) => p.id === s.symmetryPinId)
                    ? s.symmetryPinId
                    : (pins[0]?.id ?? null);
                set({ symmetrySource: 'pin', symmetryPinId: pinId }, false, 'symmetry/source');
                enableIfOff('x');
                return true;
            }
            set({ symmetrySource: kind }, false, 'symmetry/source');
            if (kind === 'page') enableIfOff('x');
            return true;
        },

        setSymmetryEdge: (edge) => {
            if (!isSymmetryEdge(edge)) return;
            set({ symmetryEdge: edge }, false, 'symmetry/edge');
            // an edge implies its mirror: left / right edges mirror left-right, top / bottom top-bottom
            const mode = peers().symmetry ?? 'none';
            if (!['none', 'x', 'y'].includes(mode)) return;
            if (edge === 'left' || edge === 'right') peers().setSymmetry?.('x');
            if (edge === 'top' || edge === 'bottom') peers().setSymmetry?.('y');
            if (edge === 'diagonal') peers().setSymmetry?.('x');
        },

        setSymmetryOptions: (patch) =>
            set(
                { symmetryOptions: sanitizeSymmetryOptions(get().symmetryOptions, patch ?? {}) },
                false,
                'symmetry/options',
            ),

        setSymmetryVariation: (patch) =>
            set(
                {
                    symmetryVariation: sanitizeSymmetryVariation(
                        get().symmetryVariation,
                        patch ?? {},
                    ),
                },
                false,
                'symmetry/variation',
            ),

        setSymmetryPanelOpen: (open) => {
            if (get().symmetryPanelOpen !== !!open)
                set({ symmetryPanelOpen: !!open }, false, 'symmetry/panel');
        },

        toggleSymmetry: () => {
            const s = peers();
            const mode = s.symmetry ?? 'none';
            if (mode !== 'none') {
                lastMode = mode;
                s.setSymmetry?.('none');
                return 'none';
            }
            s.setSymmetry?.(lastMode);
            return lastMode;
        },

        stepSymmetryCount: (delta) => {
            const s = peers();
            const n = Math.min(
                SYMMETRY_COUNT.max,
                Math.max(SYMMETRY_COUNT.min, (s.symmetryCount ?? 6) + Math.round(delta)),
            );
            s.updateBrush?.({ symmetryCount: n });
            return n;
        },

        symmetryCopyPlan: () => {
            const s = peers();
            const options: CopyOptions = {
                textMode: s.symmetryOptions.textMode,
                variation: s.symmetryVariation,
            };
            if (s.symmetry === 'curve') {
                const curve = s.canvas ? findObjectById(s.canvas, s.symmetryCurveId) : null;
                const poly = curvePolyline(curve);
                if (!poly) return null;
                return {
                    matrices: [],
                    options,
                    warp: (obj) =>
                        obj === curve ? Promise.resolve(null) : warpAcrossCurve(obj, poly),
                };
            }
            const plan = symmetryPlanOf(s);
            if (!plan) return null;
            return {
                matrices: plan.matrices,
                options,
                onCopies: s.symmetryOptions.linked
                    ? (source, copies) =>
                          linkCopies(source, copies, plan.matrices, options, plan.frame.center)
                    : undefined,
            };
        },

        symmetryCopyStats: () => {
            const plan = symmetryPlanOf(peers());
            const count = plan?.matrices.length ?? 0;
            return { count, wanted: plan?.wanted ?? 0, heavy: count >= HEAVY_COPIES };
        },
    };
};

export { BUILTIN_SYMMETRY_PRESETS };
