import type { Dress } from '../schema/types';
import { OUTFITS_A } from './outfitsA';
import { OUTFITS_B } from './outfitsB';
import { OUTFITS_C } from './outfitsC';

/**
 * Outfit presets (docs/CHARACTER_STUDIO.md phase 3): a whole look in one click (top, bottom, shoes and accessories,
 * with colours), grouped by occasion. Each one passes the dress rules unchanged (`outfits.test.ts`), so wearing it
 * removes nothing. `suits` keeps a preset off a character it does not go with, like garments do.
 */
export type OutfitGroup =
    'everyday' | 'school' | 'work' | 'traditional' | 'sports' | 'weather' | 'party' | 'combat';

export interface Outfit {
    id: string;
    name: string;
    group: OutfitGroup;
    dress: Dress;
    suits: 'any' | 'feminine' | 'masculine';
}

export const OUTFIT_GROUPS: Record<OutfitGroup, string> = {
    everyday: 'Everyday',
    school: 'School',
    work: 'Work',
    traditional: 'Traditional',
    sports: 'Sports',
    weather: 'Weather',
    party: 'Party',
    combat: 'Army and combat',
};

export const OUTFITS: Outfit[] = [...OUTFITS_A, ...OUTFITS_B, ...OUTFITS_C];

export const OUTFIT_IDS = OUTFITS.map((o) => o.id);
export const outfitById = (id: string) => OUTFITS.find((o) => o.id === id);
