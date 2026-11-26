import { generateCast, ageGroupOf, type AgeGroup } from './castGenerator';
import { RECIPES, fromRecipe, type CharacterRecipe } from './recipes';
import type { Character } from '../schema/types';

/**
 * The cast browser's data: the 100 people (the hand-made recipes, then generated ones), built once on first use, and the pure
 * filter the Cast tab uses (search + age group + look).
 */
let cache: CharacterRecipe[] | null = null;

export function castRecipes(): readonly CharacterRecipe[] {
    return (cache ??= generateCast(RECIPES, 100));
}

export type LookFilter = 'any' | 'masculine' | 'feminine';

export interface CastFilter {
    query: string;
    age: AgeGroup | 'any';
    look: LookFilter;
}

export const NO_FILTER: CastFilter = { query: '', age: 'any', look: 'any' };

/** People matching every part of the filter; the query matches name, role and tags (all words). */
export function filterCast(list: readonly CharacterRecipe[], f: CastFilter): CharacterRecipe[] {
    const words = f.query.toLowerCase().split(/\s+/).filter(Boolean);
    return list.filter((r) => {
        if (f.age !== 'any' && ageGroupOf(r.age) !== f.age) return false;
        if (f.look === 'masculine' && r.gender >= 0.4) return false;
        if (f.look === 'feminine' && r.gender < 0.6) return false;
        if (!words.length) return true;
        const text = `${r.name} ${r.role} ${r.tags.join(' ')} ${ageGroupOf(r.age)}`.toLowerCase();
        return words.every((w) => text.includes(w));
    });
}

/** A new person from a recipe (ids made fresh each time). */
export const castCharacter = (r: CharacterRecipe, id: string): Character => fromRecipe(r, id);
