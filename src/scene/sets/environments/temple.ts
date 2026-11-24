import { darken, lighten } from '@/character/render/styles';
import { box, card, ground, panel, patch, row } from '../build';
import { steps, tree } from '../props';
import type { EnvironmentDef, SetPiece } from '../types';

/** A temple court: paved ground, rows of pillars, steps up to the shrine, flags. */
export const temple: EnvironmentDef = {
    id: 'temple',
    name: 'Temple',
    category: 'landmark',
    tags: ['temple', 'mandir', 'shrine', 'festival', 'pillars', 'outdoor'],
    variants: [
        { id: 'stone', name: 'Stone' },
        { id: 'painted', name: 'Painted' },
    ],
    stage: { x: 0, z: 0, spread: 260 },
    camera: { position: [0, 160, 820], yaw: 0, pitch: 3 },
    sky: true,
    build({ rand, look, variant }) {
        const stone = variant === 'painted' ? '#e9b872' : '#d9cdb4';
        const gold = '#d4a017';
        const out: SetPiece[] = [
            ground(look.foliage.grass),
            patch(-1500, -2200, 1500, 700, lighten(stone, 0.1), 0.5),
        ];
        out.push(...steps(0, -1110, 1300, 4, 30, 70, darken(stone, 0.05)));
        // the shrine: a plinth, the sanctum with its door, then the tower narrowing in tiers to a finial
        out.push(box(0, -1600, 1300, 120, 420, stone, { layer: 'back' }));
        out.push(box(0, -1650, 640, 420, 380, stone, { y: 120, layer: 'back' }));
        out.push(panel(0, 300, -1459, 170, 260, '#3b2a1e'));
        const tiers = 6;
        for (let i = 0; i < tiers; i++) {
            const k = 1 - i / (tiers + 1);
            out.push(
                box(0, -1650, 560 * k, 150, 340 * k, i % 2 ? darken(stone, 0.06) : stone, {
                    y: 540 + i * 150,
                    layer: 'back',
                }),
            );
        }
        out.push(
            card('pillar', 0, -1650, 70, 160, [gold], {
                at: [0, 540 + tiers * 150, -1650],
                layer: 'back',
            }),
        );
        for (const x of [-750, 750])
            out.push(...row(4, -700, -450, (_, z) => card('pillar', x, z, 90, 420, [stone])));
        out.push(
            card('flag', -1050, -1300, 120, 700, ['#ff9933']),
            card('flag', 1050, -1300, 120, 700, ['#ff9933']),
        );
        for (let x = -3000; x <= 3000; x += 500)
            if (Math.abs(x) > 1600) out.push(tree(rand, x, -1900, ['tree-round', 'tree-palm']));
        return out;
    },
};
