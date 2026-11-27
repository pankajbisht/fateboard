import { newId } from '@/character/schema/parse';
import type { Scene, SceneProp } from '@/scene/schema/types';
import type { SceneEdit } from '@/scene/studio/edit';
import type { SliceCreator } from '../types';

/**
 * Scene Objects props inside the Scene Studio (docs/PROPS.md §9): which prop is selected, and adding one from
 * the catalogue at its real size. The props themselves live in the scene (`studioScene.props`) and change only
 * through `editStudioScene`, so they share the scene's undo, draft and "Update on page". The catalogue and the
 * projection load on first use (the catalogue is its own chunk).
 *
 * One selection at a time: selecting a prop clears the selected character. A selection whose prop is gone (undo,
 * a template) simply matches nothing; readers check it against the scene.
 */
export interface ScenePropsSlice {
    sceneSelectedProp: string | null;
    selectSceneProp: (id: string | null) => void;
    /** adds the catalogue prop `propId` at `at` (a drop point on the ground), else in front of the camera; selected */
    addSceneProp: (propId: string, at?: { x: number; z: number }) => Promise<boolean>;
    /** a copy of the prop beside it, selected */
    duplicateSceneProp: (id: string) => void;
}

type Peers = ScenePropsSlice & {
    studioScene?: Scene | null;
    sceneSelectedActor?: string | null;
    editStudioScene?: (edit: SceneEdit, historyKey?: string) => void;
};

/** Props closer than this (cm) are moved aside, so a second click never hides behind the first. */
const CLEAR = 40;
const STEP = 60;

function freeSpot(scene: Scene, x: number, z: number): { x: number; z: number } {
    const taken = (px: number) => scene.props.some((p) => Math.hypot(p.x - px, p.z - z) < CLEAR);
    for (let i = 0; i < 20; i++) {
        // right, left, further right …
        const px = x + (i % 2 ? -1 : 1) * Math.ceil(i / 2) * STEP;
        if (!taken(px)) return { x: Math.round(px), z: Math.round(z) };
    }
    return { x: Math.round(x), z: Math.round(z) };
}

export const createScenePropsSlice: SliceCreator<ScenePropsSlice> = (set, get) => {
    const peers = () => get() as unknown as Peers;

    const add = (prop: SceneProp): boolean => {
        const s = peers();
        const before = s.studioScene;
        s.editStudioScene?.({ kind: 'addProp', prop });
        if (peers().studioScene === before) return false;
        set({ sceneSelectedProp: prop.id, sceneSelectedActor: null } as Partial<ScenePropsSlice>);
        return true;
    };

    return {
        sceneSelectedProp: null,

        selectSceneProp: (id) =>
            set(
                (id
                    ? { sceneSelectedProp: id, sceneSelectedActor: null }
                    : { sceneSelectedProp: null }) as Partial<ScenePropsSlice>,
            ),

        addSceneProp: async (propId, at) => {
            const scene = peers().studioScene;
            if (!scene) return false;
            try {
                const [{ getProp }, { sceneHeightOf, sceneReady }, proj, envs] = await Promise.all([
                    import('@/props/catalog'),
                    import('@/props/sceneSize'),
                    import('@/scene/camera/projection'),
                    import('@/scene/sets/registry'),
                ]);
                const def = getProp(propId);
                if (!def || !sceneReady(def)) return false;
                let spot = at;
                if (!spot) {
                    // a little below the frame's middle: on the ground the camera looks at
                    const v = proj.makeView(scene.camera, scene.frame.aspect);
                    const g = proj.screenToGround(v, v.width / 2, v.height * 0.72);
                    const stage = envs.ENVIRONMENTS.get(scene.set.environment).stage;
                    spot = g ? { x: g[0], z: g[2] } : { x: stage.x, z: stage.z };
                }
                const cur = peers().studioScene ?? scene;
                return add({
                    id: newId(),
                    propId: def.id,
                    variant: 0,
                    ...freeSpot(cur, spot.x, spot.z),
                    height: sceneHeightOf(def),
                });
            } catch (err) {
                console.error('[sceneProps] prop not added', err);
                return false;
            }
        },

        duplicateSceneProp: (id) => {
            const scene = peers().studioScene;
            const p = scene?.props.find((x) => x.id === id);
            if (!scene || !p) return;
            add({ ...p, id: newId(), ...freeSpot(scene, p.x + STEP, p.z) });
        },
    };
};
