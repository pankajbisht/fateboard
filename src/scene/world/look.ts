import { lighten, mixColor } from '@/character/render/styles';
import type { Season, SceneSet, TimeOfDay, V3, Weather } from '../schema/types';

/**
 * One light for the whole scene (docs/CHARACTER_STUDIO.md §9.2): time of day, weather and season give the sun
 * direction, the sky, a colour grade applied to set and actors alike, and the season's plant colours.
 */
export interface WorldLook {
    /** unit world direction toward the sun / moon */
    sun: V3;
    /** how much faces turned away from the sun darken (0 = flat light) */
    contrast: number;
    sky: { top: string; bottom: string };
    /** colour grade (identity by day) */
    grade: (hex: string) => string;
    /** plants: leaves, darker leaves, grass */
    foliage: { leaf: string; leafDark: string; grass: string };
    /** ground cover: snow in winter */
    snow: boolean;
    weather: Weather;
    night: boolean;
}

const SUN: Record<TimeOfDay, { az: number; el: number }> = {
    morning: { az: -60, el: 22 },
    day: { az: -35, el: 55 },
    golden: { az: 70, el: 9 },
    night: { az: -30, el: 40 },
};

const SKY: Record<TimeOfDay, { top: string; bottom: string }> = {
    morning: { top: '#7fb3e6', bottom: '#f6d9b8' },
    day: { top: '#5d9ee8', bottom: '#cfe6fa' },
    golden: { top: '#5a6fb0', bottom: '#f7b267' },
    night: { top: '#0b1430', bottom: '#2a3a66' },
};

const GRADE: Record<TimeOfDay, { tint: string; amount: number }> = {
    morning: { tint: '#ffe7c4', amount: 0.08 },
    day: { tint: '#ffffff', amount: 0 },
    golden: { tint: '#ff9a3c', amount: 0.2 },
    night: { tint: '#1a2450', amount: 0.55 },
};

const FOLIAGE: Record<Season, WorldLook['foliage']> = {
    spring: { leaf: '#7cc46a', leafDark: '#4f9a4a', grass: '#8fcf72' },
    summer: { leaf: '#3f9a4a', leafDark: '#2b7339', grass: '#6db55a' },
    autumn: { leaf: '#e08a2e', leafDark: '#b5552a', grass: '#a5a855' },
    winter: { leaf: '#5d7f6a', leafDark: '#3f5e50', grass: '#e9eef2' },
};

const RAD = Math.PI / 180;

export function worldLook(set: Pick<SceneSet, 'time' | 'weather' | 'season'>): WorldLook {
    const { az, el } = SUN[set.time];
    const sun: V3 = [
        Math.sin(az * RAD) * Math.cos(el * RAD),
        Math.sin(el * RAD),
        Math.cos(az * RAD) * Math.cos(el * RAD),
    ];
    const overcast = set.weather !== 'clear';
    let sky = SKY[set.time];
    if (overcast) {
        const grey = set.time === 'night' ? '#1c2233' : '#9aa5b1';
        sky = { top: mixColor(sky.top, grey, 0.65), bottom: mixColor(sky.bottom, grey, 0.55) };
    }
    if (set.weather === 'fog')
        sky = { top: lighten(sky.top, 0.35), bottom: lighten(sky.bottom, 0.5) };
    const g = GRADE[set.time];
    const greyOut = overcast ? 0.12 : 0;
    const grade = (hex: string) => {
        let c = g.amount ? mixColor(hex, g.tint, g.amount) : hex;
        if (greyOut) c = mixColor(c, '#8a929c', greyOut);
        return c;
    };
    return {
        sun,
        contrast: overcast ? 0.12 : set.time === 'night' ? 0.2 : 0.3,
        sky,
        grade,
        foliage: FOLIAGE[set.season],
        snow: set.season === 'winter' || set.weather === 'snow',
        weather: set.weather,
        night: set.time === 'night',
    };
}
