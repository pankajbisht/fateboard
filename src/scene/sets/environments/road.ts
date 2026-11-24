import { card, ground, patch, row } from '../build';
import { building, car, lamp } from '../props';
import type { EnvironmentDef, SetPiece } from '../types';

/** A street: footpath where the actors stand, a road behind them with traffic, shops across it. */
export const road: EnvironmentDef = {
    id: 'road',
    name: 'Road',
    category: 'city',
    tags: ['street', 'road', 'traffic', 'town', 'outdoor', 'footpath'],
    variants: [
        { id: 'town', name: 'Town' },
        { id: 'highway', name: 'Highway' },
    ],
    stage: { x: 0, z: 0, spread: 300 },
    camera: { position: [0, 155, 780], yaw: 0, pitch: 2 },
    sky: true,
    build({ rand, look, variant }) {
        const town = variant !== 'highway';
        const out: SetPiece[] = [
            ground(town ? '#b9b3a8' : look.foliage.grass),
            patch(-8000, -250, 8000, 400, '#cfc8bb'),
            patch(-8000, -1150, 8000, -250, '#4a4d52', 0.8),
        ];
        out.push(
            ...row(40, -7800, 400, (_, x) => patch(x, -715, x + 220, -685, '#f2f2f2', 1.1)),
            patch(-8000, -262, 8000, -250, '#e0d24a', 1.1),
        );
        out.push(...car(-700, -900, 90, '#c0392b'), ...car(900, -500, 90, '#2e86c1'));
        if (town) {
            out.push(patch(-8000, -1400, 8000, -1150, '#cfc8bb', 0.6));
            const colors = ['#e8c39e', '#c9d6df', '#e3a587', '#d4c5a3', '#b7c9a8'];
            let x = -3000;
            while (x < 3000) {
                const w = rand.range(500, 900);
                out.push(
                    ...building(
                        x + w / 2,
                        -1800,
                        w - 30,
                        rand.range(600, 1500),
                        700,
                        rand.pick(colors),
                        look,
                        rand,
                    ),
                );
                x += w;
            }
            out.push(lamp(-600, -200), lamp(600, -200), card('traffic-light', 1300, -200, 70, 380));
        } else out.push(...row(10, -4500, 1000, (_, x) => card('tree-round', x, -1700, 400, 520)));
        return out;
    },
};
