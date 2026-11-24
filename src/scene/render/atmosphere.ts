import { circle } from '@/character/render/shapes';
import { vanishingPoint, type P2, type View } from '../camera/projection';
import type { CardPiece } from '../sets/types';
import type { WorldLook } from '../world/look';
import type { Rand } from '../world/random';
import { polyPath } from './geometry';
import { LAYER, type SceneDrawable, type SortItem } from './types';

/**
 * The sky behind everything (a gradient, the sun or moon where the light comes from, stars at night), clouds as
 * far cards in the world (they turn with the camera), and the weather drawn over the picture (rain, snow, fog).
 */
export function skyItems(
    v: View,
    look: WorldLook,
    open: boolean,
    horizonY: number | null,
    rand: Rand,
): SortItem[] {
    const full = polyPath([
        [0, 0],
        [v.width, 0],
        [v.width, v.height],
        [0, v.height],
    ]);
    const items: SceneDrawable[] = [
        {
            key: 'sky',
            d: full,
            fill: open
                ? {
                      kind: 'linear',
                      angle: 90,
                      stops: [
                          [0, look.sky.top],
                          [1, look.sky.bottom],
                      ],
                  }
                : '#3a3a40',
            stroke: null,
            strokeWidth: 0,
        },
    ];
    if (open && look.weather === 'clear') {
        const sun = vanishingPoint(v, look.sun);
        if (sun && sun[0] > -40 && sun[0] < v.width + 40 && sun[1] > -40 && sun[1] < v.height)
            items.push({
                key: 'sun',
                d: circle(sun, look.night ? 18 : 26),
                fill: look.night ? '#f4f1de' : '#fff4c2',
                stroke: null,
                strokeWidth: 0,
                opacity: look.night ? 0.95 : 0.9,
            });
        if (look.night) {
            let d = '';
            const below = horizonY ?? v.height;
            for (let i = 0; i < 70; i++) {
                const p: P2 = [rand.range(0, v.width), rand.range(0, Math.max(0, below - 10))];
                d += circle(p, rand.range(0.6, 1.6));
            }
            if (d)
                items.push({
                    key: 'stars',
                    d,
                    fill: '#ffffff',
                    stroke: null,
                    strokeWidth: 0,
                    opacity: 0.8,
                });
        }
    }
    return [{ layer: LAYER.sky, distance: 0, items }];
}

/** Clouds in a ring far around the scene (none in a closed room or at night without weather). */
export function cloudPieces(look: WorldLook, rand: Rand): CardPiece[] {
    const n =
        look.weather === 'clear'
            ? 6
            : look.weather === 'cloudy' || look.weather === 'rain'
              ? 14
              : 0;
    const out: CardPiece[] = [];
    for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + rand.range(-0.2, 0.2);
        const r = rand.range(30_000, 45_000);
        const w = rand.range(7000, 14_000);
        out.push({
            kind: 'card',
            shape: 'cloud',
            layer: 'back',
            at: [Math.sin(a) * r, rand.range(5000, 11_000), Math.cos(a) * r],
            width: w,
            height: w * 0.45,
            colors: [look.weather === 'clear' ? '#ffffff' : look.night ? '#3a4258' : '#c9d0d8'],
        });
    }
    return out;
}

export function weatherItems(v: View, look: WorldLook, rand: Rand): SortItem[] {
    const items: SceneDrawable[] = [];
    if (look.weather === 'rain') {
        let d = '';
        for (let i = 0; i < 160; i++) {
            const x = rand.range(-40, v.width);
            const y = rand.range(-20, v.height);
            const l = rand.range(14, 26);
            d += polyPath(
                [
                    [x, y],
                    [x + l * 0.25, y + l],
                ],
                false,
            );
        }
        items.push({
            key: 'rain',
            d,
            fill: 'none',
            stroke: '#dfe8f2',
            strokeWidth: 1,
            opacity: 0.55,
        });
    } else if (look.weather === 'snow') {
        let d = '';
        for (let i = 0; i < 140; i++)
            d += circle([rand.range(0, v.width), rand.range(0, v.height)], rand.range(1.2, 3.2));
        items.push({
            key: 'snow',
            d,
            fill: '#ffffff',
            stroke: null,
            strokeWidth: 0,
            opacity: 0.85,
        });
    } else if (look.weather === 'fog') {
        items.push({
            key: 'fog',
            d: polyPath([
                [0, 0],
                [v.width, 0],
                [v.width, v.height],
                [0, v.height],
            ]),
            fill: look.sky.bottom,
            stroke: null,
            strokeWidth: 0,
            opacity: 0.18,
        });
    }
    return items.length ? [{ layer: LAYER.weather, distance: 0, items }] : [];
}
