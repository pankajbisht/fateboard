import type { Ink } from './render/ink';

/**
 * Scene Objects (props library, docs/PROPS.md): manga-style scenery drawn as plain SVG, placed on the page
 * as a Fabric group that keeps its `propData`, so it can be rebuilt with other colours, outline or variant.
 * Pure domain: no React, Fabric or store (board.ts is the Fabric edge).
 */
export type PropCategory =
    | 'nature'
    | 'sky'
    | 'vehicles'
    | 'furniture'
    | 'kitchen'
    | 'street'
    | 'buildings'
    | 'classroom'
    | 'effects'
    | 'japan'
    | 'animals'
    | 'food'
    | 'sports'
    | 'fantasy'
    | 'tech'
    | 'seasons'
    | 'travel'
    | 'backdrops';

export interface PropDef {
    /** kebab-case, stable: saved on the page */
    id: string;
    label: string;
    category: PropCategory;
    /** extra search words */
    tags?: readonly string[];
    /** drawing box in px at 100 % (before the page's creation scale) */
    width: number;
    height: number;
    /** colour slots and their defaults (#rrggbb); shades are derived from them */
    colors: Readonly<Record<string, string>>;
    /** no auto shadow although its category stands on the ground (flat ground, wall-mounted, flying) */
    noShadow?: boolean;
    /** variant names; the first is the default (variants arrive with prop styling) */
    variants?: readonly string[];
    /** the SVG body (shapes only) */
    draw: (k: Ink) => string;
}

/** Manga screentone for a whole prop: light fills become paper, dark ones ink, mid tones this tone. */
export const PROP_TONE_KINDS = ['none', 'dots', 'lines', 'gradient'] as const;
export type PropToneKind = (typeof PROP_TONE_KINDS)[number];
export interface PropTone {
    kind: PropToneKind;
    /** how dark the tone reads, 0.1 … 0.9 */
    density: number;
}

/** Time of day: colour grading for every prop on a page (phase 4). */
export const PROP_LIGHTS = ['day', 'sunset', 'night'] as const;
export type PropLight = (typeof PROP_LIGHTS)[number];

/** What a placed prop keeps (`propData` in CUSTOM_PROPS). Version 1 (later fields are optional when read). */
export interface PropData {
    v: 1;
    propId: string;
    variant: number;
    /** slot overrides only; missing slots use the catalogue default */
    colors: Record<string, string>;
    outline: string;
    outlineWidth: number;
    tone: PropTone;
    light: PropLight;
    /** soft contact shadow under the prop */
    shadow: boolean;
}
