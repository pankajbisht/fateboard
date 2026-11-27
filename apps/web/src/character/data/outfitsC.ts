import type { Outfit } from './outfits';
import { K, W, make } from './outfitsMake';

/** Army and combat-sport outfits. */
const OLIVE = '#4d5d2f';
const KHAKI = '#a8a29e';

export const OUTFITS_C: Outfit[] = [
    make(
        'combat',
        'Army uniform',
        ['army-shirt', OLIVE],
        ['army-pants', OLIVE],
        ['combat-boots', K],
        [['army-helmet'], ['belt', K]],
    ),
    make(
        'combat',
        'Army fatigues',
        ['army-tee', OLIVE],
        ['army-pants', '#57534e'],
        ['combat-boots', '#292524'],
    ),
    make(
        'combat',
        'Camouflage',
        ['camo-jacket', '#57603a'],
        ['army-pants', '#4b5320'],
        ['combat-boots', K],
        [
            ['beret', '#3f6212'],
            ['backpack', OLIVE],
        ],
    ),
    make(
        'combat',
        'Army officer',
        ['army-shirt', KHAKI],
        ['army-pants', '#78716c'],
        ['combat-boots', K],
        [['beret', '#7f1d1d'], ['tie', '#3f6212'], ['belt', K], ['watch']],
    ),
    make(
        'combat',
        'Special forces',
        ['army-tee', K],
        ['army-pants', '#292524'],
        ['combat-boots', K],
        [['army-helmet', '#292524'], ['backpack', '#292524'], ['sunglasses']],
    ),
    make(
        'combat',
        'Parade dress',
        ['army-shirt', KHAKI],
        ['pants', KHAKI],
        ['school-shoes', K],
        [
            ['beret', '#1e3a8a'],
            ['belt', K],
        ],
    ),
    make(
        'combat',
        'Muay Thai fighter',
        ['tank', W],
        ['muay-thai-shorts', '#dc2626'],
        ['barefoot', '#e0ac69'],
        [
            ['mongkol', '#dc2626'],
            ['prajioud', '#dc2626'],
        ],
    ),
    make(
        'combat',
        'Boxer',
        ['tank', '#2563eb'],
        ['boxing-trunks', '#2563eb'],
        ['sports-shoes', W],
        [['boxing-gloves', '#2563eb']],
    ),
];
