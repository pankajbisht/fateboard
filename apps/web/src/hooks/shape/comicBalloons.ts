/**
 * Manga balloons (2026-11-17): speech, thought, shout and caption balloons as text shapes (type inside them;
 * the text box is centred, `textInset` keeps it off the tail). Data only, merged into `SHAPES`
 * (shapeCatalog.ts). Authored in the catalog's 100 × 100 box; the oval balloons are cubic ellipses with a tail.
 */
import type { Pt, ShapeDef } from './shapeCatalog';

/** A spiky "shout" outline: `n` points alternating between two radii around the centre. */
const spiky = (n: number, inner: number): Pt[] =>
    Array.from({ length: n * 2 }, (_, i) => {
        const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
        const r = i % 2 === 0 ? 50 : 50 * inner;
        return {
            x: Math.round((50 + Math.cos(a) * r) * 10) / 10,
            y: Math.round((50 + Math.sin(a) * r) * 10) / 10,
        };
    });

export const COMIC_BALLOONS: ShapeDef[] = [
    {
        type: 'balloon-speech',
        label: 'Speech',
        category: 'balloons',
        kind: 'path',
        w: 220,
        h: 160,
        text: true,
        textInset: 0.62,
        d: 'M 50 0 C 77.6 0 100 18.8 100 42 C 100 65.2 77.6 84 50 84 C 44.5 84 39.2 83.3 34.3 82 L 14 100 L 22.5 76.6 C 8.9 69 0 56.4 0 42 C 0 18.8 22.4 0 50 0 Z',
        keywords: 'manga comic balloon bubble dialogue talk',
    },
    {
        type: 'balloon-speech-right',
        label: 'Speech (tail right)',
        category: 'balloons',
        kind: 'path',
        w: 220,
        h: 160,
        text: true,
        textInset: 0.62,
        d: 'M 50 0 C 22.4 0 0 18.8 0 42 C 0 65.2 22.4 84 50 84 C 55.5 84 60.8 83.3 65.7 82 L 86 100 L 77.5 76.6 C 91.1 69 100 56.4 100 42 C 100 18.8 77.6 0 50 0 Z',
        keywords: 'manga comic balloon bubble dialogue talk',
    },
    {
        type: 'balloon-box',
        label: 'Speech box',
        category: 'balloons',
        kind: 'path',
        w: 220,
        h: 150,
        text: true,
        textInset: 0.85,
        d: 'M 10 0 H 90 Q 100 0 100 10 V 70 Q 100 80 90 80 H 40 L 22 100 L 26 80 H 10 Q 0 80 0 70 V 10 Q 0 0 10 0 Z',
        keywords: 'manga comic balloon rectangle dialogue',
    },
    {
        type: 'balloon-thought',
        label: 'Thought',
        category: 'balloons',
        kind: 'path',
        w: 210,
        h: 170,
        text: true,
        textInset: 0.6,
        d: 'M 25 80 C 8 80 0 68 0 58 C 0 46 10 38 22 38 C 22 20 38 8 55 8 C 70 8 82 18 85 32 C 95 32 100 44 100 56 C 100 70 90 80 78 80 Z M 16 90 A 6 6 0 1 0 28 90 A 6 6 0 1 0 16 90 Z M 4 100 A 3 3 0 1 0 10 100 A 3 3 0 1 0 4 100 Z',
        keywords: 'manga comic balloon think cloud',
    },
    {
        type: 'balloon-shout',
        label: 'Shout',
        category: 'balloons',
        kind: 'polygon',
        w: 230,
        h: 180,
        text: true,
        textInset: 0.55,
        points: spiky(14, 0.74),
        keywords: 'manga comic balloon scream yell burst',
    },
    {
        type: 'balloon-caption',
        label: 'Caption',
        category: 'balloons',
        kind: 'rect',
        w: 220,
        h: 70,
        text: true,
        textInset: 0.9,
        d: 'M 0 0 H 100 V 100 H 0 Z',
        keywords: 'manga comic narration caption box',
    },
];
