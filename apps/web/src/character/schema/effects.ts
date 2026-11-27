import { num, obj, unit } from './coerce';

/**
 * Effects on a character (2026-11-27, owner: "what the wind does to the body: hair, dress; add others like it"): what
 * the air or water does to the hair and the hanging cloth, drawn by render/effects.ts. All 0..1 strengths, 0 = none;
 * optional on the character (saved characters load unchanged, no schema bump). A scene's wind blows on every actor
 * (scene/schema `weather`).
 */
export interface Effects {
    /** how hard the wind blows */
    wind: number;
    /**
     * where it blows to, degrees round the vertical: 0 = toward the character's left (screen right in the front view),
     * 90 = toward its front, 180 = its right, 270 = its back
     */
    windDir: number;
    /** air rushing up (a jump, a fall): hair and skirts lift */
    updraft: number;
    /** a spin: skirts and coats flare out all round, hair swings out */
    twirl: number;
    /** soaked (rain, a swim): hair hangs flat and close, cloth clings and darkens, drops fall */
    wet: number;
}

export const NO_EFFECTS: Effects = { wind: 0, windDir: 0, updraft: 0, twirl: 0, wet: 0 };

/** Effects from anything; undefined when there are none (so a plain character stays without the field). */
export function parseEffects(raw: unknown): Effects | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = obj(raw);
    const e: Effects = {
        wind: unit(o.wind, 0),
        windDir: ((num(o.windDir, 0, -720, 720) % 360) + 360) % 360,
        updraft: unit(o.updraft, 0),
        twirl: unit(o.twirl, 0),
        wet: unit(o.wet, 0),
    };
    return e.wind || e.updraft || e.twirl || e.wet ? e : undefined;
}

/** Whether anything moves or changes (the renderer skips the work otherwise). */
export const hasEffects = (e: Effects | undefined): e is Effects =>
    !!e && (e.wind > 0 || e.updraft > 0 || e.twirl > 0 || e.wet > 0);
