import type { StyleId } from '@/character/schema/types';
import type { AspectId, SceneSet } from '../schema/types';

/**
 * A scene template (docs/CHARACTER_STUDIO.md phase 8 / 10): a ready scene as data, a place, who is in it (cast
 * recipe ids, optionally with poses), how they stand (a formation), where the camera is (a named view) and the frame.
 * Applying one replaces the scene's place, cast, camera and frame; the scene id and name tidy-ups stay.
 */
export interface SceneTemplate {
    id: string;
    name: string;
    tags: readonly string[];
    place: Pick<SceneSet, 'environment'> &
        Partial<Pick<SceneSet, 'variant' | 'time' | 'weather' | 'season' | 'crowd'>>;
    /** cast recipe ids (data/recipes.ts), 1–5; first = the one the scene is about */
    cast: readonly string[];
    /** pose ids, same order as `cast` (missing or null = standing) */
    poses?: readonly (string | null)[];
    formation: string;
    view: string;
    aspect?: AspectId;
    /** a style of its own (else the scene's current one) */
    style?: StyleId;
}

/** Shorthand so a template fits on a few lines. */
export const template = (
    id: string,
    name: string,
    tags: string[],
    place: SceneTemplate['place'],
    cast: string[],
    formation: string,
    view: string,
    extra: Partial<Pick<SceneTemplate, 'poses' | 'aspect' | 'style'>> = {},
): SceneTemplate => ({ id, name, tags, place, cast, formation, view, ...extra });
