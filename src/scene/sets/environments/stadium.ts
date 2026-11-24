import { darken } from '@/character/render/styles';
import { box, card, ground, line, patch, row } from '../build';
import type { EnvironmentDef, SetPiece } from '../types';

/** A sports ground: a striped field with lines, the goal or the pitch, stands full of people, floodlights. */
export const stadium: EnvironmentDef = {
    id: 'stadium',
    name: 'Stadium',
    category: 'landmark',
    tags: ['stadium', 'sports', 'football', 'cricket', 'match', 'crowd', 'outdoor'],
    variants: [
        { id: 'football', name: 'Football' },
        { id: 'cricket', name: 'Cricket' },
    ],
    stage: { x: 0, z: 0, spread: 340 },
    camera: { position: [0, 160, 860], yaw: 0, pitch: 3 },
    sky: true,
    build({ rand, variant, look }) {
        const grass = look.snow ? '#9fb79a' : '#4f9a45';
        const out: SetPiece[] = [ground(darken(grass, 0.1))];
        out.push(
            ...row(14, -7000, 1000, (i, z) =>
                patch(-5000, z, 5000, z + 500, i % 2 ? grass : darken(grass, 0.07), 0.3),
            ),
        );
        const white = '#f4f4f4';
        if (variant === 'cricket') {
            out.push(patch(-150, -1600, 150, -400, '#d6c08f', 0.6));
            for (const z of [-1500, -500])
                out.push(
                    ...row(3, -12, 12, (_, x) =>
                        line(
                            [
                                [x, 0, z],
                                [x, 72, z],
                            ],
                            '#e8d9b0',
                            3,
                        ),
                    ),
                );
        } else {
            out.push(
                line(
                    [
                        [-4000, 0.8, -800],
                        [4000, 0.8, -800],
                    ],
                    white,
                    8,
                    'ground',
                ),
            );
            out.push(
                line(
                    [
                        [-4000, 0.8, 3000],
                        [-4000, 0.8, -4500],
                        [4000, 0.8, -4500],
                        [4000, 0.8, 3000],
                    ],
                    white,
                    8,
                    'ground',
                ),
            );
            out.push(card('goal', 0, -4400, 732, 244));
        }
        const people = ['#d9534f', '#3a6ea5', '#f0ad4e', '#5cb85c', '#e0e0e0', '#8e44ad'];
        for (let tier = 0; tier < 5; tier++) {
            const z = -5600 - tier * 260;
            out.push(
                box(0, z, 11000, 120 + tier * 120, 260, '#9aa1a9', {
                    layer: 'back',
                    top: '#b7bdc3',
                }),
            );
            for (let x = -5200; x <= 5200; x += rand.range(70, 130))
                out.push(
                    card('person', x, z, 55, 95, [rand.pick(people), '#e0b896'], {
                        at: [x, 120 + tier * 120, z + 60],
                        layer: 'back',
                    }),
                );
        }
        for (const x of [-5600, 5600])
            out.push(
                line(
                    [
                        [x, 0, -6400],
                        [x, 2600, -6400],
                    ],
                    '#6b7078',
                    30,
                    'back',
                ),
                box(x, -6400, 500, 260, 60, '#e9eef2', { y: 2600, layer: 'back' }),
            );
        return out;
    },
};
