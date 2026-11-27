import { n } from '../render/ink';
import { blob, poly, pts, star } from '../render/shapes';
import type { PropDef } from '../types';

/** A spiky outline on an ellipse (shout balloon, impact): `spikes` tips between rx/ry and the inner ring. */
function spiky(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    inner: number,
    spikes: number,
    jitter: () => number,
) {
    const p: [number, number][] = [];
    for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2;
        const k = i % 2 ? inner : 1 + (jitter() - 0.5) * 0.18;
        p.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return poly(p);
}

/** The letter Z as a filled outline, `s` tall, top-left at (x, y). */
const zed = (x: number, y: number, s: number) =>
    pts(
        `${x} ${y} ${x + s} ${y} ${x + s} ${y + s * 0.2} ${x + s * 0.32} ${y + s * 0.8} ${x + s} ${y + s * 0.8} ${x + s} ${y + s} ${x} ${y + s} ${x} ${y + s * 0.8} ${x + s * 0.68} ${y + s * 0.2} ${x} ${y + s * 0.2}`,
    );

/**
 * Manga symbols (漫符): the visual shorthand drawn next to characters for emotion and sound. Bubbles stay empty:
 * the user writes in them with the Text tool.
 */
export const EFFECT_PROPS: PropDef[] = [
    {
        id: 'sweat-drop',
        label: 'Sweat drop',
        category: 'effects',
        tags: ['sweat', 'nervous', 'awkward', 'embarrassed', 'manga symbol'],
        width: 70,
        height: 100,
        colors: { drop: '#bfe3f7' },
        draw: (k) =>
            k.path('M35 6 Q62 50 62 68 A27 27 0 0 1 8 68 Q8 50 35 6 Z', k.c('drop')) +
            k.line('M20 66 Q20 80 32 84', { lw: 0.9, color: '#ffffff' }),
    },
    {
        id: 'anger-vein',
        label: 'Anger vein',
        category: 'effects',
        tags: ['angry', 'mad', 'annoyed', 'vein', 'cross popping', 'manga symbol'],
        width: 110,
        height: 110,
        colors: { vein: '#e04848' },
        draw: (k) =>
            k.limbs(
                [
                    'M46 14 Q48 46 14 46',
                    'M64 14 Q62 46 96 46',
                    'M14 64 Q48 62 46 96',
                    'M96 64 Q62 64 64 96',
                ].map((d) => ({ d, width: 9 })),
                k.c('vein'),
            ),
    },
    {
        id: 'sparkles',
        label: 'Sparkles',
        category: 'effects',
        tags: ['sparkle', 'shine', 'glitter', 'kira kira', 'cute', 'manga symbol'],
        width: 160,
        height: 140,
        colors: { spark: '#fff3a6' },
        draw: (k) =>
            k.path(star(62, 66, 50, 12, 4), k.c('spark')) +
            k.path(star(124, 36, 26, 7, 4), k.c('spark')) +
            k.path(star(128, 108, 18, 5, 4), k.c('spark')) +
            k.circle(26, 26, 4, k.c('spark'), { lw: 0.5 }) +
            k.circle(104, 74, 3, k.c('spark'), { lw: 0.5 }),
    },
    {
        id: 'blush',
        label: 'Blush',
        category: 'effects',
        tags: ['blush', 'shy', 'embarrassed', 'cheeks', 'love', 'manga symbol'],
        width: 160,
        height: 60,
        colors: { blush: '#f58fa8' },
        draw: (k) =>
            k.ellipse(36, 30, 30, 16, k.c('blush'), { bare: true, opacity: 0.75 }) +
            k.ellipse(124, 30, 30, 16, k.c('blush'), { bare: true, opacity: 0.75 }) +
            k.line(
                'M22 40 l10 -18 M34 40 l10 -18 M46 40 l10 -18 M110 40 l10 -18 M122 40 l10 -18 M134 40 l10 -18',
                { lw: 0.6 },
            ),
    },
    {
        id: 'heart',
        label: 'Heart',
        category: 'effects',
        tags: ['love', 'crush', 'heart', 'romance', 'manga symbol'],
        width: 120,
        height: 110,
        colors: { heart: '#ff5c8a' },
        draw: (k) =>
            k.path(
                'M60 102 C20 74 6 52 6 34 C6 16 20 6 34 6 C46 6 56 14 60 24 C64 14 74 6 86 6 C100 6 114 16 114 34 C114 52 100 74 60 102 Z',
                k.c('heart'),
            ) + k.line('M24 26 Q28 16 38 16', { lw: 1.2, color: '#ffffff' }),
    },
    {
        id: 'exclamation',
        label: 'Exclamation mark',
        category: 'effects',
        tags: ['surprise', 'alert', 'shock', 'exclamation', '!', 'manga symbol'],
        width: 64,
        height: 150,
        colors: { mark: '#e04848' },
        draw: (k) =>
            k.path(pts('18 8 46 8 38 104 26 104'), k.c('mark')) +
            k.circle(32, 128, 13, k.c('mark')),
    },
    {
        id: 'question-mark',
        label: 'Question mark',
        category: 'effects',
        tags: ['confused', 'question', 'huh', '?', 'manga symbol'],
        width: 100,
        height: 150,
        colors: { mark: '#4a7bd0' },
        draw: (k) =>
            k.limb('M24 46 Q24 14 50 14 Q78 14 78 42 Q78 62 52 70 L52 98', 16, k.c('mark')) +
            k.circle(52, 130, 12, k.c('mark')),
    },
    {
        id: 'music-notes',
        label: 'Music notes',
        category: 'effects',
        tags: ['music', 'singing', 'humming', 'happy', 'song', 'manga symbol'],
        width: 140,
        height: 130,
        colors: { note: '#3a3550' },
        draw: (k) =>
            k.path(pts('52 22 122 8 122 26 52 40'), k.c('note')) +
            k.rect(48, 28, 7, 74, k.c('note')) +
            k.rect(118, 14, 7, 74, k.c('note')) +
            k.ellipse(38, 104, 18, 13, k.c('note'), { transform: 'rotate(-20 38 104)' }) +
            k.ellipse(108, 90, 18, 13, k.c('note'), { transform: 'rotate(-20 108 90)' }),
    },
    {
        id: 'sleep-zzz',
        label: 'Sleeping Zzz',
        category: 'effects',
        tags: ['sleep', 'zzz', 'tired', 'snore', 'nap', 'manga symbol'],
        width: 140,
        height: 130,
        colors: { z: '#ffffff' },
        draw: (k) =>
            k.path(zed(8, 74, 50), k.c('z')) +
            k.path(zed(66, 40, 34), k.c('z')) +
            k.path(zed(106, 10, 24), k.c('z')),
    },
    {
        id: 'speech-bubble',
        label: 'Speech bubble',
        category: 'effects',
        tags: ['balloon', 'dialogue', 'talk', 'say', 'fukidashi', 'comic'],
        width: 220,
        height: 160,
        colors: { fill: '#ffffff' },
        draw: (k) =>
            k.path(
                'M110 10 C170 10 212 36 212 72 C212 108 170 132 110 132 C98 132 88 131 78 129 L50 154 L58 124 C28 114 8 96 8 72 C8 36 50 10 110 10 Z',
                k.c('fill'),
            ),
    },
    {
        id: 'thought-bubble',
        label: 'Thought bubble',
        category: 'effects',
        tags: ['think', 'thought', 'dream', 'imagine', 'balloon', 'cloud'],
        width: 220,
        height: 175,
        colors: { fill: '#ffffff' },
        draw: (k) =>
            k.path(blob(118, 66, 96, 56, 11, k.rand, 1.2), k.c('fill')) +
            k.circle(44, 140, 11, k.c('fill')) +
            k.circle(22, 162, 7, k.c('fill')),
    },
    {
        id: 'shout-bubble',
        label: 'Shout bubble',
        category: 'effects',
        tags: ['shout', 'yell', 'scream', 'loud', 'balloon', 'sfx'],
        width: 240,
        height: 180,
        colors: { fill: '#ffffff' },
        draw: (k) => k.path(spiky(120, 90, 116, 86, 0.74, 16, k.rand), k.c('fill')),
    },
    {
        id: 'impact-star',
        label: 'Impact burst',
        category: 'effects',
        tags: ['impact', 'hit', 'pow', 'bang', 'explosion', 'sfx', 'action'],
        width: 200,
        height: 200,
        colors: { burst: '#ffd84a' },
        draw: (k) =>
            k.path(spiky(100, 100, 96, 96, 0.5, 11, k.rand), k.c('burst')) +
            k.path(spiky(100, 100, 54, 54, 0.55, 11, k.rand), '#ffffff', { bare: true }),
    },
    {
        id: 'steam-puff',
        label: 'Steam puff',
        category: 'effects',
        tags: ['huff', 'angry', 'frustrated', 'sigh', 'puff', 'manga symbol'],
        width: 150,
        height: 90,
        colors: { puff: '#ffffff' },
        draw: (k) =>
            k.path(blob(48, 50, 36, 26, 7, k.rand, 1.2), k.c('puff')) +
            k.path(blob(104, 38, 32, 22, 7, k.rand, 1.2), k.c('puff')) +
            k.line('M4 30 h14 M2 50 h10 M6 70 h14', { lw: 0.8 }),
    },
    {
        id: 'tears',
        label: 'Streaming tears',
        category: 'effects',
        tags: ['cry', 'tears', 'sad', 'crying', 'waterfall', 'manga symbol'],
        width: 130,
        height: 140,
        colors: { tear: '#9fd4f2' },
        draw: (k) =>
            k.path('M18 6 Q8 60 22 134 L44 134 Q32 60 36 6 Z', k.c('tear')) +
            k.path('M94 6 Q84 60 98 134 L120 134 Q108 60 112 6 Z', k.c('tear')) +
            k.line('M24 40 Q22 70 30 110 M100 40 Q98 70 106 110', { lw: 0.8, color: '#ffffff' }),
    },
    {
        id: 'gloom-lines',
        label: 'Gloom lines',
        category: 'effects',
        tags: ['depressed', 'gloom', 'shock', 'despair', 'sad', 'manga symbol'],
        width: 160,
        height: 200,
        colors: { line: '#3a3550' },
        draw: (k) => {
            let out = '';
            for (let i = 0; i < 18; i++) {
                const x = 8 + i * 8.5 + k.rand() * 3;
                const len = 70 + k.rand() * 120;
                out += k.stroke(`M${n(x)} 4 L${n(x)} ${n(len)}`, 1.5 + k.rand() * 2.5, k.c('line'));
            }
            return out;
        },
    },
    {
        id: 'surprise-lines',
        label: 'Surprise lines',
        category: 'effects',
        tags: ['surprise', 'shock', 'reaction', 'emanata', 'gasp', 'manga symbol'],
        width: 200,
        height: 200,
        colors: { line: '#141414' },
        draw: (k) => {
            let d = '';
            for (let i = 0; i < 14; i++) {
                const a = (i / 14) * Math.PI * 2 + (k.rand() - 0.5) * 0.15;
                const r0 = 64 + k.rand() * 8;
                const r1 = r0 + 18 + k.rand() * 16;
                d += `M${n(100 + Math.cos(a) * r0)} ${n(100 + Math.sin(a) * r0)} L${n(100 + Math.cos(a) * r1)} ${n(100 + Math.sin(a) * r1)} `;
            }
            return k.stroke(d, 4, k.c('line'));
        },
    },
    {
        id: 'dizzy-spiral',
        label: 'Dizzy spiral',
        category: 'effects',
        tags: ['dizzy', 'confused', 'spiral', 'knocked out', 'manga symbol'],
        width: 120,
        height: 120,
        colors: { line: '#141414' },
        draw: (k) => {
            let d = 'M60 60';
            for (let t = 0.3; t < Math.PI * 6; t += 0.25) {
                const r = t * 2.8;
                d += ` L${n(60 + Math.cos(t) * r)} ${n(60 + Math.sin(t) * r)}`;
            }
            return k.stroke(d, 4, k.c('line'));
        },
    },
    {
        id: 'heart-burst',
        label: 'Heart burst',
        category: 'effects',
        tags: ['hearts', 'love', 'crush', 'doki doki', 'romance', 'manga symbol'],
        width: 180,
        height: 150,
        colors: { heart: '#ff5c8a' },
        draw: (k) => {
            const heart = (x: number, y: number, s: number, turn: number) =>
                k.path(
                    `M${x} ${n(y + s * 0.9)} C${n(x - s * 0.7)} ${n(y + s * 0.4)} ${n(x - s)} ${n(y)} ${n(x - s)} ${n(y - s * 0.3)} C${n(x - s)} ${n(y - s * 0.75)} ${n(x - s * 0.3)} ${n(y - s * 0.9)} ${x} ${n(y - s * 0.45)} C${n(x + s * 0.3)} ${n(y - s * 0.9)} ${n(x + s)} ${n(y - s * 0.75)} ${n(x + s)} ${n(y - s * 0.3)} C${n(x + s)} ${n(y)} ${n(x + s * 0.7)} ${n(y + s * 0.4)} ${x} ${n(y + s * 0.9)} Z`,
                    k.c('heart'),
                    { transform: `rotate(${turn} ${x} ${y})` },
                );
            return (
                heart(90, 80, 40, 0) +
                heart(34, 40, 18, -20) +
                heart(150, 36, 16, 18) +
                heart(150, 118, 12, 10) +
                heart(30, 116, 10, -12) +
                k.line('M60 20 l-8 -12 M120 20 l8 -12 M90 14 v-12', { lw: 0.8 })
            );
        },
    },
    {
        id: 'interrobang',
        label: 'Exclamation question',
        category: 'effects',
        tags: ['!?', 'shock', 'surprise', 'confused', 'what', 'manga symbol'],
        width: 140,
        height: 150,
        colors: { mark: '#e04848' },
        draw: (k) =>
            k.path(pts('14 8 42 8 34 104 22 104'), k.c('mark')) +
            k.circle(28, 128, 13, k.c('mark')) +
            k.limb('M70 46 Q70 14 96 14 Q124 14 124 42 Q124 62 98 70 L98 98', 16, k.c('mark')) +
            k.circle(98, 130, 12, k.c('mark')),
    },
];
