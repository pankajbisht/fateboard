import { card, ground, patch, wall } from '../build';
import { building, tree } from '../props';
import type { EnvironmentDef, SetPiece } from '../types';

/** A school from outside: the building across a paved yard, a flag, trees along the wall. */
export const school: EnvironmentDef = {
    id: 'school',
    name: 'School yard',
    category: 'city',
    tags: ['school', 'outdoor', 'yard', 'students', 'assembly'],
    variants: [
        { id: 'yard', name: 'Yard' },
        { id: 'gate', name: 'Gate' },
    ],
    stage: { x: 0, z: 0, spread: 320 },
    camera: { position: [0, 160, 820], yaw: 0, pitch: 3 },
    sky: true,
    build({ rand, look, variant }) {
        const out: SetPiece[] = [
            ground(look.foliage.grass),
            patch(-1800, -1300, 1800, 600, '#cdbfa8'),
        ];
        out.push(...building(0, -1700, 2600, 900, 600, '#e8c39e', look, rand, ['front']));
        out.push(
            ...building(-1700, -1500, 800, 640, 700, '#e3b58e', look, rand, ['front', 'right']),
        );
        if (variant === 'gate') {
            out.push(
                wall([-1800, 700], [-250, 700], 180, '#b8a48c', 'mid'),
                wall([250, 700], [1800, 700], 180, '#b8a48c', 'mid'),
            );
            out.push(card('sign', 0, -1350, 360, 160, ['#2f5d8a']));
        } else out.push(card('flag', 450, -900, 120, 650, ['#ff9933']));
        for (let x = -1700; x <= 1700; x += 425)
            out.push(tree(rand, x + rand.range(-60, 60), -1250, ['tree-round']));
        return out;
    },
};
