/**
 * The user's own props (docs/PROPS.md phase 6): SVG or PNG files saved to a library, and prop packs (JSON) to
 * share them. Pure: no React, Fabric or store. Everything read from a file or a pack is validated here, and an
 * SVG is sanitised every time it is read (an entry saved by an older version gets the current rules).
 */
export type UserPropKind = 'svg' | 'png';

export interface UserProp {
    /** `user-` + random: never clashes with a catalogue id */
    id: string;
    label: string;
    kind: UserPropKind;
    /** sanitised SVG text, or a PNG data URL (downscaled at import) */
    data: string;
    width: number;
    height: number;
}

export const MAX_SVG_CHARS = 500_000;
const MAX_PNG_CHARS = 3_000_000;
const MAX_SIDE = 4096;
const USER_ID = /^user-[a-z0-9]{6,32}$/;
const PNG_URL = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

/** A fresh user prop id (crypto random; the props domain never uses Math.random). */
export function newUserPropId(): string {
    const bytes = new Uint8Array(8);
    globalThis.crypto.getRandomValues(bytes);
    return `user-${Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('')}`;
}

import { PROP_PACK_FORMAT, PROP_PACK_VERSION as PACK_VERSION } from './packFormat';

/* ── SVG sanitising ─────────────────────────────────────────────────────────────────────────────── */

/** Drawing elements Fabric's loader reads; anything else (script, foreignObject, image, a, …) is removed. */
const ALLOWED_TAGS = new Set(
    [
        'svg',
        'g',
        'defs',
        'title',
        'desc',
        'path',
        'circle',
        'ellipse',
        'rect',
        'line',
        'polyline',
        'polygon',
        'linearGradient',
        'radialGradient',
        'stop',
        'clipPath',
        'use',
        'text',
        'tspan',
    ].map((t) => t.toLowerCase()),
);

const unsafeValue = (v: string) => /javascript:|data:text|expression\(|url\((?!\s*['"]?#)/i.test(v);

function cleanElement(el: Element) {
    for (const child of [...el.children]) {
        if (!ALLOWED_TAGS.has(child.localName.toLowerCase())) child.remove();
        else cleanElement(child);
    }
    for (const attr of [...el.attributes]) {
        const name = attr.name.toLowerCase();
        const isHref = name === 'href' || name.endsWith(':href');
        if (
            name.startsWith('on') ||
            (isHref && !attr.value.trim().startsWith('#')) ||
            unsafeValue(attr.value)
        )
            el.removeAttribute(attr.name);
    }
}

/** A safe copy of an SVG document (drawing only), or null for anything else or a file that is too big. */
export function sanitizeSvg(text: string): string | null {
    if (typeof text !== 'string' || text.length > MAX_SVG_CHARS) return null;
    if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return null;
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const root = doc.documentElement;
    if (!root || root.localName !== 'svg' || doc.getElementsByTagName('parsererror').length)
        return null;
    cleanElement(root);
    const out = new XMLSerializer().serializeToString(root);
    return out.length <= MAX_SVG_CHARS ? out : null;
}

/* ── Entries and packs ──────────────────────────────────────────────────────────────────────────── */

const size = (v: unknown) =>
    typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= MAX_SIDE ? Math.round(v) : null;

/** A library or pack entry, validated (SVG sanitised again), or null. */
export function parseUserProp(raw: unknown): UserProp | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== 'string' || !USER_ID.test(r.id)) return null;
    const width = size(r.width);
    const height = size(r.height);
    if (!width || !height || typeof r.data !== 'string') return null;
    let data: string | null = null;
    if (r.kind === 'svg') data = sanitizeSvg(r.data);
    else if (r.kind === 'png')
        data = r.data.length <= MAX_PNG_CHARS && PNG_URL.test(r.data) ? r.data : null;
    if (!data) return null;
    const label =
        typeof r.label === 'string' && r.label.trim() ? r.label.trim().slice(0, 60) : 'My prop';
    return { id: r.id, label, kind: r.kind as UserPropKind, data, width, height };
}

export { PROP_PACK_FORMAT, makePropPack } from './packFormat';

/** The props in a pack file; bad entries are skipped and counted. Throws a readable error for other files. */
export function readPropPack(text: string): { props: UserProp[]; skipped: number } {
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        throw new Error('This file is not a prop pack.');
    }
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    if (r.format !== PROP_PACK_FORMAT || !Array.isArray(r.props))
        throw new Error('This file is not a prop pack.');
    if (typeof r.version !== 'number' || r.version > PACK_VERSION)
        throw new Error('This prop pack was made by a newer version of the app.');
    const props: UserProp[] = [];
    let skipped = 0;
    for (const entry of r.props) {
        const p = parseUserProp(entry);
        if (p) props.push(p);
        else skipped++;
    }
    return { props, skipped };
}
