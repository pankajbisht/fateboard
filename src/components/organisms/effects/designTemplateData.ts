import type { DesignTemplate } from './designTemplate.types';

type TemplateObjects = DesignTemplate['objects'];
type TemplateObject = TemplateObjects[number];

/* ------------------------------------------------------------------ *
 *  LAYOUT HELPERS
 *  Every template below is built from these so that positions are
 *  computed (centered, aligned) instead of guessed.
 * ------------------------------------------------------------------ */

const FONT = 'Arial';
const CLEAR = 'rgba(0,0,0,0)';

// Fabric's single-line text box is ~1.13 x fontSize tall.
const LINE_BOX = 1.13;

// Top offset that vertically centers one line of text inside a box.
const textTop = (boxTop: number, boxHeight: number, fontSize: number) =>
    Math.round(boxTop + (boxHeight - fontSize * LINE_BOX) / 2);

const rect = (o: {
    id: string;
    left: number;
    top: number;
    width: number;
    height: number;
    fill: string;
    stroke?: string;
    strokeWidth?: number;
    radius?: number;
    locked?: boolean; // non-interactive decoration
}): TemplateObject =>
    ({
        id: o.id,
        type: 'rect',
        left: o.left,
        top: o.top,
        width: o.width,
        height: o.height,
        fill: o.fill,
        ...(o.stroke ? { stroke: o.stroke, strokeWidth: o.strokeWidth ?? 2 } : {}),
        ...(o.radius !== undefined ? { rx: o.radius, ry: o.radius } : {}),
        ...(o.locked ? { selectable: false, evented: false } : {}),
    }) as TemplateObject;

// Circle positioned by its CENTER (Fabric uses top-left of the bounding box).
const circle = (o: {
    id: string;
    cx: number;
    cy: number;
    r: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
}): TemplateObject =>
    ({
        id: o.id,
        type: 'circle',
        left: o.cx - o.r,
        top: o.cy - o.r,
        radius: o.r,
        fill: o.fill ?? CLEAR,
        ...(o.stroke ? { stroke: o.stroke, strokeWidth: o.strokeWidth ?? 2 } : {}),
        selectable: false,
        evented: false,
    }) as TemplateObject;

const photo = (o: {
    id: string;
    src: string;
    left: number;
    top: number;
    width: number;
    height: number;
    radius?: number;
    locked?: boolean;
}): TemplateObject =>
    ({
        id: o.id,
        type: 'image',
        src: o.src,
        left: o.left,
        top: o.top,
        width: o.width,
        height: o.height,
        fit: 'cover',
        ...(o.radius !== undefined ? { rx: o.radius, ry: o.radius } : {}),
        selectable: false,
        evented: false,
        ...(o.locked ? { locked: true } : {}),
    }) as TemplateObject;

const txt = (o: {
    id: string;
    text: string;
    left: number;
    top: number;
    width?: number;
    size: number;
    weight?: number;
    fill: string;
    align?: 'left' | 'center' | 'right';
    font?: string;
    spacing?: number;
    lineHeight?: number;
}): TemplateObject =>
    ({
        id: o.id,
        type: 'text',
        text: o.text,
        left: o.left,
        top: o.top,
        ...(o.width !== undefined ? { width: o.width } : {}),
        fontFamily: o.font ?? FONT,
        fontSize: o.size,
        fontWeight: o.weight ?? 700,
        fill: o.fill,
        textAlign: o.align ?? 'left',
        ...(o.spacing !== undefined ? { charSpacing: o.spacing } : {}),
        ...(o.lineHeight !== undefined ? { lineHeight: o.lineHeight } : {}),
    }) as TemplateObject;

// Pill / button with its label perfectly centered.
const pill = (o: {
    id: string;
    left: number;
    top: number;
    width: number;
    height: number;
    label: string;
    size: number;
    fill: string;
    color: string;
    stroke?: string;
    strokeWidth?: number;
    radius?: number;
    spacing?: number;
    weight?: number;
    font?: string;
}): TemplateObjects =>
    [
        rect({
            id: o.id,
            left: o.left,
            top: o.top,
            width: o.width,
            height: o.height,
            fill: o.fill,
            stroke: o.stroke,
            strokeWidth: o.strokeWidth,
            radius: o.radius ?? o.height / 2,
        }),
        txt({
            id: `${o.id}-text`,
            text: o.label,
            left: o.left,
            top: textTop(o.top, o.height, o.size),
            width: o.width,
            size: o.size,
            weight: o.weight ?? 800,
            fill: o.color,
            align: 'center',
            spacing: o.spacing,
            font: o.font,
        }),
    ] as TemplateObjects;

/**
 * Fake a smooth gradient with stacked, shrinking translucent rects.
 * direction = the edge where the overlay is DARKEST.
 * More steps = less visible banding.
 */
const fade = (opts: {
    id: string;
    direction: 'left' | 'right' | 'top' | 'bottom';
    width: number;
    height: number;
    left?: number;
    top?: number;
    color?: string; // "r,g,b"
    maxAlpha?: number;
    steps?: number;
}): TemplateObjects => {
    const {
        id,
        direction,
        width,
        height,
        left = 0,
        top = 0,
        color = '0,0,0',
        maxAlpha = 0.85,
        steps = 22,
    } = opts;

    // per-layer alpha so all layers together reach maxAlpha at the edge
    const alpha = (1 - Math.pow(1 - maxAlpha, 1 / steps)).toFixed(3);

    return Array.from({ length: steps }, (_, i) => {
        const f = 1 - i / steps;
        let x = left;
        let y = top;
        let w = width;
        let h = height;

        if (direction === 'left') w = Math.round(width * f);
        if (direction === 'right') {
            w = Math.round(width * f);
            x = left + width - w;
        }
        if (direction === 'top') h = Math.round(height * f);
        if (direction === 'bottom') {
            h = Math.round(height * f);
            y = top + height - h;
        }

        return rect({
            id: `${id}-${i}`,
            left: x,
            top: y,
            width: w,
            height: h,
            fill: `rgba(${color},${alpha})`,
            locked: true,
        });
    }) as TemplateObjects;
};

/*
 * Layout rules used everywhere:
 *  - M  = outer margin, every left-aligned element starts on it
 *  - big display text is nudged left by OPTICAL so its letter edge
 *    lines up with the small elements (large glyphs have side bearing)
 *  - nothing important sits in the bottom-right of a YouTube thumbnail
 *    (YouTube draws the duration badge there)
 */
const OPTICAL = -6;

export const DESIGN_TEMPLATES: DesignTemplate[] = [
    // =========================================================
    // YOUTUBE  (1280 x 720)
    // =========================================================

    {
        id: 'yt-history-dark',
        name: 'History Documentary',
        category: 'YouTube',
        sizeId: 'youtube-thumbnail',

        thumbnail: '/template/history-dark.jpg',
        preview: '/template/history-dark.jpg',

        description:
            'Dark cinematic documentary-style YouTube thumbnail for history and storytelling content.',

        tags: ['history', 'documentary', 'dark', 'cinematic'],

        featured: true,

        objects: [
            photo({
                id: 'background',
                src: '/template/morning.jpg',
                left: 0,
                top: 0,
                width: 1280,
                height: 720,
                locked: true,
            }),
            rect({
                id: 'dark-overlay',
                left: 0,
                top: 0,
                width: 1280,
                height: 720,
                fill: 'rgba(0,0,0,0.22)',
                locked: true,
            }),
            ...fade({
                id: 'fade-left',
                direction: 'left',
                width: 900,
                height: 720,
                maxAlpha: 0.9,
            }),
            ...fade({
                id: 'fade-bottom',
                direction: 'bottom',
                width: 1280,
                height: 220,
                maxAlpha: 0.8,
            }),

            // glow ring: fully inside the canvas, clear of the text column
            circle({
                id: 'ring',
                cx: 1000,
                cy: 360,
                r: 220,
                fill: 'rgba(249,115,22,0.07)',
                stroke: 'rgba(249,115,22,0.55)',
                strokeWidth: 3,
            }),

            ...pill({
                id: 'badge',
                left: 80,
                top: 140,
                width: 200,
                height: 44,
                label: 'EPISODE 01',
                size: 18,
                fill: '#f97316',
                color: '#111111',
                spacing: 120,
            }),

            txt({
                id: 'title-1',
                text: 'THE UNTOLD',
                left: 80 + OPTICAL,
                top: 215,
                width: 760,
                size: 104,
                weight: 900,
                fill: '#ffffff',
            }),
            txt({
                id: 'title-2',
                text: 'HISTORY',
                left: 80 + OPTICAL,
                top: 315,
                width: 760,
                size: 150,
                weight: 900,
                fill: '#f97316',
            }),

            rect({
                id: 'rule',
                left: 80,
                top: 480,
                width: 120,
                height: 6,
                fill: '#f97316',
            }),
            txt({
                id: 'subtitle',
                text: 'A STORY THAT CHANGED EVERYTHING',
                left: 80,
                top: 505,
                width: 760,
                size: 28,
                fill: '#fde7d3',
                spacing: 60,
            }),

            txt({
                id: 'small-text',
                text: 'HISTORY • WAR • CULTURE',
                left: 80,
                top: 656,
                size: 18,
                fill: '#ffffff',
                spacing: 140,
            }),
        ],
    },

    {
        id: 'yt-warrior',
        name: 'Warrior Story',
        category: 'YouTube',
        sizeId: 'youtube-thumbnail',

        thumbnail: '/template/flower.jpg',
        preview: '/template/flower.jpg',

        description:
            'Bold cinematic template for warriors, battles, martial arts and historical stories.',

        tags: ['warrior', 'samurai', 'martial arts', 'battle'],

        featured: true,

        objects: [
            photo({
                id: 'background',
                src: '/template/night.jpg',
                left: 0,
                top: 0,
                width: 1280,
                height: 720,
                locked: true,
            }),
            rect({
                id: 'gradient',
                left: 0,
                top: 0,
                width: 1280,
                height: 720,
                fill: 'rgba(0,0,0,0.25)',
                locked: true,
            }),
            ...fade({
                id: 'fade-left',
                direction: 'left',
                width: 900,
                height: 720,
                color: '18,0,0',
                maxAlpha: 0.94,
            }),
            ...fade({
                id: 'fade-bottom',
                direction: 'bottom',
                width: 1280,
                height: 200,
                color: '18,0,0',
                maxAlpha: 0.75,
            }),

            // concentric "rising sun" rings, centered together
            circle({
                id: 'ring-outer',
                cx: 1010,
                cy: 360,
                r: 240,
                fill: 'rgba(239,68,68,0.10)',
                stroke: '#ef4444',
                strokeWidth: 4,
            }),
            circle({
                id: 'ring-inner',
                cx: 1010,
                cy: 360,
                r: 160,
                stroke: 'rgba(255,255,255,0.35)',
                strokeWidth: 2,
            }),

            txt({
                id: 'title-1',
                text: 'THE LAST',
                left: 80 + OPTICAL,
                top: 135,
                width: 700,
                size: 100,
                weight: 900,
                fill: '#ffffff',
            }),
            txt({
                id: 'title-2',
                text: 'WARRIOR',
                left: 80 + OPTICAL,
                top: 225,
                width: 700,
                size: 140,
                weight: 900,
                fill: '#ef4444',
            }),

            rect({
                id: 'accent',
                left: 80,
                top: 390,
                width: 240,
                height: 8,
                fill: '#ef4444',
            }),
            txt({
                id: 'subtitle',
                text: 'THE BATTLE THAT ENDED AN ERA',
                left: 80,
                top: 420,
                width: 700,
                size: 30,
                weight: 800,
                fill: '#ffffff',
                spacing: 40,
            }),

            ...pill({
                id: 'badge',
                left: 80,
                top: 505,
                width: 220,
                height: 56,
                label: 'TRUE STORY',
                size: 22,
                weight: 900,
                fill: '#ef4444',
                color: '#ffffff',
                radius: 12,
                spacing: 100,
            }),
            ...pill({
                id: 'badge-outline',
                left: 320,
                top: 505,
                width: 220,
                height: 56,
                label: 'EPIC FINALE',
                size: 22,
                weight: 900,
                fill: CLEAR,
                color: '#ffffff',
                stroke: '#ffffff',
                strokeWidth: 3,
                radius: 12,
                spacing: 100,
            }),
        ],
    },

    {
        id: 'yt-minimal',
        name: 'Minimal Creator',
        category: 'YouTube',
        sizeId: 'youtube-thumbnail',

        thumbnail: '/template/mountain.jpg',
        preview: '/template/mountain.jpg',

        description: 'Clean modern YouTube thumbnail with strong typography.',

        tags: ['minimal', 'modern', 'clean', 'creator'],

        objects: [
            rect({
                id: 'background',
                left: 0,
                top: 0,
                width: 1280,
                height: 720,
                fill: '#0b1020',
                locked: true,
            }),

            // glow sits fully inside the canvas
            circle({
                id: 'glow',
                cx: 300,
                cy: 360,
                r: 300,
                fill: 'rgba(99,102,241,0.14)',
            }),

            photo({
                id: 'image',
                src: '/template/morning.jpg',
                left: 700,
                top: 0,
                width: 580,
                height: 720,
            }),
            // blend the photo into the dark background
            ...fade({
                id: 'image-blend',
                direction: 'left',
                left: 700,
                width: 320,
                height: 720,
                color: '11,16,32',
                maxAlpha: 1,
            }),

            rect({
                id: 'accent',
                left: 80,
                top: 160,
                width: 90,
                height: 12,
                fill: '#818cf8',
            }),
            txt({
                id: 'title-1',
                text: 'CREATE',
                left: 80 + OPTICAL,
                top: 190,
                width: 620,
                size: 140,
                weight: 900,
                fill: '#ffffff',
            }),
            txt({
                id: 'title-2',
                text: 'BETTER',
                left: 80 + OPTICAL,
                top: 315,
                width: 620,
                size: 140,
                weight: 900,
                fill: '#818cf8',
            }),

            // feature chips: 16px gaps, labels centered
            ...pill({
                id: 'chip-1',
                left: 80,
                top: 490,
                width: 150,
                height: 52,
                label: 'SIMPLE',
                size: 20,
                weight: 700,
                fill: CLEAR,
                color: '#c7d2fe',
                stroke: '#818cf8',
                spacing: 80,
            }),
            ...pill({
                id: 'chip-2',
                left: 246,
                top: 490,
                width: 120,
                height: 52,
                label: 'FAST',
                size: 20,
                weight: 700,
                fill: CLEAR,
                color: '#c7d2fe',
                stroke: '#818cf8',
                spacing: 80,
            }),
            ...pill({
                id: 'chip-3',
                left: 382,
                top: 490,
                width: 190,
                height: 52,
                label: 'POWERFUL',
                size: 20,
                fill: '#6366f1',
                color: '#ffffff',
                spacing: 80,
            }),
        ],
    },

    // =========================================================
    // INSTAGRAM  (1080 x 1080)
    // =========================================================

    {
        id: 'instagram-modern',
        name: 'Modern Social Post',
        category: 'Instagram',
        sizeId: 'instagram-post',

        thumbnail: '/template/instagram-modern.jpg',
        preview: '/template/instagram-modern.jpg',

        description: 'Modern square social media composition.',

        tags: ['instagram', 'social', 'modern', 'square'],

        featured: true,

        objects: [
            photo({
                id: 'background',
                src: '/template/girl.jpg',
                left: 0,
                top: 0,
                width: 1080,
                height: 1080,
            }),
            rect({
                id: 'overlay',
                left: 0,
                top: 0,
                width: 1080,
                height: 1080,
                fill: 'rgba(0,0,0,0.18)',
                locked: true,
            }),
            ...fade({
                id: 'fade-bottom',
                direction: 'bottom',
                width: 1080,
                height: 700,
                maxAlpha: 0.9,
            }),

            // thin inset frame
            rect({
                id: 'frame',
                left: 40,
                top: 40,
                width: 1000,
                height: 1000,
                fill: CLEAR,
                stroke: 'rgba(255,255,255,0.4)',
                strokeWidth: 2,
                locked: true,
            }),

            ...pill({
                id: 'tag',
                left: 80,
                top: 80,
                width: 190,
                height: 48,
                label: 'FEATURED',
                size: 20,
                fill: '#facc15',
                color: '#111111',
                spacing: 120,
            }),

            // three separate lines = predictable spacing, no overlap
            txt({
                id: 'title-1',
                text: 'MAKE',
                left: 80 + OPTICAL,
                top: 521,
                width: 940,
                size: 120,
                weight: 900,
                fill: '#ffffff',
            }),
            txt({
                id: 'title-2',
                text: 'SOMETHING',
                left: 80 + OPTICAL,
                top: 635,
                width: 940,
                size: 120,
                weight: 900,
                fill: '#ffffff',
            }),
            txt({
                id: 'title-accent',
                text: 'GREAT.',
                left: 80 + OPTICAL,
                top: 744,
                width: 940,
                size: 150,
                weight: 900,
                fill: '#facc15',
            }),

            rect({
                id: 'line',
                left: 80,
                top: 910,
                width: 120,
                height: 6,
                fill: '#ffffff',
            }),
            txt({
                id: 'caption',
                text: 'YOUR BRAND • YOUR STORY',
                left: 80,
                top: 940,
                size: 22,
                fill: '#ffffff',
                spacing: 120,
            }),
        ],
    },

    {
        id: 'instagram-quote',
        name: 'Quote Card',
        category: 'Instagram',
        sizeId: 'instagram-post',

        thumbnail: '/template/instagram-quote.jpg',
        preview: '/template/instagram-quote.jpg',

        description: 'Elegant quote design for social media.',

        tags: ['quote', 'instagram', 'motivation'],

        objects: [
            rect({
                id: 'background',
                left: 0,
                top: 0,
                width: 1080,
                height: 1080,
                fill: '#f6f3ee',
                locked: true,
            }),

            // decorative circles kept INSIDE the frame
            circle({ id: 'circle-large', cx: 840, cy: 250, r: 180, fill: '#e0e7ff' }),
            circle({ id: 'circle-small', cx: 200, cy: 880, r: 120, fill: '#fde68a' }),

            rect({
                id: 'frame',
                left: 50,
                top: 50,
                width: 980,
                height: 980,
                fill: CLEAR,
                stroke: '#1e1b4b',
                strokeWidth: 2,
                locked: true,
            }),

            txt({
                id: 'quote-mark',
                text: '“',
                left: 100,
                top: 230,
                width: 880,
                size: 300,
                font: 'Georgia',
                fill: '#6366f1',
                align: 'center',
            }),
            txt({
                id: 'quote',
                text: 'The journey\nis the story.',
                left: 100,
                top: 450,
                width: 880,
                size: 84,
                font: 'Georgia',
                fill: '#1e1b4b',
                align: 'center',
                lineHeight: 1.15,
            }),

            rect({
                id: 'divider',
                left: 490,
                top: 710,
                width: 100,
                height: 5,
                fill: '#6366f1',
            }),
            txt({
                id: 'author',
                text: 'YOUR NAME',
                left: 100,
                top: 750,
                width: 880,
                size: 24,
                fill: '#4338ca',
                align: 'center',
                spacing: 160,
            }),
        ],
    },

    // =========================================================
    // POSTER  (1080 x 1350)
    // =========================================================

    {
        id: 'poster-cinematic',
        name: 'Cinematic Poster',
        category: 'Poster',
        sizeId: 'poster',

        thumbnail: '/template/morning.jpg',
        preview: '/template/morning.jpg',

        description: 'Cinematic poster layout for events, stories and campaigns.',

        tags: ['poster', 'cinematic', 'event'],

        featured: true,

        objects: [
            photo({
                id: 'background',
                src: '/template/morning.jpg',
                left: 0,
                top: 0,
                width: 1080,
                height: 1350,
            }),
            rect({
                id: 'overlay',
                left: 0,
                top: 0,
                width: 1080,
                height: 1350,
                fill: 'rgba(0,0,0,0.2)',
                locked: true,
            }),
            ...fade({
                id: 'fade-bottom',
                direction: 'bottom',
                width: 1080,
                height: 880,
                maxAlpha: 0.96,
            }),
            ...fade({
                id: 'fade-top',
                direction: 'top',
                width: 1080,
                height: 280,
                maxAlpha: 0.65,
            }),

            // gold frame
            rect({
                id: 'frame',
                left: 40,
                top: 40,
                width: 1000,
                height: 1270,
                fill: CLEAR,
                stroke: 'rgba(251,191,36,0.6)',
                strokeWidth: 2,
                locked: true,
            }),

            txt({
                id: 'eyebrow',
                text: 'AN EXTRAORDINARY STORY',
                left: 80,
                top: 105,
                width: 920,
                size: 20,
                fill: '#fbbf24',
                align: 'center',
                spacing: 220,
            }),
            rect({
                id: 'eyebrow-line',
                left: 490,
                top: 148,
                width: 100,
                height: 3,
                fill: '#fbbf24',
            }),

            txt({
                id: 'title-small',
                text: 'THE',
                left: 80,
                top: 840,
                width: 920,
                size: 54,
                weight: 400,
                font: 'Georgia',
                fill: '#fbbf24',
                align: 'center',
                spacing: 300,
            }),
            txt({
                id: 'title',
                text: 'LEGEND',
                left: 60,
                top: 880,
                width: 960,
                size: 200,
                weight: 900,
                fill: '#ffffff',
                align: 'center',
            }),

            rect({
                id: 'line',
                left: 450,
                top: 1085,
                width: 180,
                height: 6,
                fill: '#fbbf24',
            }),
            txt({
                id: 'description',
                text: 'A STORY OF COURAGE,\nHONOR AND SACRIFICE.',
                left: 80,
                top: 1115,
                width: 920,
                size: 30,
                weight: 600,
                fill: '#ffffff',
                align: 'center',
                lineHeight: 1.25,
                spacing: 60,
            }),
            txt({
                id: 'footer',
                text: '2026 • ORIGINAL DOCUMENTARY',
                left: 80,
                top: 1245,
                width: 920,
                size: 17,
                weight: 600,
                fill: '#d1d5db',
                align: 'center',
                spacing: 140,
            }),
        ],
    },

    // =========================================================
    // PRESENTATION  (1920 x 1080)
    // =========================================================

    {
        id: 'presentation-business',
        name: 'Business Presentation',
        category: 'Presentation',
        sizeId: 'presentation',

        thumbnail: '/template/presentation-business.jpg',
        preview: '/template/presentation-business.jpg',

        description: 'Professional presentation cover.',

        tags: ['business', 'presentation', 'corporate'],

        objects: [
            rect({
                id: 'background',
                left: 0,
                top: 0,
                width: 1920,
                height: 1080,
                fill: '#0b1120',
                locked: true,
            }),

            // concentric circles, same center, all inside the slide
            circle({
                id: 'circle-ring',
                cx: 1500,
                cy: 540,
                r: 420,
                stroke: 'rgba(165,180,252,0.22)',
                strokeWidth: 2,
            }),
            circle({ id: 'circle-big', cx: 1500, cy: 540, r: 330, fill: 'rgba(99,102,241,0.12)' }),
            circle({ id: 'circle-mid', cx: 1500, cy: 540, r: 200, fill: 'rgba(99,102,241,0.2)' }),

            rect({
                id: 'accent',
                left: 0,
                top: 0,
                width: 28,
                height: 1080,
                fill: '#6366f1',
                locked: true,
            }),

            txt({
                id: 'small',
                text: 'PRESENTATION  /  2026',
                left: 140,
                top: 250,
                size: 26,
                fill: '#a5b4fc',
                spacing: 160,
            }),

            txt({
                id: 'title-1',
                text: 'YOUR BIG',
                left: 140 + OPTICAL,
                top: 350,
                width: 1000,
                size: 150,
                weight: 900,
                fill: '#ffffff',
            }),
            txt({
                id: 'title-2',
                text: 'IDEA',
                left: 140 + OPTICAL,
                top: 485,
                width: 1000,
                size: 150,
                weight: 900,
                fill: '#818cf8',
            }),

            rect({
                id: 'rule',
                left: 140,
                top: 685,
                width: 160,
                height: 8,
                fill: '#6366f1',
            }),
            txt({
                id: 'subtitle',
                text: 'A clear message starts with a clear design.',
                left: 140,
                top: 725,
                width: 1000,
                size: 36,
                weight: 400,
                fill: '#cbd5e1',
            }),

            txt({
                id: 'footer',
                text: 'Presenter Name  |  Company',
                left: 140,
                top: 960,
                size: 24,
                weight: 500,
                fill: '#64748b',
            }),
        ],
    },

    // =========================================================
    // MARKETING  (1080 x 1080)
    // =========================================================

    {
        id: 'marketing-product',
        name: 'Product Advertisement',
        category: 'Marketing',
        sizeId: 'instagram-post',
        thumbnail: '/template/product.jpg',
        preview: '/template/product.jpg',
        description: 'Bold product advertisement layout.',
        tags: ['product', 'marketing', 'advertisement'],

        objects: [
            rect({
                id: 'background',
                left: 0,
                top: 0,
                width: 1080,
                height: 1080,
                fill: '#0f172a',
                locked: true,
            }),

            // accent panel behind the photo
            rect({
                id: 'accent-block',
                left: 380,
                top: 0,
                width: 700,
                height: 1080,
                fill: '#6366f1',
                locked: true,
            }),

            txt({
                id: 'brand',
                text: 'YOUR BRAND',
                left: 80,
                top: 80,
                size: 22,
                font: 'Montserrat',
                fill: '#ffffff',
                spacing: 300,
            }),

            // photo: 80px right margin, bottom aligned with the CTA button
            photo({
                id: 'product',
                src: '/template/product.jpg',
                left: 420,
                top: 120,
                width: 580,
                height: 840,
                radius: 32,
            }),

            // badge centered exactly on the photo's top-left corner
            circle({
                id: 'badge',
                cx: 420,
                cy: 120,
                r: 64,
                fill: '#facc15',
                stroke: '#0f172a',
                strokeWidth: 6,
            }),
            txt({
                id: 'badge-text',
                text: 'NEW',
                left: 420 - 64,
                top: textTop(120 - 64, 128, 32),
                width: 128,
                size: 32,
                weight: 800,
                font: 'Montserrat',
                fill: '#0f172a',
                align: 'center',
            }),

            // headline block (left column, 80 -> 372, stays clear of the photo)
            rect({
                id: 'rule',
                left: 80,
                top: 380,
                width: 60,
                height: 6,
                fill: '#facc15',
            }),
            txt({
                id: 'title-1',
                text: 'DESIGNED',
                left: 80,
                top: 430,
                width: 300,
                size: 56,
                weight: 800,
                font: 'Montserrat',
                fill: '#ffffff',
            }),
            txt({
                id: 'title-2',
                text: 'FOR YOU.',
                left: 80,
                top: 490,
                width: 300,
                size: 56,
                weight: 800,
                font: 'Montserrat',
                fill: '#c7d2fe',
            }),
            txt({
                id: 'subtitle',
                text: 'Premium quality.\nEveryday style.',
                left: 80,
                top: 575,
                width: 290,
                size: 24,
                weight: 400,
                font: 'Inter',
                fill: '#e0e7ff',
                lineHeight: 1.4,
            }),

            // CTA bottom-left, bottom edge aligned with the photo (960)
            ...pill({
                id: 'cta',
                left: 80,
                top: 888,
                width: 260,
                height: 72,
                label: 'SHOP NOW',
                size: 24,
                font: 'Montserrat',
                fill: '#facc15',
                color: '#0f172a',
                spacing: 80,
            }),
        ],
    },
];
