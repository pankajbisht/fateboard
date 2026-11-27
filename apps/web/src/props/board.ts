import * as fabric from 'fabric';
import { DEFAULT_TONE, normalizeTone, tonePatternMatrix, toneTile } from '@/lib/comic/screentone';
import { getProp } from './catalog';
import { propSvg } from './render/propSvg';
import { defaultPropData, parsePropData } from './schema/parse';
import type { PropData, PropLight, PropTone } from './types';
import type { UserProp } from './userProps';

/**
 * A Scene Object on a page (docs/PROPS.md): a Fabric group built from the prop's SVG, carrying `propData`
 * (in CUSTOM_PROPS) so it saves with the page, survives undo and can be rebuilt with other colours, outline
 * or variant. No store import (slices import this module dynamically).
 */
type WithData = fabric.FabricObject & { propData?: unknown };

/** A prop as a centred group, or null for an unknown prop / an empty drawing. */
export async function buildPropObject(
    input: Partial<PropData> & { propId: string },
): Promise<fabric.Group | null> {
    const def = getProp(input.propId);
    if (!def) return null;
    const data = parsePropData({ ...defaultPropData(def), ...input }) ?? defaultPropData(def);
    const loaded = await fabric.loadSVGFromString(propSvg(def, data));
    const objects = (loaded?.objects ?? []).filter(Boolean) as fabric.FabricObject[];
    if (!objects.length) return null;
    if (data.light !== 'day') applyPropLight(objects, data.light, data.outline);
    if (data.tone.kind !== 'none') applyPropTone(objects, data.tone, data.outline);
    const group = new fabric.Group(objects, { originX: 'center', originY: 'center' });
    (group as WithData).propData = { ...data, colors: { ...data.colors }, tone: { ...data.tone } };
    group.set({ name: def.label } as Partial<fabric.FabricObject>);
    return group;
}

/**
 * One of the user's own props as a centred object, at its saved size: an SVG becomes a group (like a catalogue
 * prop, without restyling), a PNG a picture. Named after the prop so the Layers list reads well.
 */
export async function buildUserPropObject(prop: UserProp): Promise<fabric.FabricObject | null> {
    let obj: fabric.FabricObject;
    if (prop.kind === 'svg') {
        const loaded = await fabric.loadSVGFromString(prop.data);
        const objects = (loaded?.objects ?? []).filter(Boolean) as fabric.FabricObject[];
        if (!objects.length) return null;
        obj = new fabric.Group(objects, { originX: 'center', originY: 'center' });
    } else {
        obj = await fabric.FabricImage.fromURL(
            prop.data,
            {},
            { originX: 'center', originY: 'center' },
        );
    }
    obj.set({ name: prop.label } as Partial<fabric.FabricObject>);
    return obj;
}

export const isPropGroup = (o: unknown): o is fabric.Group =>
    o instanceof fabric.Group && !!(o as WithData).propData;

/** The prop on a page object, validated, or null for any other object. */
export const readPropData = (obj: unknown): PropData | null =>
    parsePropData((obj as WithData | null | undefined)?.propData);

/* ── Time of day ──────────────────────────────────────────────────────────────────────────────────── */

/** Colour grading toward a sky tint: sunset warm, night deep blue and darker (the ink outline stays). */
const LIGHTS: Record<
    Exclude<PropLight, 'day'>,
    { tint: [number, number, number]; mix: number; dim: number }
> = {
    sunset: { tint: [255, 138, 76], mix: 0.24, dim: 0.06 },
    night: { tint: [28, 37, 80], mix: 0.52, dim: 0.12 },
};

function applyPropLight(objects: fabric.FabricObject[], light: PropLight, outline: string) {
    if (light === 'day') return;
    const { tint, mix, dim } = LIGHTS[light];
    const grade = (c: string) => {
        try {
            const [r, g, b, a] = new fabric.Color(c).getSource();
            const ch = (v: number, t: number) => Math.round((v + (t - v) * mix) * (1 - dim));
            return new fabric.Color([ch(r, tint[0]), ch(g, tint[1]), ch(b, tint[2]), a])
                .toHex()
                .replace(/^#?/, '#');
        } catch {
            return c;
        }
    };
    for (const o of objects) {
        if (typeof o.fill === 'string' && o.fill && o.fill !== 'none')
            o.set({ fill: grade(o.fill) });
        if (typeof o.stroke === 'string' && o.stroke && o.stroke !== 'none' && o.stroke !== outline)
            o.set({ stroke: grade(o.stroke) });
    }
}

/* ── Manga screentone ─────────────────────────────────────────────────────────────────────────────── */

const PAPER = '#ffffff';
const INK = '#141414';

const lum = (c: string): number | null => {
    try {
        const [r, g, b] = new fabric.Color(c).getSource();
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    } catch {
        return null;
    }
};

/** A flat grey for tone level t (0 = paper … 1 = ink). */
const grey = (t: number) => {
    const v = Math.round(255 * (1 - t))
        .toString(16)
        .padStart(2, '0');
    return `#${v}${v}${v}`;
};

/**
 * Black-and-white manga look (like the Character Studio's manga style): light fills become paper, dark ones
 * ink, mid tones a dot / line screentone (or a soft gradient) as dark as the colour was, scaled by `density`.
 * Without a canvas (tests) a tone falls back to a flat grey of the same level.
 */
function applyPropTone(objects: fabric.FabricObject[], tone: PropTone, outline: string) {
    const made = new Map<number, fabric.Pattern | fabric.Gradient<'linear'> | string>();
    const fillFor = (t: number) => {
        const level = Math.min(0.9, Math.max(0.1, Math.round(t * 10) / 10));
        if (!made.has(level)) {
            if (tone.kind === 'gradient')
                made.set(
                    level,
                    new fabric.Gradient({
                        type: 'linear',
                        gradientUnits: 'percentage',
                        coords: { x1: 0, y1: 0, x2: 0, y2: 1 },
                        colorStops: [
                            { offset: 0, color: grey(level * 0.35) },
                            { offset: 1, color: grey(level) },
                        ],
                    }),
                );
            else {
                const params = normalizeTone({
                    ...DEFAULT_TONE,
                    kind: tone.kind === 'lines' ? 'lines' : 'dots',
                    spacing: 6,
                    density: level,
                });
                const tile =
                    typeof document !== 'undefined' ? toneTile(document, params, PAPER) : null;
                made.set(
                    level,
                    tile
                        ? new fabric.Pattern({
                              source: tile,
                              repeat: 'repeat',
                              patternTransform: tonePatternMatrix(params.angle),
                          })
                        : grey(level),
                );
            }
        }
        return made.get(level)!;
    };
    const grade = (c: string) => {
        const l = lum(c);
        if (l === null) return c;
        if (l >= 0.8) return PAPER;
        if (l <= 0.22) return INK;
        return fillFor((1 - l) * (0.4 + tone.density));
    };
    for (const o of objects) {
        if (typeof o.fill === 'string' && o.fill && o.fill !== 'none')
            o.set({ fill: grade(o.fill) });
        // coloured strokes (rainbow bands, rain) become greys; the ink outline stays
        if (
            typeof o.stroke === 'string' &&
            o.stroke &&
            o.stroke !== 'none' &&
            o.stroke !== outline
        ) {
            const g = grade(o.stroke);
            o.set({
                stroke: typeof g === 'string' ? g : grey(Math.max(0.2, 1 - (lum(o.stroke) ?? 0.5))),
            });
        }
    }
}

/**
 * Restyle in place: puts a freshly built drawing into the SAME group, so the object keeps its identity (id,
 * animation track, notes, connectors, locks, layer, shadow). Same steps as the Character Studio's update.
 */
export function swapPropDrawing(target: fabric.Group, fresh: fabric.Group, data: PropData) {
    fresh.set({
        originX: target.originX,
        originY: target.originY,
        left: target.left,
        top: target.top,
        scaleX: target.scaleX,
        scaleY: target.scaleY,
        angle: target.angle,
        flipX: target.flipX,
        flipY: target.flipY,
        skewX: target.skewX,
        skewY: target.skewY,
    });
    fresh.setCoords();
    const old = [...target.getObjects()];
    target.add(...fresh.getObjects());
    target.remove(...old);
    (target as WithData).propData = { ...data, colors: { ...data.colors }, tone: { ...data.tone } };
    target.set({ dirty: true } as Partial<fabric.Group>);
    target.setCoords();
}
