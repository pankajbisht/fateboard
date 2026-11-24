/**
 * GIF export settings and limits. No imports on purpose: the Export pane reads these without loading the
 * export runner or the encoder (both load on the first export).
 */
export interface GifSettings {
    loop: boolean;
    /** Floyd–Steinberg: smoother gradients, larger file */
    dither: boolean;
    /** no background; edges are hard (GIF has no partial transparency) */
    transparent: boolean;
}

export const GIF_DEFAULTS: GifSettings = { loop: true, dither: false, transparent: false };

/** Longest GIF (a longer one is huge); the pane turns the button off past it. */
export const GIF_MAX_MS = 30_000;
