import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv, type HSV } from '@/lib/colorMath';
import {
    HARMONIES,
    harmonyColors,
    harmonyTurns,
    isToneHarmony,
    type HarmonyId,
} from '@/lib/colorHarmony';

/**
 * The harmony drawn on the colour wheel. Hue schemes (and Custom) are points on the ring; tone schemes
 * (Shades, Monochromatic) keep the hue, so their points sit on the saturation / brightness square.
 * Custom = hue turns the user dragged (the base, turn 0, is always the first).
 */
export type WheelScheme = 'custom' | HarmonyId;
export type WheelHarmony = { scheme: WheelScheme; custom: number[] };

export const DEFAULT_WHEEL_HARMONY: WheelHarmony = {
    scheme: 'complementary',
    custom: [0, 60, 180, 240],
};

export const WHEEL_SCHEMES: { id: WheelScheme; label: string }[] = [
    { id: 'custom', label: 'Custom' },
    ...HARMONIES.map(({ id, label }) => ({ id, label })),
];

const wrap = (h: number) => ((h % 360) + 360) % 360;
/** A hue turn as -180 … 180 (so Custom turns stay readable). */
export const signedTurn = (t: number) => {
    const w = wrap(t);
    return w > 180 ? w - 360 : w;
};

/** Hue turns of the scheme (base included), or null for a tone scheme. */
export function wheelTurns(h: WheelHarmony): readonly number[] | null {
    if (h.scheme === 'custom') return h.custom;
    return isToneHarmony(h.scheme) ? null : harmonyTurns(h.scheme);
}

export type RingPoint = { index: number; turn: number; h: number; color: string };
export type TonePoint = { index: number; s: number; v: number; color: string; base: boolean };

/** Ring points from the current HSV (not the rounded hex): they follow the thumb and stay put on grays. */
export function ringPoints(hsv: HSV, hex: string, turns: readonly number[]): RingPoint[] {
    return turns.map((turn, index) => {
        const h = wrap(hsv.h + turn);
        return { index, turn, h, color: turn === 0 ? hex : rgbToHex(hsvToRgb({ ...hsv, h })) };
    });
}

/** Tone points: where each colour of the scheme sits on the S / V square. */
export function tonePoints(hex: string, id: HarmonyId): TonePoint[] {
    return harmonyColors(hex, id).map((color, index) => {
        const { s, v } = rgbToHsv(hexToRgb(color) ?? { r: 0, g: 0, b: 0 });
        return { index, s, v, color, base: color === hex };
    });
}

/**
 * The ring points in the order the outline joins them: round the wheel from the base, so a polygon
 * never crosses itself. Analogous is an open arc (left neighbour, base, right neighbour).
 */
export function outline(points: RingPoint[], scheme: WheelScheme) {
    if (scheme === 'analogous') return { closed: false, points };
    const sorted = [...points].sort((a, b) => wrap(a.turn) - wrap(b.turn));
    return { closed: sorted.length > 2, points: sorted };
}
