import { card, ground, patch, row } from '../build';
import { building, car, lamp } from '../props';
import type { EnvironmentDef, SetPiece } from '../types';

/** Downtown: a street running away from the camera between towers (one-point perspective), lamps, cars. */
export const city: EnvironmentDef = {
    id: 'city',
    name: 'City street',
    category: 'city',
    tags: ['city', 'downtown', 'towers', 'street', 'urban', 'neon', 'outdoor'],
    variants: [
        { id: 'downtown', name: 'Downtown' },
        { id: 'neon', name: 'Neon night' },
    ],
    stage: { x: 0, z: 0, spread: 260 },
    camera: { position: [0, 160, 800], yaw: 0, pitch: 2 },
    sky: true,
    build({ rand, look, variant }) {
        const neon = variant === 'neon';
        const out: SetPiece[] = [
            ground('#b5b0a6'),
            patch(-450, -30_000, 450, 900, '#45484d', 0.6),
            ...row(40, -500, -700, (_, z) => patch(-10, z - 300, 10, z, '#f2f2f2', 1)),
        ];
        const palette = neon
            ? ['#2b2d42', '#3d3b5c', '#1f2a44', '#402a4f']
            : ['#c9d6df', '#b7c3cf', '#d4c5a3', '#9aa5b1', '#e3b58e'];
        for (const side of [-1, 1] as const) {
            let z = 400;
            while (z > -14_000) {
                const d = rand.range(600, 1100);
                const w = rand.range(700, 1100);
                out.push(
                    ...building(
                        side * (750 + w / 2),
                        z - d / 2,
                        w,
                        rand.range(1500, 6000),
                        d - 40,
                        rand.pick(palette),
                        look,
                        rand,
                        [side < 0 ? 'right' : 'left', 'front'],
                    ),
                );
                z -= d;
            }
        }
        out.push(...row(6, -400, -1600, (i, z) => lamp(i % 2 ? 560 : -560, z)));
        out.push(
            ...car(-220, -1800, 0, '#f1c40f'),
            ...car(220, -3400, 180, '#c0392b'),
            card('traffic-light', 600, -900, 70, 380),
        );
        if (neon)
            out.push(
                card('sign', -620, -1300, 260, 180, ['#ff2e88', '#2b2d42']),
                card('sign', 640, -2500, 260, 180, ['#00e5ff', '#2b2d42']),
            );
        return out;
    },
};
