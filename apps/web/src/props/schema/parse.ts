import { getProp } from '../catalog';
import {
    PROP_LIGHTS,
    PROP_TONE_KINDS,
    type PropCategory,
    type PropData,
    type PropDef,
    type PropLight,
    type PropTone,
    type PropToneKind,
} from '../types';

export const PROP_INK = '#141414';
export const PROP_OUTLINE_WIDTH = 3;
const MAX_OUTLINE = 20;

const HEX = /^#[0-9a-f]{6}$/i;
const hex = (v: unknown): string | null =>
    typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : null;

export function defaultPropData(def: PropDef): PropData {
    return {
        v: 1,
        propId: def.id,
        variant: 0,
        colors: {},
        outline: PROP_INK,
        outlineWidth: PROP_OUTLINE_WIDTH,
        tone: { kind: 'none', density: 0.5 },
        light: 'day',
        shadow: false,
    };
}

/** Categories whose props stand on the ground (shadow on when placed); the rest float or fill a panel. */
const GROUNDED: ReadonlySet<PropCategory> = new Set([
    'nature',
    'vehicles',
    'furniture',
    'kitchen',
    'street',
    'buildings',
    'classroom',
    'japan',
    'animals',
    'food',
    'sports',
    'fantasy',
    'tech',
    'seasons',
    'travel',
]);

/** Does a new copy of this prop get a contact shadow? */
export const shadowByDefault = (def: PropDef) => GROUNDED.has(def.category) && !def.noShadow;

function parseTone(raw: unknown): PropTone {
    const r = (raw && typeof raw === 'object' ? raw : {}) as { kind?: unknown; density?: unknown };
    if (!PROP_TONE_KINDS.includes(r.kind as PropToneKind)) return { kind: 'none', density: 0.5 };
    const kind = r.kind as PropToneKind;
    const d = typeof r.density === 'number' && Number.isFinite(r.density) ? r.density : 0.5;
    return { kind, density: Math.min(0.9, Math.max(0.1, Math.round(d * 100) / 100)) };
}

/**
 * Saved prop data read back (a page, a pasted object, an imported file): unknown props are null, unknown
 * slots and bad values are dropped, numbers clamped. Never throws.
 */
export function parsePropData(raw: unknown): PropData | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const def = typeof r.propId === 'string' ? getProp(r.propId) : undefined;
    if (!def) return null;
    const out = defaultPropData(def);
    const variants = def.variants?.length ?? 1;
    if (
        Number.isInteger(r.variant) &&
        (r.variant as number) >= 0 &&
        (r.variant as number) < variants
    )
        out.variant = r.variant as number;
    if (r.colors && typeof r.colors === 'object')
        for (const [slot, value] of Object.entries(r.colors as Record<string, unknown>)) {
            const c = hex(value);
            if (c && slot in def.colors) out.colors[slot] = c;
        }
    out.outline = hex(r.outline) ?? PROP_INK;
    if (typeof r.outlineWidth === 'number' && Number.isFinite(r.outlineWidth))
        out.outlineWidth = Math.min(MAX_OUTLINE, Math.max(0, r.outlineWidth));
    if (r.tone !== undefined) out.tone = parseTone(r.tone);
    if (PROP_LIGHTS.includes(r.light as PropLight)) out.light = r.light as PropLight;
    if (typeof r.shadow === 'boolean') out.shadow = r.shadow;
    return out;
}
