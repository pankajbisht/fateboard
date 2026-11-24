import { panel, room, row } from '../build';
import { desk, windowGrid } from '../props';
import type { EnvironmentDef, SetPiece } from '../types';

/** A classroom: board on the back wall, desk rows on both sides, windows on the left. */
export const classroom: EnvironmentDef = {
    id: 'classroom',
    name: 'Classroom',
    category: 'indoor',
    tags: ['school', 'class', 'indoor', 'students', 'teacher'],
    variants: [
        { id: 'blackboard', name: 'Blackboard' },
        { id: 'whiteboard', name: 'Whiteboard' },
    ],
    stage: { x: 0, z: 0, spread: 260 },
    camera: { position: [0, 150, 760], yaw: 0, pitch: 4 },
    sky: false,
    build({ variant, look }) {
        const white = variant === 'whiteboard';
        const out: SetPiece[] = room({
            width: 1300,
            back: -520,
            front: 900,
            height: 330,
            wall: white ? '#e9eef2' : '#efe3c8',
            floor: white ? '#c9b79c' : '#b98a5a',
            ceiling: '#f4efe6',
        });
        out.push(panel(0, 175, -518, 440, 135, white ? '#fbfbfb' : '#2f4a3a', '#6b4a2e'));
        out.push(panel(0, 95, -516, 460, 8, '#6b4a2e'));
        out.push(
            panel(-420, 210, -518, 90, 120, '#e5c07b'),
            panel(420, 210, -518, 90, 120, '#8fb3d9'),
        );
        out.push(
            ...windowGrid({
                axis: 'x',
                at: -650,
                side: 1,
                from: -420,
                to: 640,
                y0: 80,
                y1: 300,
                cols: 3,
                rows: 1,
                fill: 0.7,
                color: look.night ? '#1d2433' : '#cfe6fa',
                layer: 'back',
            }),
        );
        for (const x of [-470, 470]) out.push(...row(3, -250, 260, (_, z) => desk(x, z)).flat());
        out.push(...desk(-330, -400, '#7a4a28'));
        return out;
    },
};
