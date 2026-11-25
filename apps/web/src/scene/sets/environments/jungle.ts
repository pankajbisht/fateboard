import { card, ground, patch } from '../build';
import { tree } from '../props';
import { scatter } from '../build';
import type { EnvironmentDef, SetPiece } from '../types';

/** A jungle: trees, palms, ferns and rocks all around a clearing where the actors stand. */
export const jungle: EnvironmentDef = {
    id: 'jungle',
    name: 'Jungle',
    category: 'nature',
    tags: ['jungle', 'forest', 'trees', 'nature', 'adventure', 'outdoor'],
    variants: [
        { id: 'clearing', name: 'Clearing' },
        { id: 'dense', name: 'Dense' },
    ],
    stage: { x: 0, z: 0, spread: 260 },
    camera: { position: [0, 155, 780], yaw: 0, pitch: 3 },
    sky: true,
    build({ rand, look, variant }) {
        const dense = variant === 'dense';
        const out: SetPiece[] = [ground('#56733a'), patch(-500, -400, 500, 350, '#7a6a45', 0.4)];
        const kinds = ['tree-round', 'tree-palm', 'tree-round', 'fern', 'bush'];
        for (const [x, z] of scatter(
            rand,
            { x0: -4000, z0: -4500, x1: 4000, z1: 600 },
            dense ? 110 : 60,
            260,
            { x: 0, z: 0, r: 650 },
        ))
            out.push(tree(rand, x, z, kinds));
        for (const [x, z] of scatter(rand, { x0: -900, z0: -600, x1: 900, z1: 500 }, 8, 200, {
            x: 0,
            z: 0,
            r: 420,
        }))
            out.push(rand.chance(0.5) ? card('fern', x, z, 140, 100) : card('rock', x, z, 90, 55));
        if (dense)
            out.push(
                card('fern', -520, 520, 420, 300, [look.foliage.leafDark], { layer: 'front' }),
            );
        return out;
    },
};
