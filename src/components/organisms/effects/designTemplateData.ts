import type { DesignTemplate } from './designTemplate.types';

type TemplateObjects = DesignTemplate['objects'];

/**
 * Fake a smooth gradient overlay using stacked, shrinking translucent rects.
 * Works with the existing "rect + rgba fill" object type, so no renderer
 * changes are needed.
 *
 * direction = the edge where the overlay is DARKEST.
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
        steps = 14,
    } = opts;

    // per-layer alpha so the stacked layers add up to maxAlpha at the edge
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

        return {
            id: `${id}-${i}`,
            type: 'rect' as const,
            left: x,
            top: y,
            width: w,
            height: h,
            fill: `rgba(${color},${alpha})`,
            selectable: false,
            evented: false,
        };
    }) as TemplateObjects;
};

const CLEAR = 'rgba(0,0,0,0)';

export const DESIGN_TEMPLATES: DesignTemplate[] = [
    // =========================================================
    // YOUTUBE
    // =========================================================

    {
        id: 'yt-history-dark',
        name: 'History Documentary',
        category: 'YouTube',
        sizeId: 'youtube-thumbnail',

        thumbnail: '/wallpaper/morning.jpg',
        preview: '/wallpaper/morning.jpg',

        description:
            'Dark cinematic documentary-style YouTube thumbnail for history and storytelling content.',

        tags: ['history', 'documentary', 'dark', 'cinematic'],

        featured: true,

        objects: [
            {
                id: 'background',
                type: 'image',
                src: '/wallpaper/morning.jpg',

                left: 0,
                top: 0,

                width: 1280,
                height: 720,

                fit: 'cover',

                selectable: false,
                evented: false,
                locked: true,
            },

            // soft overall darkening + strong fade from the left for text contrast
            {
                id: 'dark-overlay',
                type: 'rect',

                left: 0,
                top: 0,

                width: 1280,
                height: 720,

                fill: 'rgba(0,0,0,0.22)',

                selectable: false,
                evented: false,
            },
            ...fade({
                id: 'fade-left',
                direction: 'left',
                width: 940,
                height: 720,
                maxAlpha: 0.92,
            }),
            ...fade({
                id: 'fade-bottom',
                direction: 'bottom',
                width: 1280,
                height: 220,
                maxAlpha: 0.8,
            }),

            // warm glow ring on the right for depth
            {
                id: 'ring',
                type: 'circle',

                left: 880,
                top: 130,

                radius: 230,

                fill: 'rgba(249,115,22,0.07)',
                stroke: 'rgba(249,115,22,0.55)',
                strokeWidth: 3,

                selectable: false,
                evented: false,
            },

            {
                id: 'accent',
                type: 'rect',

                left: 70,
                top: 130,

                width: 10,
                height: 330,

                fill: '#f97316',
            },

            {
                id: 'badge',
                type: 'rect',

                left: 110,
                top: 100,

                width: 200,
                height: 42,

                fill: '#f97316',

                rx: 21,
                ry: 21,
            },

            {
                id: 'badge-text',
                type: 'text',

                text: 'EPISODE 01',

                left: 110,
                top: 110,
                width: 200,

                fontFamily: 'Arial',
                fontSize: 18,
                fontWeight: 800,

                fill: '#111111',

                textAlign: 'center',
                charSpacing: 120,
            },

            {
                id: 'title-1',
                type: 'text',

                text: 'THE UNTOLD',

                left: 105,
                top: 165,

                width: 800,

                fontFamily: 'Arial',
                fontSize: 118,
                fontWeight: 900,

                fill: '#ffffff',

                textAlign: 'left',
            },

            {
                id: 'title-2',
                type: 'text',

                text: 'HISTORY',

                left: 105,
                top: 285,

                width: 800,

                fontFamily: 'Arial',
                fontSize: 138,
                fontWeight: 900,

                fill: '#f97316',

                textAlign: 'left',
            },

            {
                id: 'subtitle',
                type: 'text',

                text: 'A STORY THAT CHANGED EVERYTHING',

                left: 110,
                top: 460,

                width: 800,

                fontFamily: 'Arial',
                fontSize: 28,
                fontWeight: 700,

                fill: '#fde7d3',

                charSpacing: 60,
            },

            {
                id: 'small-text',
                type: 'text',

                text: 'HISTORY • WAR • CULTURE',

                left: 70,
                top: 660,

                fontFamily: 'Arial',
                fontSize: 18,
                fontWeight: 700,

                fill: '#ffffff',

                charSpacing: 140,
            },
        ],
    },

    {
        id: 'yt-warrior',
        name: 'Warrior Story',
        category: 'YouTube',
        sizeId: 'youtube-thumbnail',

        thumbnail: '/wallpaper/morning.jpg',
        preview: '/wallpaper/morning.jpg',

        description:
            'Bold cinematic template for warriors, battles, martial arts and historical stories.',

        tags: ['warrior', 'samurai', 'martial arts', 'battle'],

        featured: true,

        objects: [
            {
                id: 'background',
                type: 'image',

                src: '/wallpaper/morning.jpg',

                left: 0,
                top: 0,

                width: 1280,
                height: 720,

                fit: 'cover',

                selectable: false,
                evented: false,
                locked: true,
            },

            {
                id: 'gradient',
                type: 'rect',

                left: 0,
                top: 0,

                width: 1280,
                height: 720,

                fill: 'rgba(0,0,0,0.25)',

                selectable: false,
                evented: false,
            },
            // blood-red tinted shadow from the left
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

            // concentric "rising sun" rings on the right
            {
                id: 'ring-outer',
                type: 'circle',

                left: 840,
                top: 70,

                radius: 260,

                fill: 'rgba(239,68,68,0.10)',
                stroke: '#ef4444',
                strokeWidth: 4,

                selectable: false,
                evented: false,
            },
            {
                id: 'ring-inner',
                type: 'circle',

                left: 930,
                top: 160,

                radius: 170,

                fill: CLEAR,
                stroke: 'rgba(255,255,255,0.35)',
                strokeWidth: 2,

                selectable: false,
                evented: false,
            },

            {
                id: 'title-1',
                type: 'text',

                text: 'THE LAST',

                left: 70,
                top: 105,

                width: 800,

                fontFamily: 'Arial',
                fontSize: 108,
                fontWeight: 900,

                fill: '#ffffff',
            },
            {
                id: 'title-2',
                type: 'text',

                text: 'WARRIOR',

                left: 70,
                top: 215,

                width: 800,

                fontFamily: 'Arial',
                fontSize: 134,
                fontWeight: 900,

                fill: '#ef4444',
            },

            {
                id: 'accent',
                type: 'rect',

                left: 75,
                top: 385,

                width: 260,
                height: 8,

                fill: '#ef4444',
            },

            {
                id: 'subtitle',
                type: 'text',

                text: 'THE BATTLE THAT ENDED AN ERA',

                left: 75,
                top: 420,

                width: 700,

                fontFamily: 'Arial',
                fontSize: 30,
                fontWeight: 800,

                fill: '#ffffff',

                charSpacing: 40,
            },

            {
                id: 'badge',
                type: 'rect',

                left: 75,
                top: 520,

                width: 230,
                height: 58,

                fill: '#ef4444',

                rx: 12,
                ry: 12,
            },

            {
                id: 'badge-text',
                type: 'text',

                text: 'TRUE STORY',

                left: 75,
                top: 536,
                width: 230,

                fontFamily: 'Arial',
                fontSize: 22,
                fontWeight: 900,

                fill: '#ffffff',

                textAlign: 'center',
                charSpacing: 100,
            },

            {
                id: 'badge-outline',
                type: 'rect',

                left: 325,
                top: 520,

                width: 230,
                height: 58,

                fill: CLEAR,
                stroke: '#ffffff',
                strokeWidth: 3,

                rx: 12,
                ry: 12,
            },

            {
                id: 'badge-outline-text',
                type: 'text',

                text: 'EPIC FINALE',

                left: 325,
                top: 536,
                width: 230,

                fontFamily: 'Arial',
                fontSize: 22,
                fontWeight: 900,

                fill: '#ffffff',

                textAlign: 'center',
                charSpacing: 100,
            },
        ],
    },

    {
        id: 'yt-minimal',
        name: 'Minimal Creator',
        category: 'YouTube',
        sizeId: 'youtube-thumbnail',

        thumbnail: '/wallpaper/morning.jpg',
        preview: '/wallpaper/morning.jpg',

        description: 'Clean modern YouTube thumbnail with strong typography.',

        tags: ['minimal', 'modern', 'clean', 'creator'],

        objects: [
            {
                id: 'background',
                type: 'rect',

                left: 0,
                top: 0,

                width: 1280,
                height: 720,

                fill: '#0b1020',

                selectable: false,
                evented: false,
            },

            {
                id: 'glow',
                type: 'circle',

                left: -180,
                top: 260,

                radius: 360,

                fill: 'rgba(99,102,241,0.14)',

                selectable: false,
                evented: false,
            },

            {
                id: 'image',
                type: 'image',

                src: '/wallpaper/morning.jpg',

                left: 700,
                top: 0,

                width: 580,
                height: 720,

                fit: 'cover',
            },
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

            {
                id: 'accent',
                type: 'rect',

                left: 75,
                top: 120,

                width: 90,
                height: 12,

                fill: '#818cf8',
            },

            {
                id: 'title-1',
                type: 'text',

                text: 'CREATE',

                left: 70,
                top: 160,

                width: 700,

                fontFamily: 'Arial',
                fontSize: 140,
                fontWeight: 900,

                fill: '#ffffff',
            },
            {
                id: 'title-2',
                type: 'text',

                text: 'BETTER',

                left: 70,
                top: 290,

                width: 700,

                fontFamily: 'Arial',
                fontSize: 140,
                fontWeight: 900,

                fill: '#818cf8',
            },

            // feature chips
            {
                id: 'chip-1',
                type: 'rect',
                left: 75,
                top: 470,
                width: 150,
                height: 50,
                fill: CLEAR,
                stroke: '#818cf8',
                strokeWidth: 2,
                rx: 25,
                ry: 25,
            },
            {
                id: 'chip-1-text',
                type: 'text',
                text: 'SIMPLE',
                left: 75,
                top: 484,
                width: 150,
                fontFamily: 'Arial',
                fontSize: 20,
                fontWeight: 700,
                fill: '#c7d2fe',
                textAlign: 'center',
                charSpacing: 80,
            },
            {
                id: 'chip-2',
                type: 'rect',
                left: 240,
                top: 470,
                width: 130,
                height: 50,
                fill: CLEAR,
                stroke: '#818cf8',
                strokeWidth: 2,
                rx: 25,
                ry: 25,
            },
            {
                id: 'chip-2-text',
                type: 'text',
                text: 'FAST',
                left: 240,
                top: 484,
                width: 130,
                fontFamily: 'Arial',
                fontSize: 20,
                fontWeight: 700,
                fill: '#c7d2fe',
                textAlign: 'center',
                charSpacing: 80,
            },
            {
                id: 'chip-3',
                type: 'rect',
                left: 385,
                top: 470,
                width: 190,
                height: 50,
                fill: '#6366f1',
                rx: 25,
                ry: 25,
            },
            {
                id: 'chip-3-text',
                type: 'text',
                text: 'POWERFUL',
                left: 385,
                top: 484,
                width: 190,
                fontFamily: 'Arial',
                fontSize: 20,
                fontWeight: 800,
                fill: '#ffffff',
                textAlign: 'center',
                charSpacing: 80,
            },
        ],
    },

    // =========================================================
    // INSTAGRAM
    // =========================================================

    {
        id: 'instagram-modern',
        name: 'Modern Social Post',
        category: 'Instagram',
        sizeId: 'instagram-post',

        thumbnail: '/wallpaper/morning.jpg',
        preview: '/wallpaper/morning.jpg',

        description: 'Modern square social media composition.',

        tags: ['instagram', 'social', 'modern', 'square'],

        featured: true,

        objects: [
            {
                id: 'background',
                type: 'image',

                src: '/wallpaper/morning.jpg',

                left: 0,
                top: 0,

                width: 1080,
                height: 1080,

                fit: 'cover',

                selectable: false,
                evented: false,
            },

            {
                id: 'overlay',
                type: 'rect',

                left: 0,
                top: 0,

                width: 1080,
                height: 1080,

                fill: 'rgba(0,0,0,0.18)',

                selectable: false,
                evented: false,
            },
            ...fade({
                id: 'fade-bottom',
                direction: 'bottom',
                width: 1080,
                height: 760,
                maxAlpha: 0.9,
            }),

            // thin inset frame
            {
                id: 'frame',
                type: 'rect',

                left: 40,
                top: 40,

                width: 1000,
                height: 1000,

                fill: CLEAR,
                stroke: 'rgba(255,255,255,0.4)',
                strokeWidth: 2,

                selectable: false,
                evented: false,
            },

            {
                id: 'tag',
                type: 'rect',

                left: 80,
                top: 80,

                width: 190,
                height: 48,

                fill: '#facc15',

                rx: 24,
                ry: 24,
            },
            {
                id: 'tag-text',
                type: 'text',

                text: 'FEATURED',

                left: 80,
                top: 92,
                width: 190,

                fontFamily: 'Arial',
                fontSize: 20,
                fontWeight: 800,

                fill: '#111111',

                textAlign: 'center',
                charSpacing: 120,
            },

            {
                id: 'title',
                type: 'text',

                text: 'MAKE\nSOMETHING',

                left: 80,
                top: 500,

                width: 920,

                fontFamily: 'Arial',
                fontSize: 118,
                fontWeight: 900,

                fill: '#ffffff',

                lineHeight: 0.9,
            },

            {
                id: 'title-accent',
                type: 'text',

                text: 'GREAT.',

                left: 80,
                top: 710,

                width: 920,

                fontFamily: 'Arial',
                fontSize: 160,
                fontWeight: 900,

                fill: '#facc15',
            },

            {
                id: 'line',
                type: 'rect',

                left: 80,
                top: 930,

                width: 120,
                height: 6,

                fill: '#ffffff',
            },

            {
                id: 'caption',
                type: 'text',

                text: 'YOUR BRAND • YOUR STORY',

                left: 80,
                top: 960,

                fontFamily: 'Arial',
                fontSize: 22,
                fontWeight: 700,

                fill: '#ffffff',

                charSpacing: 120,
            },
        ],
    },

    {
        id: 'instagram-quote',
        name: 'Quote Card',
        category: 'Instagram',
        sizeId: 'instagram-post',

        thumbnail: '/wallpaper/morning.jpg',
        preview: '/wallpaper/morning.jpg',

        description: 'Elegant quote design for social media.',

        tags: ['quote', 'instagram', 'motivation'],

        objects: [
            {
                id: 'background',
                type: 'rect',

                left: 0,
                top: 0,

                width: 1080,
                height: 1080,

                fill: '#f6f3ee',

                selectable: false,
                evented: false,
            },

            {
                id: 'circle-large',
                type: 'circle',

                left: 720,
                top: -200,

                radius: 330,

                fill: '#e0e7ff',

                selectable: false,
                evented: false,
            },
            {
                id: 'circle-small',
                type: 'circle',

                left: -140,
                top: 800,

                radius: 220,

                fill: '#fde68a',

                selectable: false,
                evented: false,
            },

            {
                id: 'frame',
                type: 'rect',

                left: 50,
                top: 50,

                width: 980,
                height: 980,

                fill: CLEAR,
                stroke: '#1e1b4b',
                strokeWidth: 2,

                selectable: false,
                evented: false,
            },

            {
                id: 'quote-mark',
                type: 'text',

                text: '“',

                left: 100,
                top: 150,
                width: 880,

                fontFamily: 'Georgia',
                fontSize: 340,
                fontWeight: 700,

                fill: '#6366f1',

                textAlign: 'center',
            },

            {
                id: 'quote',
                type: 'text',

                text: 'The journey\nis the story.',

                left: 100,
                top: 400,

                width: 880,

                fontFamily: 'Georgia',
                fontSize: 84,
                fontWeight: 700,

                fill: '#1e1b4b',

                lineHeight: 1.1,

                textAlign: 'center',
            },

            {
                id: 'divider',
                type: 'rect',

                left: 490,
                top: 730,

                width: 100,
                height: 5,

                fill: '#6366f1',
            },

            {
                id: 'author',
                type: 'text',

                text: 'YOUR NAME',

                left: 100,
                top: 770,

                width: 880,

                fontFamily: 'Arial',
                fontSize: 24,
                fontWeight: 700,

                fill: '#4338ca',

                textAlign: 'center',

                charSpacing: 160,
            },
        ],
    },

    // =========================================================
    // POSTER
    // =========================================================

    {
        id: 'poster-cinematic',
        name: 'Cinematic Poster',
        category: 'Poster',
        sizeId: 'poster',

        thumbnail: '/wallpaper/morning.jpg',
        preview: '/wallpaper/morning.jpg',

        description: 'Cinematic poster layout for events, stories and campaigns.',

        tags: ['poster', 'cinematic', 'event'],

        featured: true,

        objects: [
            {
                id: 'background',
                type: 'image',

                src: '/wallpaper/morning.jpg',

                left: 0,
                top: 0,

                width: 1080,
                height: 1350,

                fit: 'cover',

                selectable: false,
                evented: false,
            },

            {
                id: 'overlay',
                type: 'rect',

                left: 0,
                top: 0,

                width: 1080,
                height: 1350,

                fill: 'rgba(0,0,0,0.2)',

                selectable: false,
                evented: false,
            },
            ...fade({
                id: 'fade-bottom',
                direction: 'bottom',
                width: 1080,
                height: 900,
                maxAlpha: 0.96,
            }),
            ...fade({
                id: 'fade-top',
                direction: 'top',
                width: 1080,
                height: 300,
                maxAlpha: 0.65,
            }),

            // gold frame
            {
                id: 'frame',
                type: 'rect',

                left: 40,
                top: 40,

                width: 1000,
                height: 1270,

                fill: CLEAR,
                stroke: 'rgba(251,191,36,0.6)',
                strokeWidth: 2,

                selectable: false,
                evented: false,
            },

            {
                id: 'eyebrow',
                type: 'text',

                text: 'AN EXTRAORDINARY STORY',

                left: 80,
                top: 105,
                width: 920,

                fontFamily: 'Arial',
                fontSize: 20,
                fontWeight: 700,

                fill: '#fbbf24',

                textAlign: 'center',
                charSpacing: 220,
            },

            {
                id: 'eyebrow-line',
                type: 'rect',

                left: 490,
                top: 148,

                width: 100,
                height: 3,

                fill: '#fbbf24',
            },

            {
                id: 'title-small',
                type: 'text',

                text: 'THE',

                left: 80,
                top: 790,
                width: 920,

                fontFamily: 'Georgia',
                fontSize: 54,
                fontWeight: 400,

                fill: '#fbbf24',

                textAlign: 'center',
                charSpacing: 500,
            },

            {
                id: 'title',
                type: 'text',

                text: 'LEGEND',

                left: 60,
                top: 850,
                width: 960,

                fontFamily: 'Arial',
                fontSize: 200,
                fontWeight: 900,

                fill: '#ffffff',

                textAlign: 'center',
            },

            {
                id: 'line',
                type: 'rect',

                left: 450,
                top: 1100,

                width: 180,
                height: 6,

                fill: '#fbbf24',
            },

            {
                id: 'description',
                type: 'text',

                text: 'A STORY OF COURAGE,\nHONOR AND SACRIFICE.',

                left: 80,
                top: 1135,
                width: 920,

                fontFamily: 'Arial',
                fontSize: 30,
                fontWeight: 600,

                fill: '#ffffff',

                lineHeight: 1.2,
                textAlign: 'center',
                charSpacing: 60,
            },

            {
                id: 'footer',
                type: 'text',

                text: '2026 • ORIGINAL DOCUMENTARY',

                left: 80,
                top: 1250,
                width: 920,

                fontFamily: 'Arial',
                fontSize: 17,
                fontWeight: 600,

                fill: '#d1d5db',

                textAlign: 'center',
                charSpacing: 140,
            },
        ],
    },

    // =========================================================
    // PRESENTATION
    // =========================================================

    {
        id: 'presentation-business',
        name: 'Business Presentation',
        category: 'Presentation',
        sizeId: 'presentation',

        thumbnail: '/wallpaper/morning.jpg',
        preview: '/wallpaper/morning.jpg',

        description: 'Professional presentation cover.',

        tags: ['business', 'presentation', 'corporate'],

        objects: [
            {
                id: 'background',
                type: 'rect',

                left: 0,
                top: 0,

                width: 1920,
                height: 1080,

                fill: '#0b1120',

                selectable: false,
                evented: false,
            },

            // layered circles for depth on the right
            {
                id: 'circle-big',
                type: 'circle',

                left: 1180,
                top: 140,

                radius: 440,

                fill: 'rgba(99,102,241,0.12)',

                selectable: false,
                evented: false,
            },
            {
                id: 'circle-mid',
                type: 'circle',

                left: 1360,
                top: 320,

                radius: 260,

                fill: 'rgba(99,102,241,0.2)',

                selectable: false,
                evented: false,
            },
            {
                id: 'circle-ring',
                type: 'circle',

                left: 1060,
                top: 20,

                radius: 560,

                fill: CLEAR,
                stroke: 'rgba(165,180,252,0.22)',
                strokeWidth: 2,

                selectable: false,
                evented: false,
            },

            {
                id: 'accent',
                type: 'rect',

                left: 0,
                top: 0,

                width: 35,
                height: 1080,

                fill: '#6366f1',

                selectable: false,
                evented: false,
            },

            {
                id: 'small',
                type: 'text',

                text: 'PRESENTATION  /  2026',

                left: 120,
                top: 140,

                fontFamily: 'Arial',
                fontSize: 26,
                fontWeight: 700,

                fill: '#a5b4fc',

                charSpacing: 160,
            },

            {
                id: 'title-1',
                type: 'text',

                text: 'YOUR BIG',

                left: 115,
                top: 280,

                width: 1100,

                fontFamily: 'Arial',
                fontSize: 156,
                fontWeight: 900,

                fill: '#ffffff',
            },
            {
                id: 'title-2',
                type: 'text',

                text: 'IDEA',

                left: 115,
                top: 440,

                width: 1100,

                fontFamily: 'Arial',
                fontSize: 156,
                fontWeight: 900,

                fill: '#818cf8',
            },

            {
                id: 'rule',
                type: 'rect',

                left: 125,
                top: 650,

                width: 160,
                height: 8,

                fill: '#6366f1',
            },

            {
                id: 'subtitle',
                type: 'text',

                text: 'A clear message starts with a clear design.',

                left: 125,
                top: 695,

                width: 1000,

                fontFamily: 'Arial',
                fontSize: 36,
                fontWeight: 400,

                fill: '#cbd5e1',
            },

            {
                id: 'footer',
                type: 'text',

                text: 'Presenter Name  |  Company',

                left: 125,
                top: 960,

                fontFamily: 'Arial',
                fontSize: 24,
                fontWeight: 500,

                fill: '#64748b',
            },
        ],
    },

    // =========================================================
    // MARKETING
    // =========================================================

    {
        id: 'marketing-product',
        name: 'Product Advertisement',
        category: 'Marketing',
        sizeId: 'instagram-post',

        thumbnail: '/wallpaper/morning.jpg',
        preview: '/wallpaper/morning.jpg',

        description: 'Bold product advertisement layout.',

        tags: ['product', 'marketing', 'advertisement'],

        objects: [
            {
                id: 'background',
                type: 'rect',

                left: 0,
                top: 0,

                width: 1080,
                height: 1080,

                fill: '#eef2ff',

                selectable: false,
                evented: false,
            },

            // spotlight behind the product
            {
                id: 'spotlight',
                type: 'circle',

                left: 160,
                top: 70,

                radius: 380,

                fill: '#c7d2fe',

                selectable: false,
                evented: false,
            },
            {
                id: 'spotlight-ring',
                type: 'circle',

                left: 110,
                top: 20,

                radius: 430,

                fill: CLEAR,
                stroke: 'rgba(99,102,241,0.35)',
                strokeWidth: 2,

                selectable: false,
                evented: false,
            },

            {
                id: 'brand',
                type: 'text',

                text: 'YOUR BRAND',

                left: 70,
                top: 60,

                fontFamily: 'Arial',
                fontSize: 24,
                fontWeight: 800,

                fill: '#1e1b4b',

                charSpacing: 200,
            },

            {
                id: 'product',
                type: 'image',

                src: '/wallpaper/morning.jpg',

                left: 200,
                top: 110,

                width: 680,
                height: 680,

                fit: 'contain',
            },

            {
                id: 'badge',
                type: 'circle',

                left: 790,
                top: 70,

                radius: 90,

                fill: '#6366f1',
                stroke: '#ffffff',
                strokeWidth: 8,
            },

            {
                id: 'badge-text',
                type: 'text',

                text: 'NEW',

                left: 790,
                top: 136,
                width: 180,

                fontFamily: 'Arial',
                fontSize: 38,
                fontWeight: 900,

                fill: '#ffffff',

                textAlign: 'center',
                charSpacing: 60,
            },

            {
                id: 'title-1',
                type: 'text',

                text: 'DESIGNED',

                left: 70,
                top: 815,

                width: 700,

                fontFamily: 'Arial',
                fontSize: 82,
                fontWeight: 900,

                fill: '#0f172a',
            },
            {
                id: 'title-2',
                type: 'text',

                text: 'FOR YOU.',

                left: 70,
                top: 900,

                width: 700,

                fontFamily: 'Arial',
                fontSize: 82,
                fontWeight: 900,

                fill: '#6366f1',
            },

            {
                id: 'cta',
                type: 'rect',

                left: 740,
                top: 910,

                width: 270,
                height: 76,

                fill: '#0f172a',

                rx: 38,
                ry: 38,
            },

            {
                id: 'cta-text',
                type: 'text',

                text: 'SHOP NOW',

                left: 740,
                top: 932,
                width: 270,

                fontFamily: 'Arial',
                fontSize: 26,
                fontWeight: 800,

                fill: '#ffffff',

                textAlign: 'center',
                charSpacing: 100,
            },
        ],
    },
];
