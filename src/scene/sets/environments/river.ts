import { box, card, ground, patch, row } from '../build';
import { tree } from '../props';
import type { EnvironmentDef, SetPiece } from '../types';

/** A river bank: grass, the water behind the actors, the far bank with trees; or stone steps (ghat). */
export const river: EnvironmentDef = {
    id: 'river',
    name: 'River',
    category: 'nature',
    tags: ['river', 'water', 'bank', 'nature', 'ghat', 'outdoor'],
    variants: [
        { id: 'bank', name: 'Bank' },
        { id: 'ghat', name: 'Ghat steps' },
    ],
    stage: { x: 0, z: 0, spread: 280 },
    camera: { position: [0, 160, 800], yaw: 0, pitch: 3 },
    sky: true,
    build({ rand, look, variant }) {
        const water = look.night ? '#24406a' : '#4f8fc0';
        const out: SetPiece[] = [
            ground(look.foliage.grass),
            patch(-9000, -2600, 9000, -400, water, 0.4),
        ];
        out.push(
            ...row(18, -3000, 350, (i, x) =>
                patch(x, -800 - (i % 4) * 300, x + 160, -790 - (i % 4) * 300, '#9cc7e6', 0.7),
            ),
        );
        if (variant === 'ghat') {
            out.push(patch(-1200, -400, 1200, 300, '#cdbfa8', 0.6));
            out.push(
                ...row(6, -1100, 440, (_, x) => patch(x, -430, x + 400, -400, '#b8a98f', 0.65)),
            );
            for (const x of [-900, 900])
                out.push(
                    box(x, -250, 220, 260, 200, '#d9cdb4'),
                    card('flag', x, -250, 80, 520, ['#ff9933']),
                );
        } else
            out.push(
                card('rock', -650, -360, 160, 90),
                card('rock', 760, -420, 220, 110),
                card('bush', -1100, -200, 180, 110),
            );
        for (let x = -3500; x <= 3500; x += rand.range(250, 450))
            out.push(tree(rand, x, -2800 - rand.range(0, 400)));
        return out;
    },
};
