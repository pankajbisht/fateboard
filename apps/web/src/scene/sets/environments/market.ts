import { box, card, ground, line, patch } from '../build';
import { building, stall } from '../props';
import type { EnvironmentDef, SetPiece } from '../types';

/** A street market: rows of striped stalls, crates, bunting, shoppers in the back; or a night bazaar. */
export const market: EnvironmentDef = {
    id: 'market',
    name: 'Market',
    category: 'city',
    tags: ['market', 'bazaar', 'shops', 'stalls', 'crowd', 'outdoor', 'city'],
    variants: [
        { id: 'day', name: 'Day market' },
        { id: 'bazaar', name: 'Night bazaar' },
    ],
    stage: { x: 0, z: 0, spread: 260 },
    camera: { position: [0, 155, 780], yaw: 0, pitch: 3 },
    sky: true,
    build({ rand, look, variant }) {
        const out: SetPiece[] = [ground('#b8ab95'), patch(-4000, -3000, 4000, 600, '#c9bda6', 0.5)];
        const awnings = ['#d9534f', '#3a6ea5', '#f0ad4e', '#5cb85c', '#8e44ad', '#e67e22'];
        for (const x of [-1500, -750, 750, 1500])
            out.push(...stall(x, -650, rand.pick(awnings), look));
        for (const x of [-1100, 0, 1100])
            out.push(...stall(x + rand.range(-80, 80), -1500, rand.pick(awnings), look));
        out.push(
            box(-520, -420, 60, 40, 50, '#9b6b43'),
            box(-470, -380, 60, 40, 50, '#9b6b43'),
            box(-500, -400, 60, 40, 50, '#b07a4a', { y: 40 }),
        );
        const flags = variant === 'bazaar' || look.night ? '#ffd27a' : '#e05050';
        out.push(
            line(
                [
                    [-2200, 300, -1100],
                    [-1100, 260, -1100],
                    [0, 300, -1100],
                    [1100, 260, -1100],
                    [2200, 300, -1100],
                ],
                flags,
                4,
            ),
        );
        const people = ['#5b6b8c', '#a0522d', '#2e8b57', '#c0392b', '#6c5ce7'];
        for (let x = -2600; x <= 2600; x += rand.range(160, 300))
            out.push(
                card('person', x, -2100 - rand.range(0, 400), 60, rand.range(150, 180), [
                    rand.pick(people),
                ]),
            );
        let x = -3200;
        while (x < 3200) {
            const w = rand.range(500, 800);
            out.push(
                ...building(
                    x + w / 2,
                    -3200,
                    w - 20,
                    rand.range(500, 900),
                    500,
                    rand.pick(['#e3b58e', '#d4c5a3', '#c9d6df']),
                    look,
                    rand,
                ),
            );
            x += w;
        }
        return out;
    },
};
