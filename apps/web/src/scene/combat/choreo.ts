import { bakeKeys } from '@/character/combat/bake';
import type { Stance } from '@/character/combat/types';
import type { V3 } from '@/character/rig/math';
import type { Body, Pose } from '@/character/schema/types';
import { createRegistry } from '../registry';
import { EXCHANGES } from './exchanges';
import { solveExchange } from './fight';

/**
 * Choreography (docs/COMBAT_PACK.md, Stage 4): a fight combo is a list of exchanges, each started by fighter `a`
 * or `b`. Baking turns it into one frame list per fighter (24 fps), the defender's answer timed so its peak meets
 * the attacker's impact frame (an evasion peaks one frame early: the head is gone when the punch arrives). A combo
 * is plain JSON, so a user's own sequence saves and loads like the presets (`parseCombo`).
 */
export interface ComboStep {
    /** who attacks in this exchange */
    by: 'a' | 'b';
    exchange: string;
}

export interface FightCombo {
    id: string;
    name: string;
    tags: readonly string[];
    stanceA: Stance;
    stanceB: Stance;
    steps: ComboStep[];
}

export interface BakedStep {
    exchange: string;
    by: 'a' | 'b';
    /** first frame of the step and the impact frame (indexes into the fighters' frame lists) */
    from: number;
    hit: number;
    /** spacing for this exchange: distance along x and the defender's sideways offset (cm) */
    gap: number;
    dz: number;
    /** hit, block or miss, and where the strike lands / the limb's path, in the attacker's floor frame */
    contact: 'hit' | 'block' | 'miss';
    impact: V3;
    trail: V3[];
}

export interface BakedCombo {
    a: Pose[];
    b: Pose[];
    steps: BakedStep[];
}

const combo = (
    id: string,
    name: string,
    tags: string[],
    steps: [ComboStep['by'], string][],
    stanceA: Stance = 'orthodox',
    stanceB: Stance = 'orthodox',
): FightCombo => ({
    id,
    name,
    tags,
    stanceA,
    stanceB,
    steps: steps.map(([by, exchange]) => ({ by, exchange })),
});

export const COMBO_PRESETS = createRegistry<FightCombo>(
    [
        combo(
            'sparring',
            'Sparring',
            ['boxing', 'sparring', 'training'],
            [
                ['a', 'jab-parry'],
                ['b', 'jab-slip'],
                ['a', 'hook-roll'],
                ['b', 'cross-slip'],
            ],
        ),
        combo(
            'pad-work',
            'Pad work',
            ['pads', 'training', 'coach'],
            [
                ['a', 'jab-pads'],
                ['a', 'cross-pads'],
                ['a', 'jab-pads'],
                ['a', 'cross-pads'],
            ],
        ),
        combo(
            'muay-thai-round',
            'Muay Thai exchange',
            ['muay thai', 'fight'],
            [
                ['a', 'kick-check'],
                ['b', 'teep-hit'],
                ['a', 'kick-catch'],
                ['b', 'knee-hit'],
            ],
        ),
        combo(
            'full-fight',
            'Full fight',
            ['mma', 'fight', 'exchange'],
            [
                ['a', 'jab-slip'],
                ['b', 'cross-hit'],
                ['a', 'kick-block'],
                ['b', 'double-sprawl'],
                ['a', 'body-shot-hit'],
            ],
        ),
        combo(
            'ko-sequence',
            'KO sequence',
            ['boxing', 'knockout', 'finish'],
            [
                ['a', 'jab-parry'],
                ['a', 'cross-hit'],
                ['a', 'body-shot-hit'],
                ['a', 'uppercut-ko'],
            ],
        ),
    ],
    'sparring',
);

/** A combo from JSON (a user's saved sequence): unknown exchanges dropped, stances defaulted; null if unusable. */
export function parseCombo(json: unknown): FightCombo | null {
    if (!json || typeof json !== 'object') return null;
    const o = json as Record<string, unknown>;
    const stance = (v: unknown): Stance => (v === 'southpaw' ? 'southpaw' : 'orthodox');
    const ids = new Set(EXCHANGES.all.map((e) => e.id));
    const steps = Array.isArray(o.steps)
        ? o.steps.flatMap((s): ComboStep[] => {
              const st = s as Record<string, unknown>;
              const exchange = typeof st?.exchange === 'string' ? st.exchange : '';
              return ids.has(exchange) ? [{ by: st.by === 'b' ? 'b' : 'a', exchange }] : [];
          })
        : [];
    if (!steps.length) return null;
    return {
        id: typeof o.id === 'string' && o.id ? o.id : 'combo',
        name: typeof o.name === 'string' && o.name ? o.name : 'Fight combo',
        tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : [],
        stanceA: stance(o.stanceA),
        stanceB: stance(o.stanceB),
        steps,
    };
}

/** The frame lists for both fighters (the longer side of each step is padded by holding its first / last frame). */
export function bakeCombo(
    bodyA: Body,
    bodyB: Body,
    c: FightCombo,
    o: { hitStop?: boolean } = {},
): BakedCombo {
    const freeze = o.hitStop === false ? 0 : undefined;
    const a: Pose[] = [];
    const b: Pose[] = [];
    const steps: BakedStep[] = [];
    for (const step of c.steps) {
        const atkBody = step.by === 'a' ? bodyA : bodyB;
        const defBody = step.by === 'a' ? bodyB : bodyA;
        const atkStance = step.by === 'a' ? c.stanceA : c.stanceB;
        const defStance = step.by === 'a' ? c.stanceB : c.stanceA;
        const r = solveExchange(atkBody, defBody, step.exchange, atkStance, defStance);
        if (!r) continue;
        const atk = bakeKeys(r.attacker, r.a, freeze ?? r.attacker.move.hitStop);
        const dfn = bakeKeys(r.defender, r.b, freeze ?? r.defender.move.hitStop);
        // which defender frame meets the impact: a block's peak, an evasion's peak one frame early, a hit's first
        // frame (the reaction starts when the strike lands)
        const contact = r.def.contact;
        const want = atk.hit - (contact === 'miss' ? 1 : 0);
        const lead = want - (contact === 'hit' ? 0 : dfn.hit);
        const atkF = [...Array(Math.max(0, -lead)).fill(atk.frames[0]), ...atk.frames];
        const defF = [...Array(Math.max(0, lead)).fill(dfn.frames[0]), ...dfn.frames];
        const n = Math.max(atkF.length, defF.length);
        while (atkF.length < n) atkF.push(atkF[atkF.length - 1]);
        while (defF.length < n) defF.push(defF[defF.length - 1]);
        const from = a.length;
        steps.push({
            exchange: step.exchange,
            by: step.by,
            from,
            hit: from + atk.hit + Math.max(0, -lead),
            gap: r.gap,
            dz: r.dz,
            contact: r.def.contact,
            impact: r.impact,
            trail: r.trail,
        });
        (step.by === 'a' ? a : b).push(...atkF);
        (step.by === 'a' ? b : a).push(...defF);
    }
    return { a, b, steps };
}
