import { box, ground, line } from '../build';
import { building } from '../props';
import type { EnvironmentDef, SetPiece } from '../types';

/**
 * A flat roof high above the city: parapet, water tanks, an antenna; the skyline below. The roof is the top of
 * a building in the `back` layer with the city, so it hides what is below it and the actors stand on it.
 */
const DROP = -3000;

export const rooftop: EnvironmentDef = {
    id: 'rooftop',
    name: 'Rooftop',
    category: 'city',
    tags: ['rooftop', 'roof', 'terrace', 'city', 'skyline', 'outdoor'],
    variants: [
        { id: 'terrace', name: 'Terrace' },
        { id: 'water-tank', name: 'Water tanks' },
    ],
    stage: { x: 0, z: 0, spread: 260 },
    camera: { position: [0, 165, 760], yaw: 0, pitch: 2 },
    sky: true,
    build({ rand, look, variant }) {
        const below = ground('#8f9a8a', 30_000);
        const out: SetPiece[] = [
            { ...below, points: below.points.map(([x, , z]) => [x, DROP, z]) },
            box(0, 100, 1820, -DROP, 1620, '#a9a39a', { y: DROP, top: '#b9b4ab', layer: 'back' }),
        ];
        const parapet = '#c9c3b8';
        out.push(
            box(0, -700, 1820, 95, 20, parapet),
            box(-900, 100, 20, 95, 1620, parapet),
            box(900, 100, 20, 95, 1620, parapet),
        );
        out.push(box(650, -500, 220, 210, 220, '#8d8f94'));
        if (variant === 'water-tank')
            out.push(
                box(-560, -480, 150, 170, 150, '#3b3f46'),
                box(-330, -480, 150, 170, 150, '#3b3f46'),
            );
        out.push(
            line(
                [
                    [-700, 0, -650],
                    [-700, 420, -650],
                ],
                '#5b5b5b',
                3,
            ),
            line(
                [
                    [-760, 380, -650],
                    [-640, 380, -650],
                ],
                '#5b5b5b',
                3,
            ),
        );
        const colors = ['#c9d6df', '#b7c3cf', '#d4c5a3', '#9aa5b1', '#e3b58e'];
        for (let i = 0; i < 40; i++) {
            const a = (i / 40) * Math.PI * 2;
            const r = rand.range(3500, 9000);
            const w = rand.range(700, 1400);
            const h = rand.range(2200, 6000);
            const tower = building(
                Math.sin(a) * r,
                Math.cos(a) * r - 1500,
                w,
                h,
                w,
                rand.pick(colors),
                look,
                rand,
                ['front', 'left', 'right', 'back'],
                DROP,
            );
            out.push(...tower.map((p) => ({ ...p, layer: 'back' as const })));
        }
        return out;
    },
};
