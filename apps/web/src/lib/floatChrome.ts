/**
 * Look of the app's floating text bar (FloatingTextToolbar: text boxes, text shapes, sticky notes), in the
 * macOS style: translucent "vibrancy" surface (blur + saturate), hairline border, capsule shape
 * (fully rounded, inner groups are concentric pills), soft layered shadow, 28 px controls, short
 * dividers, a quick fade-in.
 */

/** Tailwind classes for React floats. */
export const FLOAT_BAR_CLASS =
    'flex w-max items-center gap-1.5 whitespace-nowrap rounded-full border border-line/80 bg-surface-raised/85 p-1 px-1.5 text-ink shadow-[0_12px_32px_-10px_rgba(15,23,42,0.32),0_2px_6px_-1px_rgba(15,23,42,0.10)] backdrop-blur-xl backdrop-saturate-150 motion-safe:animate-float-in';

/** Divider between groups. */
export const FLOAT_SEP_CLASS = 'mx-0.5 h-4 w-px shrink-0 bg-line';
