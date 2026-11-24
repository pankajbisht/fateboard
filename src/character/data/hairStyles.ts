import type { HairStyle } from '../schema/types';

/**
 * The hairstyles (docs/CHARACTER_STUDIO.md phase 3) as data. A style is layered shapes on the head: a `cap`
 * over the skull (with a fringe), a `back` shell (how far down the hair hangs) and separate `blobs` for tied or
 * standing hair (buns, tails, braids, spikes, locks). All numbers are in head units: x and z in half-widths and
 * half-depths of the head, y in half-heights, measured from the head's centre (y + = up, z + = the face side).
 * `Record<HairStyle, …>` makes a missing style a compile error; `hairStyles.test.ts` renders every one.
 */
export type Fringe = 'none' | 'straight' | 'low' | 'side' | 'swept' | 'center' | 'wispy';
export type HairGroup = 'Short' | 'Medium' | 'Long' | 'Tied up' | 'Curly' | 'Older';

export interface HairBlob {
    at: [number, number, number];
    r: [number, number, number];
    /** the lower part takes the tip colour */
    tip?: boolean;
    /** a point the shape reaches out to (head units, like `at`): a pointed spike instead of a round blob */
    apex?: [number, number, number];
}

export interface HairDef {
    name: string;
    group: HairGroup;
    suits: 'any' | 'feminine' | 'masculine';
    /** null = nothing over the skull (bald, mohawk) */
    cap: {
        /** radii multiplier of the shell */
        vol?: number;
        /** moves the shell up (volume on top) */
        lift?: number;
        /** only the part of the skull above this (unit height, -1 … 1) */
        top: number;
        fringe: Fringe;
    } | null;
    /** hair behind and beside the head; `hang` = how far below the head's centre it falls (half-heights) */
    back: { floor: number; ceil?: number; hang?: number; flare?: number; vol?: number } | null;
    blobs?: HairBlob[];
}

export { HAIR_DEFS } from './hairDefs';
import { HAIR_DEFS } from './hairDefs';

export const HAIR_GROUPS: HairGroup[] = ['Short', 'Medium', 'Long', 'Tied up', 'Curly', 'Older'];

/** Fringe outlines: [x, y] in unit head coordinates (x across, y up from the centre). */
export const FRINGES: Record<Fringe, [number, number][]> = {
    none: [],
    straight: [
        [0.55, 0.2],
        [-0.55, 0.2],
        [0, 0.12],
    ],
    low: [
        [0.6, 0.08],
        [-0.6, 0.08],
        [0, 0.02],
        [0.3, 0.05],
        [-0.3, 0.05],
    ],
    side: [
        [0.68, 0.34],
        [-0.55, 0.06],
        [-0.15, 0.14],
        [0.3, 0.26],
    ],
    swept: [
        [0.62, 0.34],
        [-0.55, 0.3],
        [0, 0.4],
    ],
    center: [
        [0.64, 0.1],
        [-0.64, 0.1],
        [0.2, 0.34],
        [-0.2, 0.34],
    ],
    wispy: [
        [0.5, 0.26],
        [-0.5, 0.22],
        [0.18, 0.08],
        [-0.12, 0.16],
        [0.35, 0.14],
    ],
};

/** Does the style have length for a tip colour to show (hanging hair, tails, braids, locks)? */
export const hasTips = (id: HairStyle): boolean => {
    const d = HAIR_DEFS[id];
    return (d.back?.hang ?? 0) > 0.9 || (d.blobs ?? []).some((b) => b.tip);
};

/**
 * The styles that suit a person: by look (masculine styles for men, feminine for women, "any" for all), age (the
 * Older group only from 50, children keep to the simpler styles) and a few that need a grown-up (mohawk, afro
 * stay possible for all).
 */
export function hairPool(female: boolean, age: number): HairStyle[] {
    return (Object.keys(HAIR_DEFS) as HairStyle[]).filter((id) => {
        const d = HAIR_DEFS[id];
        if (female ? d.suits === 'masculine' : d.suits === 'feminine') return false;
        if (d.group === 'Older' && age < 50) return false;
        if (
            age < 13 &&
            (d.group === 'Older' || id === 'balding' || id === 'receding' || id === 'topknot')
        )
            return false;
        return id !== 'bald' || age >= 20;
    });
}
