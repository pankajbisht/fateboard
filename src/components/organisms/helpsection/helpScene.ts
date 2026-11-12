/**
 * Tiny picture language for the Help examples: each example draws its board as a list of shapes,
 * each shape appearing at a step (and optionally gone from a later one), so the picture builds up
 * as the steps play. Coordinates are in a 320 × 180 board. Rendered by `ui/ExampleScene.tsx`.
 */

/** A hex color, or a theme token that follows dark mode. */
export type Paint = string;
export const SCENE_TOKENS = ['ink', 'muted', 'page', 'line', 'primary', 'accent'] as const;

export interface SceneStyle {
    fill?: Paint;
    stroke?: Paint;
    /** Stroke width. */
    w?: number;
    dash?: string;
    op?: number;
    /** Colored glow around it (neon). */
    glow?: Paint;
    /** Soft drop shadow. */
    shadow?: boolean;
    /** CSS filter, for the photo filters. */
    filter?: string;
    /** Photo only: repaint it in two colors, [dark, light] (the Duotone filter). */
    tones?: [Paint, Paint];
    /** The stroke draws itself in when it appears (pen, brush, connector). */
    draw?: boolean;
    /** Degrees, around its own center. */
    rot?: number;
    /** Gradient fill instead of `fill`: two colors, linear (with angle) or radial. */
    grad?: { from: Paint; to: Paint; radial?: boolean; angle?: number };
    rx?: number;
    /** Text only. */
    size?: number;
    weight?: number;
    anchor?: 'start' | 'middle' | 'end';
    font?: 'sans' | 'script' | 'serif';
    spacing?: number;
}

export type SceneShape =
    | { kind: 'rect'; x: number; y: number; w: number; h: number }
    | { kind: 'circle'; cx: number; cy: number; r: number }
    | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
    | { kind: 'path'; d: string }
    | { kind: 'text'; x: number; y: number; text: string }
    /** A stand-in photo: a landscape or a portrait, optionally cropped round. */
    | {
          kind: 'photo';
          x: number;
          y: number;
          w: number;
          h: number;
          subject: 'landscape' | 'portrait';
          round?: boolean;
      };

export type SceneDraft = SceneShape & { style: SceneStyle };
export type SceneItem = SceneDraft & { from: number; to?: number };

export const rect = (x: number, y: number, w: number, h: number, style: SceneStyle = {}) =>
    ({ kind: 'rect', x, y, w, h, style }) as SceneDraft;
export const circle = (cx: number, cy: number, r: number, style: SceneStyle = {}) =>
    ({ kind: 'circle', cx, cy, r, style }) as SceneDraft;
export const ellipse = (cx: number, cy: number, rx: number, ry: number, style: SceneStyle = {}) =>
    ({ kind: 'ellipse', cx, cy, rx, ry, style }) as SceneDraft;
export const path = (d: string, style: SceneStyle = {}) =>
    ({ kind: 'path', d, style }) as SceneDraft;
export const text = (x: number, y: number, value: string, style: SceneStyle = {}) =>
    ({ kind: 'text', x, y, text: value, style }) as SceneDraft;
export const photo = (
    x: number,
    y: number,
    w: number,
    h: number,
    subject: 'landscape' | 'portrait' = 'landscape',
    style: SceneStyle & { round?: boolean } = {},
) => {
    const { round, ...rest } = style;
    return { kind: 'photo', x, y, w, h, subject, round, style: rest } as SceneDraft;
};

/** Shapes that appear at step `from` (0 = the first step) and stay. */
export const at = (from: number, ...drafts: SceneDraft[]): SceneItem[] =>
    drafts.map((d) => ({ ...d, from }));

/** Shapes shown from step `from` until step `to` (they are gone at `to`, replaced by something). */
export const during = (from: number, to: number, ...drafts: SceneDraft[]): SceneItem[] =>
    drafts.map((d) => ({ ...d, from, to }));

/** `count` items from an index: copies in a grid, a ring, along a path. */
export const times = (count: number, make: (i: number) => SceneDraft): SceneDraft[] =>
    Array.from({ length: count }, (_, i) => make(i));

/** What is on the board at a step (`step === steps.length` = the result: everything that stays). */
export const visibleAt = (items: readonly SceneItem[], step: number): SceneItem[] =>
    items.filter((item) => item.from <= step && (item.to === undefined || step < item.to));
