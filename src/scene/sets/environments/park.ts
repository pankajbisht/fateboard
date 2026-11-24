import { box, card, ground, line, patch } from '../build';
import { bench, lamp, tree } from '../props';
import { scatter } from '../build';
import type { EnvironmentDef, SetPiece } from '../types';

/** A park: grass, a path, benches, lamps, a pond and trees; or a playground with a slide and swings. */
export const park: EnvironmentDef = {
    id: 'park',
    name: 'Park',
    category: 'nature',
    tags: ['park', 'garden', 'grass', 'trees', 'bench', 'playground', 'outdoor'],
    variants: [
        { id: 'garden', name: 'Garden' },
        { id: 'playground', name: 'Playground' },
    ],
    stage: { x: 0, z: 0, spread: 300 },
    camera: { position: [0, 155, 800], yaw: 0, pitch: 3 },
    sky: true,
    build({ rand, look, variant }) {
        const out: SetPiece[] = [
            ground(look.foliage.grass),
            patch(-6000, -250, 6000, 250, '#d8c9a8', 0.5),
        ];
        out.push(...bench(-650, -380), ...bench(650, -380), lamp(-1100, -330), lamp(1100, -330));
        if (variant === 'playground') {
            out.push(patch(-900, -1500, 900, -650, '#e2c48f', 0.6));
            out.push(
                box(-400, -1000, 70, 220, 70, '#d9534f'),
                box(-400, -870, 60, 8, 260, '#f0ad4e', { y: 110 }),
            );
            out.push(
                line(
                    [
                        [250, 0, -1050],
                        [350, 260, -1050],
                        [650, 260, -1050],
                        [750, 0, -1050],
                    ],
                    '#5b5b5b',
                    7,
                ),
                line(
                    [
                        [420, 260, -1050],
                        [420, 60, -1050],
                    ],
                    '#7a7a7a',
                    2,
                ),
                line(
                    [
                        [580, 260, -1050],
                        [580, 60, -1050],
                    ],
                    '#7a7a7a',
                    2,
                ),
                box(500, -1050, 220, 6, 40, '#3a6ea5', { y: 55 }),
            );
        } else out.push(patch(-1700, -1700, -500, -900, look.night ? '#24406a' : '#5c9ccc', 0.6));
        for (const [x, z] of scatter(rand, { x0: -4500, z0: -4000, x1: 4500, z1: -700 }, 40, 380, {
            x: -1100,
            z: -1300,
            r: 600,
        }))
            out.push(tree(rand, x, z));
        out.push(card('bush', -1400, 200, 200, 120), card('bush', 1500, 150, 240, 130));
        return out;
    },
};
