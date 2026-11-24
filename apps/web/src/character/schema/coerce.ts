/**
 * Validation with defaults (the repo's pattern, like `sanitizeSettings`): anything missing, of the wrong type or
 * out of range becomes its default. Shared by the character and scene schemas.
 */
export type Raw = Record<string, unknown>;

export const obj = (v: unknown): Raw =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {};

/** A finite number clamped to lo..hi, else `d`. `+ 0` turns -0 into 0, as JSON does, so parsing is stable. */
export const num = (v: unknown, d: number, lo = -Infinity, hi = Infinity) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) + 0 : d;

export const unit = (v: unknown, d: number) => num(v, d, 0, 1);

export const str = (v: unknown, d: string, max = 80) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : d;

export const pick = <T extends string>(v: unknown, list: readonly T[], d: T): T =>
    list.includes(v as T) ? (v as T) : d;

const HEX = /^#[0-9a-f]{6}$/i;
export const color = (v: unknown, d: string) =>
    typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d;

/** Degrees wrapped to 0..360. */
export const angle = (v: unknown, d: number) => ((num(v, d) % 360) + 360) % 360;
