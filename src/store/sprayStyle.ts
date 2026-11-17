/**
 * Spray tool (Shift + B): a spray can on the stamp engine. Its own options bar (size, flow, particle size,
 * softness, opacity) maps to the library's "Spray paint" brush; it keeps spraying while the pointer is held
 * still. The brush slice builds the brush from `drawingState(state)`, which is `sprayState` while it is active.
 */
import { creationScaleOf } from '@/lib/canvas/creationScale';
import { SPRAY_TOOL_BRUSH } from './brushLibrary';

export type SprayStyle = {
    /** Nozzle diameter at 100 % (screen px on the design board, scene px on the whiteboard). */
    size: number;
    /** 0.05 … 1: how much paint per second. */
    flow: number;
    /** Particle size, px. */
    particle: number;
    /** 0 = hard edge (even disc) … 1 = soft (denser in the middle). */
    softness: number;
    opacity: number;
};

export const DEFAULT_SPRAY_STYLE: SprayStyle = {
    size: 60,
    flow: 0.5,
    particle: 1.5,
    softness: 0.7,
    opacity: 1,
};

export const SPRAY_LIMITS = {
    size: { min: 4, max: 400 },
    flow: { min: 0.05, max: 1 },
    particle: { min: 0.5, max: 16 },
    softness: { min: 0, max: 1 },
    opacity: { min: 0.05, max: 1 },
} as const;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function sanitizeSprayStyle(
    base: SprayStyle,
    patch: Partial<Record<keyof SprayStyle, unknown>>,
): SprayStyle {
    const out = { ...base };
    for (const key of Object.keys(SPRAY_LIMITS) as (keyof SprayStyle)[]) {
        const v = patch[key];
        if (typeof v === 'number' && Number.isFinite(v))
            out[key] = clamp(v, SPRAY_LIMITS[key].min, SPRAY_LIMITS[key].max);
    }
    out.size = Math.round(out.size);
    return out;
}

type SprayInput = Record<string, unknown> & {
    sprayStyle?: unknown;
    stampOverrides?: Record<string, object>;
};

/** The brush settings of the Spray tool. */
export const sprayState = <S extends SprayInput>(s: S): S => {
    const st = (s.sprayStyle as SprayStyle | undefined) ?? DEFAULT_SPRAY_STYLE;
    const width = Math.max(
        1,
        st.size * creationScaleOf(s as Parameters<typeof creationScaleOf>[0]),
    );
    return {
        ...s,
        brush: SPRAY_TOOL_BRUSH,
        width,
        brushOpacity: st.opacity,
        smoothing: 0,
        blend: 'source-over',
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        stampOverrides: {
            ...s.stampOverrides,
            [SPRAY_TOOL_BRUSH]: {
                spray: true,
                sprayRate: 80 + st.flow * 1500,
                particle: clamp(st.particle / st.size, 0.005, 1),
                hardness: 1 - st.softness,
                flow: 0.85,
                pressureSize: 0.4,
            },
        },
    };
};
