import { createRegistry } from '../registry';

/**
 * Group formations as data (phase 8): slots relative to the stage centre in cm, with the way each one faces
 * (0 = toward the default camera). `rows`: slots are filled tallest first from the back row, so nobody hides
 * behind a taller person. Arrangements for 2–5 actors; extra actors keep their spot.
 */
export interface Slot {
    x: number;
    z: number;
    facing: number;
}
export interface FormationDef {
    id: string;
    name: string;
    tags: readonly string[];
    /** slots for n actors (n = 1..5) */
    slots(n: number): Slot[];
    /** fill back rows with the tallest */
    byHeight?: boolean;
    /** actors look at the next one in the list (conversations) */
    talk?: boolean;
}

const line = (n: number, gap: number, z = 0, facing = 0): Slot[] =>
    Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * gap, z, facing }));

const arc = (n: number, r: number, from: number, to: number, cz: number): Slot[] =>
    Array.from({ length: n }, (_, i) => {
        const t = n === 1 ? 0.5 : i / (n - 1);
        const a = ((from + (to - from) * t) * Math.PI) / 180;
        // on a circle around (0, cz), facing its centre
        return {
            x: Math.sin(a) * r,
            z: cz + Math.cos(a) * r,
            facing: ((a * 180) / Math.PI + 180) % 360,
        };
    });

export const FORMATIONS = createRegistry<FormationDef>(
    [
        { id: 'line', name: 'Line-up', tags: ['row', 'photo'], slots: (n) => line(n, 85) },
        {
            id: 'two-rows',
            name: 'Class photo',
            tags: ['rows', 'school', 'team'],
            byHeight: true,
            slots: (n) => {
                const back = Math.ceil(n / 2);
                return [...line(back, 85, -70), ...line(n - back, 85, 30)];
            },
        },
        {
            id: 'v-shape',
            name: 'V shape',
            tags: ['hero', 'team', 'poster'],
            slots: (n) =>
                Array.from({ length: n }, (_, i) => {
                    const side = i === 0 ? 0 : i % 2 ? -1 : 1;
                    const k = Math.ceil(i / 2);
                    return { x: side * k * 80, z: -k * 70, facing: 0 };
                }),
        },
        {
            id: 'semicircle',
            name: 'Semicircle',
            tags: ['meeting', 'audience'],
            slots: (n) => arc(n, 160, -60, 60, -160),
        },
        {
            id: 'circle',
            name: 'Circle',
            tags: ['huddle', 'game'],
            slots: (n) => arc(n, n < 3 ? 70 : 110, -180 + 180 / n, 180 - 180 / n, -80),
        },
        {
            id: 'face-to-face',
            name: 'Face to face',
            tags: ['pair', 'talk', 'argument'],
            talk: true,
            slots: (n) =>
                line(n, 110).map((s, i) => ({ ...s, facing: n === 1 ? 0 : i < n / 2 ? 90 : 270 })),
        },
        {
            id: 'side-by-side',
            name: 'Walking together',
            tags: ['walk', 'friends', 'pair'],
            slots: (n) => line(n, 70).map((s) => ({ ...s, facing: 30 })),
        },
        {
            id: 'conversation',
            name: 'Conversation',
            tags: ['talk', 'group', 'dialogue'],
            talk: true,
            slots: (n) => arc(n, 95, -110, 110, -60),
        },
        {
            id: 'diagonal',
            name: 'Diagonal',
            tags: ['depth', 'cinematic'],
            slots: (n) =>
                Array.from({ length: n }, (_, i) => ({
                    x: (i - (n - 1) / 2) * 80,
                    z: -i * 90,
                    facing: 15,
                })),
        },
        {
            id: 'triangle',
            name: 'Triangle',
            tags: ['trio', 'poster'],
            byHeight: true,
            slots: (n) =>
                [{ x: 0, z: -90, facing: 0 }, ...line(Math.max(0, n - 1), 110, 10)].slice(0, n),
        },
        {
            id: 'queue',
            name: 'Queue',
            tags: ['line', 'waiting'],
            slots: (n) => Array.from({ length: n }, (_, i) => ({ x: 0, z: -i * 75, facing: 90 })),
        },
        {
            id: 'leader',
            name: 'Leader in front',
            tags: ['team', 'captain', 'teacher'],
            slots: (n) =>
                [{ x: 0, z: 60, facing: 0 }, ...line(Math.max(0, n - 1), 85, -60)].slice(0, n),
        },
    ],
    'line',
);
