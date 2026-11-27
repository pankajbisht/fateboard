import type { Character, Dress, Identity } from '../schema/types';

/**
 * Which items the studio lists for whom (2026-11-27, owner: "if male is selected only show the items a male can use,
 * same for female; trans sees everything"; loose tagging chosen: most items are for anyone, only clearly gendered
 * ones are limited). This is about the studio's lists only: the catalogues' own `suits` tags drive the cast
 * generator and Surprise me and stay as they are (changing them would change the 100-person cast).
 * An item the character already wears is always listed (the tabs add it back), so nothing disappears from a look.
 */
export type Catalog = 'hair' | 'top' | 'bottom' | 'shoes' | 'accessory';

export const ONLY_FOR: Record<Catalog, { female: readonly string[]; male: readonly string[] }> = {
    hair: {
        female: ['pigtails', 'space-buns', 'double-braids', 'hime'],
        male: ['receding', 'balding'],
    },
    top: {
        female: ['blouse', 'school-blouse', 'puff-blouse', 'tube-top', 'kurti'],
        male: ['sherwani', 'nehru-jacket'],
    },
    bottom: {
        female: [
            'skirt',
            'mini-skirt',
            'long-skirt',
            'pleated-skirt',
            'pencil-skirt',
            'maxi-skirt',
            'tennis-skirt',
            'a-line-skirt',
            'ball-skirt',
            'tulip-skirt',
            'lehenga',
            'sharara',
            'hot-pants',
        ],
        male: ['dhoti', 'swim-trunks'],
    },
    shoes: { female: ['heels'], male: [] },
    accessory: { female: ['bindi', 'bow', 'hair-clip'], male: [] },
};

/** The identity set in the studio, else the side of the frame the body is on. */
export const identityOf = (c: Pick<Character, 'identity' | 'body'>): Identity =>
    c.identity ?? (c.body.gender >= 0.5 ? 'female' : 'male');

/** Whether the studio lists `id` of `catalog` for `who`. */
export function listedFor(who: Identity, catalog: Catalog, id: string): boolean {
    if (who === 'trans') return true;
    const other = who === 'male' ? 'female' : 'male';
    return !ONLY_FOR[catalog][other].includes(id);
}

/** An outfit is listed when every piece of it is. */
export const outfitListed = (who: Identity, d: Dress): boolean =>
    listedFor(who, 'top', d.top.kind) &&
    listedFor(who, 'bottom', d.bottom.kind) &&
    listedFor(who, 'shoes', d.shoes.kind) &&
    d.accessories.every((a) => listedFor(who, 'accessory', a.kind));

/** The ids of a catalogue to list: the listed ones, plus the one worn (it never disappears from the list). */
export const listIds = <T extends string>(
    who: Identity,
    catalog: Catalog,
    ids: readonly T[],
    worn?: string,
): T[] => ids.filter((id) => id === worn || listedFor(who, catalog, id));
