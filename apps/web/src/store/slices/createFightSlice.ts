import type { Canvas, FabricObject, Group } from 'fabric';
import { applyClipsAt } from '@/animation/clips';
import { creationScaleOf } from '@/lib/canvas/creationScale';
import { comboStorage } from '@/lib/storage';
import type { FightCombo } from '@/scene/combat/choreo';
import type { Scene } from '@/scene/schema/types';
import type { SliceCreator } from '../types';

/**
 * Fight combos and clips (docs/COMBAT_PACK.md, Stage 4 + timeline playback). The user's own combos are kept in
 * the project database (`comboStorage`) next to the presets; "Play on page" bakes a combo for the Scene Studio's
 * two fighters into a clip group whose frames the timeline steps through (`animation/clips.ts`). The scene code
 * loads on first use (the store never imports it statically). Failures are toasts and falsy results.
 */
export interface FightSlice {
    /** the user's saved combos (the presets are in `scene/combat/choreo.ts`) */
    fightCombos: FightCombo[];
    fightComboStatus: 'idle' | 'loading' | 'ready' | 'error';
    loadFightCombos: () => Promise<void>;
    /** saves a combo (a second save with the same id replaces it) */
    saveFightCombo: (combo: FightCombo) => Promise<boolean>;
    deleteFightCombo: (id: string) => Promise<boolean>;
    /** places the combo as a clip on the page, starting at the playhead, and stretches the timeline to fit */
    placeFightClip: (comboId: string) => Promise<boolean>;
    /** a clip loaded as a poster (undo, redo, page switch, reload) gets its drawings back from its recipe */
    registerFightClipEvents: (canvas: Canvas) => void;
    unregisterFightClipEvents: (canvas: Canvas) => void;
}

interface Peers {
    canvas?: Canvas | null;
    studioScene?: Scene | null;
    currentTime?: number;
    animDuration?: number;
    setAnimDuration?: (ms: number) => void;
    showToast?: (o: { message: string; tone?: string }) => void;
}

interface Mods {
    choreo: typeof import('@/scene/combat/choreo');
    clip: typeof import('@/scene/combat/clip');
    board: typeof import('@/scene/board');
}

export const createFightSlice: SliceCreator<FightSlice> = (set, get) => {
    const peers = () => get() as Peers & FightSlice;
    let offClipEvents: (() => void) | null = null;

    /** Draws a loaded clip again, then shows the frame for the playhead. No history step: the poster is the same. */
    const restoreClip = async (canvas: Canvas, target: FabricObject) => {
        const m = await load();
        if (!m || !(await m.board.restoreFightClipFrames(target as Group))) return;
        if (!canvas.getObjects().includes(target)) return;
        applyClipsAt(canvas, peers().currentTime ?? 0);
        canvas.requestRenderAll();
    };
    const toast = (message: string) => peers().showToast?.({ message });
    let mods: Mods | null = null;

    const load = async (): Promise<Mods | null> => {
        if (mods) return mods;
        try {
            const [choreo, clip, board] = await Promise.all([
                import('@/scene/combat/choreo'),
                import('@/scene/combat/clip'),
                import('@/scene/board'),
            ]);
            mods = { choreo, clip, board };
            return mods;
        } catch (err) {
            console.error('[fight] code not loaded', err);
            toast('Fight tools could not load. Check your connection and try again.');
            return null;
        }
    };

    const setLibrary = async (raw: unknown[]) => {
        const m = await load();
        if (!m) return;
        set(
            {
                fightCombos: raw
                    .map((x) => m.choreo.parseCombo(x))
                    .filter((x): x is FightCombo => !!x),
                fightComboStatus: 'ready',
            },
            false,
            'fight/library',
        );
    };

    return {
        fightCombos: [],
        fightComboStatus: 'idle',

        loadFightCombos: async () => {
            set({ fightComboStatus: 'loading' }, false, 'fight/load');
            try {
                await setLibrary(await comboStorage.loadLibrary());
            } catch (err) {
                console.error('[fight] combos not read', err);
                set({ fightComboStatus: 'error' }, false, 'fight/loadError');
            }
        },

        saveFightCombo: async (combo) => {
            const m = await load();
            const clean = m?.choreo.parseCombo(combo);
            if (!clean) return false;
            try {
                await setLibrary(await comboStorage.upsert(clean));
                toast(`Saved the combo "${clean.name}"`);
                return true;
            } catch (err) {
                console.error('[fight] combo not saved', err);
                toast('Could not save the combo.');
                return false;
            }
        },

        deleteFightCombo: async (id) => {
            try {
                await setLibrary(await comboStorage.remove(id));
                return true;
            } catch (err) {
                console.error('[fight] combo not deleted', err);
                toast('Could not delete the combo.');
                return false;
            }
        },

        placeFightClip: async (comboId) => {
            const { canvas, studioScene: scene } = peers();
            if (!canvas || !scene) return false;
            const m = await load();
            if (!m) return false;
            const combo =
                peers().fightCombos.find((c) => c.id === comboId) ??
                m.choreo.COMBO_PRESETS.all.find((c) => c.id === comboId);
            // the fighters: the last exchange's pair, else the first two characters
            const ids = scene.fight
                ? [scene.fight.attacker, scene.fight.defender]
                : scene.actors.slice(0, 2).map((a) => a.id);
            if (!combo || ids.length < 2) {
                toast('A fight clip needs two characters in the scene.');
                return false;
            }
            try {
                const options = {
                    intensity: scene.fight?.intensity ?? 'normal',
                    ...(scene.fight ? { effects: scene.fight.effects } : {}),
                };
                const clip = m.clip.buildFightClip(scene, ids[0], ids[1], combo, options);
                const start = peers().currentTime ?? 0;
                // the recipe goes with the clip: it is saved as a poster and drawn again after a load
                const recipe = { scene, a: ids[0], b: ids[1], combo, options };
                const group =
                    clip && (await m.board.buildFightClipObject(clip, combo.name, start, recipe));
                if (!clip || !group) {
                    toast('This combo could not be drawn for these characters.');
                    return false;
                }
                const center = canvas.getVpCenter();
                group.scale(creationScaleOf(get()));
                group.set({ left: center.x, top: center.y });
                group.setCoords();
                canvas.add(group);
                canvas.setActiveObject(group);
                canvas.requestRenderAll();
                // the timeline is at least as long as the clip
                const end = Math.ceil(start + (clip.frames.length / clip.fps) * 1000);
                if ((peers().animDuration ?? 0) < end) peers().setAnimDuration?.(end);
                toast(`"${combo.name}" placed on the page as a clip.`);
                return true;
            } catch (err) {
                console.error('[fight] clip not placed', err);
                toast('Could not place the fight clip on the page.');
                return false;
            }
        },

        registerFightClipEvents: (canvas) => {
            offClipEvents?.();
            const onAdded = (e: { target?: FabricObject }) => {
                const t = e?.target as
                    (FabricObject & { fightClip?: { recipe?: unknown } }) | undefined;
                if (t?.fightClip?.recipe) void restoreClip(canvas, t);
            };
            const off = canvas.on('object:added', onAdded);
            offClipEvents = () => {
                off();
                offClipEvents = null;
            };
        },
        unregisterFightClipEvents: () => {
            offClipEvents?.();
        },
    };
};
