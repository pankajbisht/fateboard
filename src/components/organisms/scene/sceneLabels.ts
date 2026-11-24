import type { AspectId, FrameShape, Season, TimeOfDay, Weather } from '@/scene/schema/types';

/** Words shown for scene settings (the data keeps ids). */
export const TIME_LABELS: Record<TimeOfDay, string> = {
    morning: 'Morning',
    day: 'Day',
    golden: 'Golden hour',
    night: 'Night',
};
export const WEATHER_LABELS: Record<Weather, string> = {
    clear: 'Clear',
    cloudy: 'Cloudy',
    rain: 'Rain',
    snow: 'Snow',
    fog: 'Fog',
};
export const SEASON_LABELS: Record<Season, string> = {
    spring: 'Spring',
    summer: 'Summer',
    autumn: 'Autumn',
    winter: 'Winter',
};
export const ASPECT_LABELS: Record<AspectId, string> = {
    '16:9': 'Wide 16:9',
    '4:3': 'Classic 4:3',
    '3:2': 'Photo 3:2',
    '1:1': 'Square 1:1',
    '4:5': 'Portrait 4:5',
    '3:4': 'Tall 3:4',
    '9:16': 'Phone 9:16',
    '2.39:1': 'Cinema 2.39:1',
};
export const SHAPE_LABELS: Record<FrameShape, string> = {
    rect: 'Square corners',
    rounded: 'Rounded',
    circle: 'Round',
};
