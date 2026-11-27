import { n } from '../render/ink';
import { blob, ellipsePath, pts, star } from '../render/shapes';
import type { PropDef } from '../types';

const STEEL = '#c9d1da';
const GOLD = '#e8b830';

/** Fantasy and isekai: weapons, magic, loot, a slime. */
export const FANTASY_PROPS: PropDef[] = [
    {
        id: 'sword',
        label: 'Sword',
        category: 'fantasy',
        tags: ['sword', 'blade', 'knight', 'hero', 'isekai', 'weapon'],
        width: 60,
        height: 230,
        colors: { blade: '#c9d1da' },
        draw: (k) =>
            k.path(pts('22 160 22 22 30 6 38 22 38 160'), k.c('blade')) +
            k.line('M30 20 V156', { lw: 0.45 }) +
            k.rect(4, 158, 52, 10, GOLD, { rx: 3 }) +
            k.rect(25, 168, 10, 44, '#5b3a2a') +
            k.circle(30, 218, 8, GOLD),
    },
    {
        id: 'shield',
        label: 'Shield',
        category: 'fantasy',
        tags: ['shield', 'knight', 'armor', 'defense', 'rpg'],
        width: 130,
        height: 160,
        colors: { face: '#4a7bd0' },
        draw: (k) =>
            k.path('M10 16 Q65 2 120 16 Q124 100 65 154 Q6 100 10 16 Z', STEEL) +
            k.path('M22 26 Q65 14 108 26 Q110 94 65 138 Q20 94 22 26 Z', k.c('face'), { lw: 0.6 }) +
            k.path(star(65, 70, 26, 11, 5), GOLD, { lw: 0.6 }),
    },
    {
        id: 'magic-staff',
        label: 'Magic staff',
        category: 'fantasy',
        tags: ['staff', 'wand', 'mage', 'wizard', 'witch', 'magic'],
        width: 90,
        height: 240,
        colors: { gem: '#7fc8ff' },
        draw: (k) =>
            k.limb('M45 60 L45 236', 7, '#7a5236') +
            k.limb('M45 66 Q14 50 22 22 Q30 6 45 10 Q60 6 68 22 Q76 50 45 66', 4, '#9b6b43') +
            k.path(pts('45 18 58 38 45 58 32 38'), k.c('gem')) +
            k.path(star(76, 14, 8, 2, 4), '#fff3a6', { lw: 0.4 }) +
            k.path(star(14, 40, 6, 1.6, 4), '#fff3a6', { lw: 0.4 }),
    },
    {
        id: 'magic-circle',
        label: 'Magic circle',
        category: 'fantasy',
        tags: ['magic circle', 'summoning', 'spell', 'rune', 'isekai'],
        width: 220,
        height: 220,
        colors: { glow: '#7fc8ff' },
        noShadow: true,
        draw: (k) => {
            let runes = '';
            for (let i = 0; i < 16; i++) {
                const a = (i / 16) * Math.PI * 2;
                const x = 110 + Math.cos(a) * 92;
                const y = 110 + Math.sin(a) * 92;
                runes += `M${n(x - 3)} ${n(y - 3)} l6 6 m-6 0 l6 -6 `;
            }
            return (
                k.stroke(ellipsePath(110, 110, 104, 104), 3, k.c('glow')) +
                k.stroke(ellipsePath(110, 110, 82, 82), 2, k.c('glow')) +
                k.stroke(ellipsePath(110, 110, 40, 40), 2, k.c('glow')) +
                k.stroke(star(110, 110, 82, 33, 6), 2, k.c('glow')) +
                k.stroke(runes, 1.6, k.c('glow'))
            );
        },
    },
    {
        id: 'potion',
        label: 'Potion',
        category: 'fantasy',
        tags: ['potion', 'flask', 'elixir', 'alchemy', 'hp', 'rpg'],
        width: 100,
        height: 150,
        colors: { liquid: '#e04878' },
        draw: (k) =>
            k.path(
                'M38 10 L62 10 L62 50 Q94 64 94 100 Q94 144 50 144 Q6 144 6 100 Q6 64 38 50 Z',
                '#eef7fc',
            ) +
            k.path('M10 96 Q50 84 90 96 Q90 140 50 140 Q10 140 10 96 Z', k.c('liquid'), {
                bare: true,
            }) +
            k.path(
                'M38 10 L62 10 L62 50 Q94 64 94 100 Q94 144 50 144 Q6 144 6 100 Q6 64 38 50 Z',
                'none',
            ) +
            k.rect(34, 2, 32, 12, '#a8744a', { rx: 3 }) +
            k.circle(34, 110, 5, '#ffffff', { bare: true, opacity: 0.7 }) +
            k.line('M22 76 Q16 90 18 104', { lw: 0.9, color: '#ffffff' }),
    },
    {
        id: 'treasure-chest',
        label: 'Treasure chest',
        category: 'fantasy',
        tags: ['chest', 'treasure', 'loot', 'gold', 'pirate', 'rpg'],
        width: 180,
        height: 140,
        colors: { wood: '#a8683a' },
        draw: (k) =>
            k.rect(12, 62, 156, 72, k.c('wood')) +
            k.path('M12 62 Q12 12 90 12 Q168 12 168 62 Z', k.light('wood', 0.1)) +
            k.rect(30, 12, 14, 122, GOLD, { lw: 0.6 }) +
            k.rect(136, 12, 14, 122, GOLD, { lw: 0.6 }) +
            k.rect(12, 58, 156, 10, GOLD, { lw: 0.6 }) +
            k.rect(78, 60, 24, 30, GOLD, { rx: 3 }) +
            k.circle(90, 74, 4, '#2f2f33', { bare: true }),
    },
    {
        id: 'crystal',
        label: 'Crystal',
        category: 'fantasy',
        tags: ['crystal', 'gem', 'mana', 'ore', 'magic stone'],
        width: 140,
        height: 160,
        colors: { gem: '#9b7fe8' },
        draw: (k) =>
            k.path(pts('20 150 30 80 44 60 58 80 60 150'), k.shade('gem', 0.15)) +
            k.path(pts('80 150 86 90 104 70 120 92 122 150'), k.shade('gem', 0.15)) +
            k.path(pts('44 152 50 40 72 8 94 40 98 152'), k.c('gem')) +
            k.path(pts('72 8 94 40 98 152 72 152'), k.light('gem', 0.25), { bare: true }) +
            k.line('M72 8 L72 152 M50 40 H94', { lw: 0.6 }) +
            k.path(pts('44 152 50 40 72 8 94 40 98 152'), 'none'),
    },
    {
        id: 'scroll',
        label: 'Scroll',
        category: 'fantasy',
        tags: ['scroll', 'parchment', 'quest', 'letter', 'map'],
        width: 200,
        height: 120,
        colors: { paper: '#f1dfb4' },
        draw: (k) =>
            k.rect(26, 18, 148, 84, k.c('paper')) +
            k.line('M44 40 h112 M44 56 h96 M44 72 h104', { lw: 0.5 }) +
            k.rect(10, 10, 20, 100, k.shade('paper', 0.15), { rx: 10 }) +
            k.rect(170, 10, 20, 100, k.shade('paper', 0.15), { rx: 10 }) +
            k.circle(120, 92, 10, '#c7364a', { lw: 0.6 }),
    },
    {
        id: 'dragon-egg',
        label: 'Dragon egg',
        category: 'fantasy',
        tags: ['egg', 'dragon', 'fantasy', 'hatch'],
        width: 110,
        height: 140,
        colors: { shell: '#5fb08a' },
        draw: (k) => {
            let scales = '';
            for (let y = 40; y < 126; y += 16)
                for (let x = 24 + ((y / 16) % 2) * 8; x < 90; x += 16)
                    scales += `M${x} ${y} q8 8 16 0 `;
            return (
                k.path(
                    'M55 6 Q100 6 102 80 Q102 134 55 134 Q8 134 8 80 Q10 6 55 6 Z',
                    k.c('shell'),
                ) +
                k.line(scales, { lw: 0.45 }) +
                k.line('M36 24 Q28 40 28 60', { lw: 1, color: '#ffffff' })
            );
        },
    },
    {
        id: 'quest-board',
        label: 'Quest board',
        category: 'fantasy',
        tags: ['guild', 'quest', 'bounty', 'notice board', 'isekai', 'rpg'],
        width: 220,
        height: 200,
        colors: { wood: '#8f5e3b' },
        draw: (k) =>
            k.limbs(
                [
                    { d: 'M24 100 L24 196', width: 10 },
                    { d: 'M196 100 L196 196', width: 10 },
                ],
                k.shade('wood', 0.15),
            ) +
            k.rect(8, 16, 204, 124, k.c('wood')) +
            k.path(pts('2 18 110 2 218 18'), k.shade('wood', 0.2)) +
            [
                [22, 30, -4],
                [80, 34, 3],
                [140, 28, -2],
                [50, 86, 2],
                [120, 84, -3],
            ]
                .map(
                    ([x, y, a]) =>
                        k.rect(x, y, 50, 44, '#f1dfb4', {
                            lw: 0.5,
                            transform: `rotate(${a} ${x + 25} ${y})`,
                        }) + k.line(`M${x + 8} ${y + 14} h30 M${x + 8} ${y + 24} h22`, { lw: 0.4 }),
                )
                .join(''),
    },
    {
        id: 'crown',
        label: 'Crown',
        category: 'fantasy',
        tags: ['crown', 'king', 'queen', 'royal', 'princess'],
        width: 140,
        height: 100,
        colors: { gold: '#e8b830' },
        draw: (k) =>
            k.path(pts('10 30 40 56 70 14 100 56 130 30 120 90 20 90'), k.c('gold')) +
            k.rect(20, 78, 100, 12, k.shade('gold', 0.15)) +
            k.circle(70, 58, 8, '#e04848', { lw: 0.6 }) +
            k.circle(40, 70, 5, '#4a7bd0', { lw: 0.5 }) +
            k.circle(100, 70, 5, '#5aa05a', { lw: 0.5 }) +
            [10, 70, 130].map((x, i) => k.circle(x, i === 1 ? 12 : 28, 5, k.c('gold'))).join(''),
    },
    {
        id: 'spellbook',
        label: 'Spellbook',
        category: 'fantasy',
        tags: ['grimoire', 'magic book', 'tome', 'witch', 'wizard'],
        width: 150,
        height: 170,
        colors: { cover: '#6a3f8f' },
        draw: (k) =>
            k.rect(24, 12, 116, 148, '#f1dfb4', { rx: 4 }) +
            k.rect(10, 8, 120, 150, k.c('cover'), { rx: 6 }) +
            k.rect(10, 8, 18, 150, k.shade('cover', 0.2), { rx: 6 }) +
            k.stroke(ellipsePath(78, 80, 32, 32), 3, GOLD) +
            k.path(star(78, 80, 26, 10, 5), GOLD, { lw: 0.5 }) +
            k.rect(36, 18, 84, 4, GOLD, { bare: true }) +
            k.rect(36, 140, 84, 4, GOLD, { bare: true }),
    },
    {
        id: 'slime',
        label: 'Slime',
        category: 'fantasy',
        tags: ['slime', 'monster', 'rpg', 'isekai', 'cute', 'enemy'],
        width: 130,
        height: 110,
        colors: { jelly: '#6ec2f0' },
        draw: (k) =>
            k.path(
                'M65 8 Q78 30 108 50 Q128 66 122 90 Q116 106 65 106 Q14 106 8 90 Q2 66 22 50 Q52 30 65 8 Z',
                k.c('jelly'),
            ) +
            k.ellipse(46, 66, 6, 9, '#141414', { bare: true }) +
            k.ellipse(84, 66, 6, 9, '#141414', { bare: true }) +
            k.circle(48, 62, 2.2, '#ffffff', { bare: true }) +
            k.circle(86, 62, 2.2, '#ffffff', { bare: true }) +
            k.line('M58 82 q7 6 14 0', { lw: 0.7 }) +
            k.path(blob(42, 38, 10, 6, 5, k.rand, 0.6), '#ffffff', { bare: true, opacity: 0.6 }),
    },
    {
        id: 'portal',
        label: 'Portal',
        category: 'fantasy',
        tags: ['portal', 'gate', 'warp', 'isekai', 'dimension', 'teleport'],
        width: 160,
        height: 230,
        colors: { swirl: '#8e6fc1' },
        draw: (k) => {
            let spiral = 'M80 116';
            for (let t = 0.4; t < Math.PI * 5; t += 0.25)
                spiral += ` L${n(80 + Math.cos(t) * t * 3.6)} ${n(116 + Math.sin(t) * t * 5.6)}`;
            return (
                k.ellipse(80, 116, 66, 104, k.c('swirl')) +
                k.stroke(spiral, 3, k.light('swirl', 0.5)) +
                k.stroke(ellipsePath(80, 116, 70, 108), 8, '#a8a39a') +
                k.line(ellipsePath(80, 116, 75, 113), { lw: 0.5 }) +
                k.line(ellipsePath(80, 116, 65, 103), { lw: 0.5 })
            );
        },
    },
    {
        id: 'bow',
        label: 'Bow and arrow',
        category: 'fantasy',
        tags: ['bow', 'arrow', 'archer', 'elf', 'weapon'],
        width: 120,
        height: 220,
        colors: { wood: '#9b6b43' },
        draw: (k) =>
            k.line('M30 12 L30 208', { lw: 0.5 }) +
            k.limb('M30 12 Q110 110 30 208', 6, k.c('wood')) +
            k.limb('M14 110 L104 110', 3, '#7a5236') +
            k.path(pts('104 102 118 110 104 118'), STEEL) +
            k.path(pts('6 102 20 110 6 118 14 110'), '#e04848', { lw: 0.5 }),
    },
];
