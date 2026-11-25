import { createRegistry } from '../registry';
import { city } from './environments/city';
import { classroom } from './environments/classroom';
import { jungle } from './environments/jungle';
import { market } from './environments/market';
import { park } from './environments/park';
import { river } from './environments/river';
import { road } from './environments/road';
import { homeRoom } from './environments/room';
import { rooftop } from './environments/rooftop';
import { school } from './environments/school';
import { stadium } from './environments/stadium';
import { studio } from './environments/studio';
import { temple } from './environments/temple';
import type { EnvironmentDef } from './types';

/**
 * Every environment, in menu order. Add one: a file in ./environments and a line here; the contract test
 * (environments.contract.test.ts) checks it in every variant, time and weather.
 */
export const ENVIRONMENTS = createRegistry<EnvironmentDef>(
    [
        studio,
        classroom,
        homeRoom,
        school,
        road,
        city,
        market,
        rooftop,
        park,
        river,
        jungle,
        temple,
        stadium,
    ],
    'studio',
);
