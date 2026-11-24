import { darken } from '@/character/render/styles';
import { box, card, panel, patch, room } from '../build';
import { windowGrid } from '../props';
import type { EnvironmentDef, SetPiece } from '../types';

/** A home: a living room (sofa, TV, plant) or a bedroom (bed, wardrobe, desk). */
export const homeRoom: EnvironmentDef = {
    id: 'room',
    name: 'Room',
    category: 'indoor',
    tags: ['home', 'house', 'indoor', 'family', 'living room', 'bedroom'],
    variants: [
        { id: 'living', name: 'Living room' },
        { id: 'bedroom', name: 'Bedroom' },
    ],
    stage: { x: 0, z: 0, spread: 200 },
    camera: { position: [0, 150, 700], yaw: 0, pitch: 4 },
    sky: false,
    build({ variant, look }) {
        const bed = variant === 'bedroom';
        const wall = bed ? '#d7e3ea' : '#efd9c3';
        const out: SetPiece[] = room({
            width: 1000,
            back: -460,
            front: 820,
            height: 290,
            wall,
            floor: '#a77b55',
            ceiling: '#f6f1ea',
        });
        out.push(patch(-260, -220, 260, 220, bed ? '#7d9cc0' : '#b5574b', 0.6));
        out.push(
            ...windowGrid({
                axis: 'z',
                at: -460,
                side: 1,
                from: -130,
                to: 130,
                y0: 100,
                y1: 260,
                cols: 1,
                rows: 1,
                fill: 0.9,
                color: look.night ? '#1d2433' : '#cfe6fa',
                layer: 'back',
            }),
        );
        if (bed) {
            out.push(
                box(-330, -320, 200, 45, 230, '#8a5a34'),
                box(-330, -320, 190, 18, 220, '#f4f4f4', { y: 45 }),
            );
            out.push(box(-330, -425, 200, 110, 12, '#7a4a28'));
            out.push(box(380, -390, 160, 220, 60, '#9b6b43', { top: darken('#9b6b43', 0.1) }));
            out.push(box(330, 120, 120, 75, 60, '#c79a6b'));
        } else {
            out.push(
                box(0, -380, 260, 45, 90, '#4f6d8f'),
                box(0, -415, 260, 55, 20, '#4f6d8f', { y: 45 }),
            );
            out.push(box(-360, 60, 90, 45, 210, '#4f6d8f', { rotY: 0 }));
            out.push(
                box(380, -380, 180, 60, 50, '#5b4636'),
                panel(380, 150, -455, 170, 100, '#151a22'),
            );
            out.push(card('bush', -420, -380, 80, 130));
        }
        return out;
    },
};
