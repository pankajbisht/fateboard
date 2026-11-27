import { createRegistry } from '../registry';

/**
 * Interaction pairs (docs/COMBAT_PACK.md, Stage 4): an attack move on one fighter and the matching answer on the
 * other, as data. `fight.ts` places the two so the attack lines up with the defender's target on any pair of
 * heights. `contact` says where the strike ends:
 * - hit: on the defender as they react (the reaction's peak),
 * - block: on the blocking limb / guard (the defence's peak),
 * - miss: where the target WAS before the evasion (the defence's start), so the punch passes the slipped head;
 *   takedowns use it too (no impact: the shot is spaced to the standing defender's thigh).
 */
export type ContactKind = 'hit' | 'block' | 'miss';

export interface ExchangeDef {
    id: string;
    name: string;
    tags: readonly string[];
    attack: string;
    defend: string;
    contact: ContactKind;
}

const x = (
    id: string,
    name: string,
    attack: string,
    defend: string,
    contact: ContactKind,
    tags: string[],
): ExchangeDef => ({ id, name, attack, defend, contact, tags });

export const EXCHANGES = createRegistry<ExchangeDef>(
    [
        x('jab-slip', 'Jab → slip', 'cs-jab', 'cs-slip-left', 'miss', ['boxing', 'jab', 'slip']),
        x('jab-parry', 'Jab → parry', 'cs-jab', 'cs-parry', 'block', ['boxing', 'jab', 'parry']),
        x('cross-slip', 'Cross → slip', 'cs-cross', 'cs-slip-right', 'miss', ['boxing', 'cross']),
        x('cross-hit', 'Cross lands', 'cs-cross', 'cs-head-snap', 'hit', [
            'boxing',
            'cross',
            'hit',
        ]),
        x('hook-duck', 'Hook → duck', 'cs-lead-hook', 'cs-duck', 'miss', [
            'boxing',
            'hook',
            'duck',
        ]),
        x('hook-roll', 'Hook → roll', 'cs-lead-hook', 'cs-roll', 'miss', [
            'boxing',
            'hook',
            'roll',
        ]),
        x('rear-hook-weave', 'Rear hook → bob and weave', 'cs-rear-hook', 'cs-bob-weave', 'miss', [
            'boxing',
            'hook',
            'weave',
        ]),
        x('uppercut-guard', 'Uppercut → high guard', 'cs-lead-uppercut', 'cs-high-guard', 'block', [
            'boxing',
            'uppercut',
            'block',
        ]),
        x('uppercut-ko', 'Uppercut → knockdown', 'cs-rear-uppercut', 'cs-knockdown', 'hit', [
            'boxing',
            'knockout',
        ]),
        x('overhand-hit', 'Overhand lands', 'cs-overhand', 'cs-head-snap', 'hit', [
            'boxing',
            'hit',
        ]),
        x('body-shot-hit', 'Body shot lands', 'cs-body-shot', 'cs-body-recoil', 'hit', [
            'boxing',
            'body',
        ]),
        x('body-hook-hit', 'Body hook lands', 'cs-body-hook', 'cs-body-recoil', 'hit', [
            'boxing',
            'body',
            'hook',
        ]),
        x('jab-pads', 'Jab on the pads', 'cs-jab', 'cs-pad-hold', 'block', ['pads', 'training']),
        x('cross-pads', 'Cross on the pads', 'cs-cross', 'cs-pad-hold', 'block', [
            'pads',
            'training',
        ]),
        x('kick-check', 'Leg kick → check', 'cs-kick-leg', 'cs-check', 'block', [
            'muay thai',
            'check',
        ]),
        x('kick-block', 'Body kick → shin block', 'cs-kick-body', 'cs-shin-block', 'block', [
            'muay thai',
            'block',
        ]),
        x('kick-catch', 'Body kick → catch', 'cs-kick-body', 'cs-catch-kick', 'block', [
            'muay thai',
            'catch',
        ]),
        x('head-kick-guard', 'Head kick → high guard', 'cs-kick-head', 'cs-high-guard', 'block', [
            'muay thai',
            'head kick',
        ]),
        x('teep-hit', 'Teep lands', 'cs-teep', 'cs-body-recoil', 'hit', ['muay thai', 'teep']),
        x('knee-hit', 'Clinch knee lands', 'cs-clinch-knee', 'cs-body-recoil', 'hit', [
            'muay thai',
            'clinch',
        ]),
        x('elbow-hit', 'Elbow lands', 'cs-elbow-horizontal', 'cs-head-snap', 'hit', [
            'muay thai',
            'elbow',
        ]),
        x('double-sprawl', 'Double-leg → sprawl', 'cs-double-leg', 'cs-sprawl', 'miss', [
            'mma',
            'wrestling',
        ]),
        x(
            'single-defence',
            'Single-leg → takedown defence',
            'cs-single-leg',
            'cs-td-defence',
            'miss',
            ['mma', 'wrestling'],
        ),
    ],
    'jab-slip',
);
