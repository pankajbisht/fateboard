/**
 * fateboard brand colors for code that cannot use Tailwind classes (Fabric objects, canvas 2D
 * drawing, inline styles). Mirrors the `@theme` tokens in src/index.css; a test keeps them in sync.
 * See docs/DESIGN.md.
 *
 * Only for editor chrome (handles, guides, rulers, selection UI). Never use these as default
 * colors for user content.
 */
export const BRAND = {
    /** Fate Blue, logo gradient end. Buttons, active states, handles. (primary-600) */
    primary: '#0a60d6',
    /** Logo gradient start. Highlights, gradients, hover glow. (primary-400) */
    primaryLight: '#22a7ff',
    /** Logo circle fill. Selected rows, soft backgrounds. (primary-100) */
    primaryTint: '#e0f0ff',
    /** Pencil Orange, logo dot. Sparing highlights: badges, "new", recording. (accent-500) */
    accent: '#ff7f0e',
    /** Text on light surfaces. */
    ink: '#0f1b2d',
    /** Destructive actions and the "end" handle of two-point editors. */
    danger: '#dc2626',
} as const;
