import { ground, patch, wall } from '../build';
import type { EnvironmentDef } from '../types';

/** A photo studio: a floor and a backdrop that curves into it. Neutral, for character line-ups. */
export const studio: EnvironmentDef = {
    id: 'studio',
    name: 'Studio',
    category: 'studio',
    tags: ['plain', 'backdrop', 'neutral', 'line-up'],
    variants: [
        { id: 'light', name: 'Light' },
        { id: 'dark', name: 'Dark' },
        { id: 'blue', name: 'Blue screen' },
    ],
    stage: { x: 0, z: 0, spread: 260 },
    camera: { position: [0, 150, 760], yaw: 0, pitch: 4 },
    sky: false,
    build({ variant }) {
        const c =
            variant === 'dark'
                ? { floor: '#3a3d45', wall: '#2b2e35' }
                : variant === 'blue'
                  ? { floor: '#2f6fd1', wall: '#2f6fd1' }
                  : { floor: '#e7e2da', wall: '#f1ede6' };
        return [
            ground(c.floor, 6000),
            patch(-2400, -900, 2400, -700, c.wall, 0.3),
            { ...wall([-6000, -900], [6000, -900], 4000, c.wall, 'back'), shade: false },
        ];
    },
};
