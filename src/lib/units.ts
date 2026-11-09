/**
 * Settings > Units (BUG-082): one converter for the rulers and every size field. Documents are always
 * stored in px; only what is shown / typed is in the chosen unit. CSS reference: 96 px = 1 in.
 */
export type Unit = 'px' | 'mm' | 'cm' | 'in';

export const PX_PER_UNIT: Record<Unit, number> = {
    px: 1,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
    in: 96,
};

const PRECISION: Record<Unit, number> = { px: 0, mm: 1, cm: 2, in: 2 };

/** Decimals shown in fields and labels for a unit. */
export const unitPrecision = (unit: Unit) => PRECISION[unit] ?? 0;

const round = (v: number, decimals: number) => {
    const f = 10 ** decimals;
    return Math.round(v * f) / f;
};

/** px → unit (not rounded; fields round for display). */
export const toUnit = (px: number, unit: Unit) => px / (PX_PER_UNIT[unit] ?? 1);

/** unit → px (what gets stored). */
export const fromUnit = (value: number, unit: Unit) => value * (PX_PER_UNIT[unit] ?? 1);

/** "1920 × 1080 px", "210.1 × 297.1 mm". */
export function formatSize(widthPx: number, heightPx: number, unit: Unit): string {
    const d = unitPrecision(unit);
    return `${round(toUnit(widthPx, unit), d)} × ${round(toUnit(heightPx, unit), d)} ${unit}`;
}
