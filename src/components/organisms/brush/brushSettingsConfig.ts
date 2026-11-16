/**
 * Brush settings panel (data): every stamp engine setting the panel shows, grouped like Procreate's Brush
 * Studio. Ranges come from STAMP_RANGES; `pct` settings show 0 … 100 %.
 */
import {
    COLOR_MODES,
    DAB_BLENDS,
    STAMP_RANGES,
    TIP_SHAPES,
    type StampParams,
} from '@/lib/brushes/stamp/stampParams';

type NumberKey = keyof typeof STAMP_RANGES;
export type SettingControl =
    | { kind: 'slider'; key: NumberKey; label: string; pct?: boolean; unit?: string; step?: number }
    | { kind: 'switch'; key: 'followStroke' | 'spray'; label: string }
    | {
          kind: 'select';
          key: 'tip' | 'colorMode' | 'blend';
          label: string;
          options: { value: string; label: string }[];
      }
    | { kind: 'color'; key: 'color2'; label: string };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const SETTING_GROUPS: { title: string; controls: SettingControl[] }[] = [
    {
        title: 'Tip',
        controls: [
            {
                kind: 'select',
                key: 'tip',
                label: 'Tip shape',
                options: TIP_SHAPES.map((t) => ({ value: t, label: cap(t) })),
            },
            { kind: 'slider', key: 'hardness', label: 'Hardness', pct: true },
            { kind: 'slider', key: 'roundness', label: 'Roundness', pct: true },
            { kind: 'slider', key: 'angle', label: 'Angle', unit: '°' },
            { kind: 'slider', key: 'angleJitter', label: 'Angle jitter', pct: true },
            { kind: 'switch', key: 'followStroke', label: 'Follow stroke direction' },
            { kind: 'slider', key: 'wetEdges', label: 'Wet edges', pct: true },
        ],
    },
    {
        title: 'Stroke',
        controls: [
            { kind: 'slider', key: 'spacing', label: 'Spacing', pct: true },
            { kind: 'slider', key: 'flow', label: 'Flow', pct: true },
            { kind: 'slider', key: 'scatter', label: 'Scatter', step: 0.1 },
            { kind: 'slider', key: 'count', label: 'Count' },
        ],
    },
    {
        title: 'Dynamics',
        controls: [
            { kind: 'slider', key: 'sizeJitter', label: 'Size jitter', pct: true },
            { kind: 'slider', key: 'opacityJitter', label: 'Opacity jitter', pct: true },
            { kind: 'slider', key: 'pressureSize', label: 'Pressure → size', pct: true },
            { kind: 'slider', key: 'pressureOpacity', label: 'Pressure → opacity', pct: true },
            { kind: 'slider', key: 'velocitySize', label: 'Speed → thinner', pct: true },
            { kind: 'slider', key: 'taperStart', label: 'Taper start', step: 0.5 },
            { kind: 'slider', key: 'taperEnd', label: 'Taper end', step: 0.5 },
            { kind: 'slider', key: 'grow', label: 'Grow along stroke', pct: true },
            { kind: 'slider', key: 'drift', label: 'Rise', pct: true },
        ],
    },
    {
        title: 'Color',
        controls: [
            {
                kind: 'select',
                key: 'colorMode',
                label: 'Color mode',
                options: COLOR_MODES.map((m) => ({ value: m, label: cap(m) })),
            },
            { kind: 'color', key: 'color2', label: 'Second color' },
            { kind: 'slider', key: 'hueJitter', label: 'Hue jitter', pct: true },
            { kind: 'slider', key: 'lightJitter', label: 'Lightness jitter', pct: true },
        ],
    },
    {
        title: 'Texture & glow',
        controls: [
            { kind: 'slider', key: 'grain', label: 'Paper grain', pct: true },
            { kind: 'slider', key: 'screentone', label: 'Screentone', unit: ' px', step: 0.5 },
            { kind: 'slider', key: 'glow', label: 'Glow', pct: true },
            {
                kind: 'select',
                key: 'blend',
                label: 'Dab blending',
                options: DAB_BLENDS.map((b) => ({ value: b, label: cap(b) })),
            },
        ],
    },
    {
        title: 'Spray',
        controls: [
            { kind: 'switch', key: 'spray', label: 'Spray (builds up while still)' },
            { kind: 'slider', key: 'sprayRate', label: 'Spray rate', unit: '/s', step: 10 },
            { kind: 'slider', key: 'particle', label: 'Particle size', pct: true, step: 0.005 },
        ],
    },
];

export type { StampParams };
