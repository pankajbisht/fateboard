// ============================================================
// Font templates: prebuilt, reusable font themes
// A template is a small stack of text styles (heading / subheading / body) that can be
// added to the canvas in one click, or applied to text that is already selected.
// ============================================================

export type FontRole = 'heading' | 'subheading' | 'body';

export type FontTemplateItem = {
    role: FontRole;
    /** Placeholder text used when the template is added to the canvas. */
    text: string;
    fontFamily: string;
    /** Designed for a 1280px wide canvas; scaled automatically for other canvas sizes. */
    fontSize: number;
    fontWeight: number;
    italic?: boolean;
    fill: string;
    uppercase?: boolean;
    /** Fabric charSpacing (thousandths of an em). */
    charSpacing?: number;
    lineHeight?: number;
    textAlign?: 'left' | 'center' | 'right';
    /** Space below this line before the next one (design pixels). */
    gapAfter?: number;
};

export type FontTemplateCategory =
    'Bold' | 'Elegant' | 'Modern' | 'Playful' | 'Retro' | 'Handwritten' | 'Mine';

export type FontTemplate = {
    id: string;
    name: string;
    category: FontTemplateCategory;
    /** Background of the preview card (and a hint for light text). */
    background: string;
    /** Text block width in design pixels. */
    width: number;
    items: FontTemplateItem[];
    /** true for templates the user saved themselves. */
    custom?: boolean;
};

export const FONT_TEMPLATE_CATEGORIES = [
    'All',
    'Bold',
    'Elegant',
    'Modern',
    'Playful',
    'Retro',
    'Handwritten',
    'Mine',
] as const;

export type FontTemplateFilter = (typeof FONT_TEMPLATE_CATEGORIES)[number];

export const FONT_TEMPLATE_CATEGORY_LABELS: Record<FontTemplateFilter, string> = {
    All: 'All',
    Bold: 'Bold',
    Elegant: 'Elegant',
    Modern: 'Modern',
    Playful: 'Playful',
    Retro: 'Retro',
    Handwritten: 'Handwritten',
    Mine: 'My templates',
};

/** The canvas width the template sizes were designed for. */
export const REFERENCE_WIDTH = 1280;

const HEADING = 'Add a heading';
const SUB = 'Add a subheading';
const BODY = 'Add a little bit of body text to describe your idea.';

export const FONT_TEMPLATES: FontTemplate[] = [
    {
        id: 'modern-bold',
        name: 'Modern Bold',
        category: 'Bold',
        background: '#ffffff',
        width: 760,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'Montserrat',
                fontSize: 72,
                fontWeight: 800,
                fill: '#111827',
                uppercase: true,
                lineHeight: 1.05,
                gapAfter: 14,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'Montserrat',
                fontSize: 28,
                fontWeight: 600,
                fill: '#2563eb',
                gapAfter: 12,
            },
            {
                role: 'body',
                text: BODY,
                fontFamily: 'Open Sans',
                fontSize: 20,
                fontWeight: 400,
                fill: '#4b5563',
                lineHeight: 1.45,
            },
        ],
    },
    {
        id: 'impact-title',
        name: 'Impact Title',
        category: 'Bold',
        background: '#0f172a',
        width: 900,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'Anton',
                fontSize: 110,
                fontWeight: 400,
                fill: '#facc15',
                uppercase: true,
                lineHeight: 1,
                gapAfter: 10,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'Bebas Neue',
                fontSize: 44,
                fontWeight: 400,
                fill: '#ffffff',
                charSpacing: 80,
            },
        ],
    },
    {
        id: 'elegant-serif',
        name: 'Elegant Serif',
        category: 'Elegant',
        background: '#faf7f2',
        width: 760,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'Playfair Display',
                fontSize: 68,
                fontWeight: 700,
                fill: '#1c1917',
                lineHeight: 1.1,
                gapAfter: 10,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'Cormorant Garamond',
                fontSize: 34,
                fontWeight: 500,
                italic: true,
                fill: '#78716c',
                gapAfter: 12,
            },
            {
                role: 'body',
                text: BODY,
                fontFamily: 'Lora',
                fontSize: 20,
                fontWeight: 400,
                fill: '#44403c',
                lineHeight: 1.5,
            },
        ],
    },
    {
        id: 'luxury-gold',
        name: 'Luxury Gold',
        category: 'Elegant',
        background: '#0c0a09',
        width: 760,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'Cinzel',
                fontSize: 60,
                fontWeight: 600,
                fill: '#fde68a',
                charSpacing: 120,
                textAlign: 'center',
                gapAfter: 12,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'Cormorant Garamond',
                fontSize: 32,
                fontWeight: 500,
                italic: true,
                fill: '#d6d3d1',
                textAlign: 'center',
                gapAfter: 12,
            },
            {
                role: 'body',
                text: BODY,
                fontFamily: 'Raleway',
                fontSize: 18,
                fontWeight: 300,
                fill: '#a8a29e',
                charSpacing: 100,
                textAlign: 'center',
                lineHeight: 1.6,
            },
        ],
    },
    {
        id: 'editorial',
        name: 'Editorial',
        category: 'Elegant',
        background: '#ffffff',
        width: 780,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'DM Serif Display',
                fontSize: 76,
                fontWeight: 400,
                fill: '#18181b',
                lineHeight: 1.05,
                gapAfter: 14,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'Inter',
                fontSize: 18,
                fontWeight: 500,
                fill: '#dc2626',
                uppercase: true,
                charSpacing: 300,
                gapAfter: 12,
            },
            {
                role: 'body',
                text: BODY,
                fontFamily: 'Inter',
                fontSize: 20,
                fontWeight: 400,
                fill: '#52525b',
                lineHeight: 1.55,
            },
        ],
    },
    {
        id: 'clean-minimal',
        name: 'Clean Minimal',
        category: 'Modern',
        background: '#fafafa',
        width: 760,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'Poppins',
                fontSize: 60,
                fontWeight: 600,
                fill: '#0a0a0a',
                lineHeight: 1.1,
                gapAfter: 12,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'Poppins',
                fontSize: 26,
                fontWeight: 400,
                fill: '#737373',
                gapAfter: 10,
            },
            {
                role: 'body',
                text: BODY,
                fontFamily: 'Poppins',
                fontSize: 18,
                fontWeight: 300,
                fill: '#525252',
                lineHeight: 1.6,
            },
        ],
    },
    {
        id: 'tech-mono',
        name: 'Tech Mono',
        category: 'Modern',
        background: '#0b1120',
        width: 800,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'Space Grotesk',
                fontSize: 64,
                fontWeight: 700,
                fill: '#e2e8f0',
                lineHeight: 1.1,
                gapAfter: 12,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'JetBrains Mono',
                fontSize: 24,
                fontWeight: 500,
                fill: '#4ade80',
                gapAfter: 12,
            },
            {
                role: 'body',
                text: BODY,
                fontFamily: 'Inter',
                fontSize: 19,
                fontWeight: 400,
                fill: '#94a3b8',
                lineHeight: 1.5,
            },
        ],
    },
    {
        id: 'corporate',
        name: 'Corporate',
        category: 'Modern',
        background: '#eff6ff',
        width: 780,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'Roboto Slab',
                fontSize: 56,
                fontWeight: 700,
                fill: '#1e3a8a',
                lineHeight: 1.15,
                gapAfter: 12,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'Roboto',
                fontSize: 26,
                fontWeight: 500,
                fill: '#475569',
                gapAfter: 10,
            },
            {
                role: 'body',
                text: BODY,
                fontFamily: 'Roboto',
                fontSize: 18,
                fontWeight: 400,
                fill: '#64748b',
                lineHeight: 1.55,
            },
        ],
    },
    {
        id: 'playful-pop',
        name: 'Playful Pop',
        category: 'Playful',
        background: '#fef9c3',
        width: 760,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'Fredoka',
                fontSize: 72,
                fontWeight: 700,
                fill: '#ea580c',
                lineHeight: 1.05,
                gapAfter: 12,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'Fredoka',
                fontSize: 30,
                fontWeight: 500,
                fill: '#db2777',
                gapAfter: 10,
            },
            {
                role: 'body',
                text: BODY,
                fontFamily: 'Nunito',
                fontSize: 20,
                fontWeight: 600,
                fill: '#78350f',
                lineHeight: 1.5,
            },
        ],
    },
    {
        id: 'soft-pastel',
        name: 'Soft Pastel',
        category: 'Playful',
        background: '#fdf2f8',
        width: 760,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'Abril Fatface',
                fontSize: 72,
                fontWeight: 400,
                fill: '#9d174d',
                lineHeight: 1.05,
                gapAfter: 12,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'Josefin Sans',
                fontSize: 26,
                fontWeight: 400,
                fill: '#be185d',
                uppercase: true,
                charSpacing: 150,
                gapAfter: 10,
            },
            {
                role: 'body',
                text: BODY,
                fontFamily: 'Josefin Sans',
                fontSize: 20,
                fontWeight: 300,
                fill: '#831843',
                lineHeight: 1.55,
            },
        ],
    },
    {
        id: 'retro-poster',
        name: 'Retro Poster',
        category: 'Retro',
        background: '#fef3c7',
        width: 820,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'Bebas Neue',
                fontSize: 96,
                fontWeight: 400,
                fill: '#b91c1c',
                uppercase: true,
                charSpacing: 50,
                lineHeight: 1,
                gapAfter: 10,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'Oswald',
                fontSize: 28,
                fontWeight: 400,
                fill: '#78350f',
                uppercase: true,
                charSpacing: 200,
                gapAfter: 10,
            },
            {
                role: 'body',
                text: BODY,
                fontFamily: 'Roboto Condensed',
                fontSize: 20,
                fontWeight: 400,
                fill: '#57534e',
                lineHeight: 1.5,
            },
        ],
    },
    {
        id: 'handwritten-notes',
        name: 'Handwritten Notes',
        category: 'Handwritten',
        background: '#fff7ed',
        width: 760,
        items: [
            {
                role: 'heading',
                text: HEADING,
                fontFamily: 'Pacifico',
                fontSize: 64,
                fontWeight: 400,
                fill: '#be185d',
                lineHeight: 1.2,
                gapAfter: 10,
            },
            {
                role: 'subheading',
                text: SUB,
                fontFamily: 'Caveat',
                fontSize: 38,
                fontWeight: 600,
                fill: '#7c2d12',
                gapAfter: 10,
            },
            {
                role: 'body',
                text: BODY,
                fontFamily: 'Quicksand',
                fontSize: 20,
                fontWeight: 500,
                fill: '#57534e',
                lineHeight: 1.5,
            },
        ],
    },
];
