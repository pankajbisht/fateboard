import type { PropCategory, PropDef } from '../types';
import { ANIMAL_PROPS } from './animals';
import { BACKDROP_PROPS } from './backdrops';
import { FANTASY_PROPS } from './fantasy';
import { FOOD_PROPS } from './food';
import { SEASON_PROPS } from './seasons';
import { SPORT_PROPS } from './sports';
import { TECH_PROPS } from './tech';
import { TRAVEL_PROPS } from './travel';
import { BUILDING_PROPS } from './buildings';
import { CITY_BUILDING_PROPS } from './buildingsCity';
import { CLASSROOM_PROPS } from './classroom';
import { CLASSROOM_ITEM_PROPS } from './classroomItems';
import { EFFECT_PROPS } from './effects';
import { JAPAN_PROPS } from './japan';
import { JAPAN_HOME_PROPS } from './japanHome';
import { FURNITURE_PROPS } from './furniture';
import { ROOM_PROPS } from './furnitureRoom';
import { GROUND_PROPS } from './ground';
import { KITCHEN_PROPS } from './kitchen';
import { SKY_PROPS } from './sky';
import { STREET_PROPS } from './street';
import { STREET_SIGN_PROPS } from './streetSigns';
import { TREE_PROPS } from './trees';
import { TWO_WHEEL_PROPS } from './twoWheels';
import { VEHICLE_PROPS } from './vehicles';

/** The Scene Objects catalogue (docs/PROPS.md). Categories appear in this order in the panel. */
export const PROP_CATEGORIES: readonly { id: PropCategory; label: string }[] = [
    { id: 'nature', label: 'Nature' },
    { id: 'sky', label: 'Sky' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'furniture', label: 'Furniture' },
    { id: 'kitchen', label: 'Kitchen' },
    { id: 'street', label: 'Street' },
    { id: 'buildings', label: 'Buildings' },
    { id: 'classroom', label: 'Classroom' },
    { id: 'effects', label: 'Effects' },
    { id: 'japan', label: 'Japan' },
    { id: 'animals', label: 'Animals' },
    { id: 'food', label: 'Food' },
    { id: 'sports', label: 'Sports' },
    { id: 'fantasy', label: 'Fantasy' },
    { id: 'tech', label: 'Tech' },
    { id: 'seasons', label: 'Seasons' },
    { id: 'travel', label: 'Travel' },
    { id: 'backdrops', label: 'Backdrops' },
];

export const PROPS: readonly PropDef[] = [
    ...TREE_PROPS,
    ...GROUND_PROPS,
    ...SKY_PROPS,
    ...VEHICLE_PROPS,
    ...TWO_WHEEL_PROPS,
    ...FURNITURE_PROPS,
    ...ROOM_PROPS,
    ...KITCHEN_PROPS,
    ...STREET_PROPS,
    ...STREET_SIGN_PROPS,
    ...BUILDING_PROPS,
    ...CITY_BUILDING_PROPS,
    ...CLASSROOM_PROPS,
    ...CLASSROOM_ITEM_PROPS,
    ...EFFECT_PROPS,
    ...JAPAN_PROPS,
    ...JAPAN_HOME_PROPS,
    ...ANIMAL_PROPS,
    ...FOOD_PROPS,
    ...SPORT_PROPS,
    ...FANTASY_PROPS,
    ...TECH_PROPS,
    ...SEASON_PROPS,
    ...TRAVEL_PROPS,
    ...BACKDROP_PROPS,
];

const BY_ID = new Map(PROPS.map((p) => [p.id, p]));

export const getProp = (id: string): PropDef | undefined => BY_ID.get(id);

/** Props whose label, id or tags contain every word of the query, optionally in one category. */
export function searchProps(query: string, category?: PropCategory): PropDef[] {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return PROPS.filter((p) => {
        if (category && p.category !== category) return false;
        const text = [p.label, p.id, ...(p.tags ?? [])].join(' ').toLowerCase();
        return words.every((w) => text.includes(w));
    });
}
