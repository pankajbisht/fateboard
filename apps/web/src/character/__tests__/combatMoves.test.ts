// @vitest-environment node
/**
 * Combat Sports Pack moves (docs/COMBAT_PACK.md §2): data shape, joint limits, the stance mirror, the per-body
 * solve (strike on target, knee on the mat), timing and the bake cache. Child (124 cm), adult (174) and tall (189).
 */
import { describe, expect, it } from 'vitest';
import { bakeCached, bakeKeys, keyPose, solveKeys } from '../combat/bake';
import { EASES } from '../combat/ease';
import { leadSide, stanced } from '../combat/mirror';
import { COMBAT_MOVES, MOVE_POSES, moveById } from '../combat/registry';
import { effector, prepareKey, soloAim, solveLimb } from '../combat/solve';
import { KEY_NAMES } from '../combat/types';
import { pose } from '../data/poseDsl';
import type { PoseSpec } from '../data/poseDsl';
import { RECIPES, fromRecipe } from '../data/recipes';
import { pointOn, solveFK } from '../rig/fk';
import { clampPose } from '../rig/limits';
import { mirrorPose } from '../rig/poseOps';
import { buildSkeleton } from '../rig/skeleton';
import { JOINTS } from '../schema/types';

const BODIES = [0, 4, 8].map((r) => fromRecipe(RECIPES[r], `r${r}`).body);
const SKELS = BODIES.map((b) => buildSkeleton(b));
const ARMS = new Set(['hand', 'elbow']);

describe('move data', () => {
    it('has 50+ moves with unique ids, three keys each, sane weights and timing', () => {
        expect(COMBAT_MOVES.length).toBeGreaterThanOrEqual(50);
        expect(new Set(COMBAT_MOVES.map((m) => m.id)).size).toBe(COMBAT_MOVES.length);
        for (const m of COMBAT_MOVES) {
            expect(m.how.length, m.id).toBeGreaterThan(40);
            for (const k of KEY_NAMES) {
                const key = m.keys[k];
                expect(key.weight, `${m.id} ${k}`).toBeGreaterThanOrEqual(0);
                expect(key.weight, `${m.id} ${k}`).toBeLessThanOrEqual(1);
                expect(key.frames, `${m.id} ${k}`).toBeGreaterThanOrEqual(0);
            }
            if (m.category !== 'stance') expect(m.keys.peak.frames, m.id).toBeGreaterThan(0);
            // strikes snap out and come back slower; the freeze on impact is 2–4 frames
            if (m.strike) {
                expect(m.hitStop, m.id).toBeGreaterThanOrEqual(2);
                expect(m.hitStop, m.id).toBeLessThanOrEqual(4);
                expect(m.keys.recover.frames, m.id).toBeGreaterThan(m.keys.peak.frames);
            }
        }
    });

    it('is written inside the joint limits (the clamp changes no joint by more than a little)', () => {
        for (const m of COMBAT_MOVES)
            for (const k of KEY_NAMES) {
                const raw = pose('x', 'x', 'x', [], m.keys[k].spec as PoseSpec);
                const clamped = clampPose(raw);
                for (const j of JOINTS) {
                    const a = raw.joints[j];
                    const b = clamped.joints[j];
                    if (!a || !b) continue;
                    const d = Math.max(
                        Math.abs(a.x - b.x),
                        Math.abs(a.y - b.y),
                        Math.abs(a.z - b.z),
                    );
                    expect(d, `${m.id} ${k} ${j}`).toBeLessThanOrEqual(12);
                }
            }
    });

    it('puts every peak in the pose library with the combat tags', () => {
        const ids = new Set(MOVE_POSES.map((p) => p.id));
        for (const m of COMBAT_MOVES.filter((x) => x.category !== 'stance'))
            expect(ids.has(m.id), m.id).toBe(true);
        expect(MOVE_POSES.every((p) => p.category === 'martial' && p.tags.includes('combat'))).toBe(
            true,
        );
    });
});

describe('stances', () => {
    it('southpaw is the exact mirror of orthodox, strike side and knee contact swapped', () => {
        for (const m of COMBAT_MOVES) {
            const o = stanced(m, 'orthodox');
            const s = stanced(m, 'southpaw');
            for (const k of KEY_NAMES) {
                const want = mirrorPose(keyPose(o, k));
                const got = keyPose(s, k);
                for (const j of JOINTS) {
                    const a = want.joints[j];
                    const b = got.joints[j];
                    if (!a && !b) continue;
                    for (const ax of ['x', 'y', 'z'] as const)
                        expect(b?.[ax] ?? 0, `${m.id} ${k} ${j}.${ax}`).toBeCloseTo(
                            a?.[ax] ?? 0,
                            6,
                        );
                }
                expect(got.rootRotation.yaw).toBeCloseTo(want.rootRotation.yaw, 6);
                expect(got.ground).toBe(want.ground);
            }
            if (m.strike) expect(s.strike!.side).not.toBe(m.strike.side);
            const swap = (c: string) => (c === 'kneeL' ? 'kneeR' : 'kneeL');
            expect([...(s.keys.peak.contact ?? [])].sort(), m.id).toEqual(
                (m.keys.peak.contact ?? []).map(swap).sort(),
            );
        }
    });

    it('keeps the eyes on the opponent at the start of every standing move (within 25°)', () => {
        const sk = SKELS[1];
        for (const m of COMBAT_MOVES) {
            if (['reaction', 'ground'].includes(m.category)) continue;
            // on the mat (kneeling, lying) the eyes are on the opponent below, not ahead
            if (m.keys.start.spec.ground === 'floor' || m.keys.start.contact) continue;
            const f = solveFK(sk, keyPose(stanced(m), 'start'));
            const ahead = pointOn(f, 'head', [0, 0, 10]);
            const g = [ahead[0] - f.pos.head[0], ahead[2] - f.pos.head[2]];
            expect(g[1] / Math.hypot(g[0], g[1]), m.id).toBeGreaterThan(
                Math.cos((25 * Math.PI) / 180),
            );
        }
    });
});

describe('solve on a body', () => {
    it('lands every punch and elbow within 2.5 cm, kicks and knees within 9 cm, on any build', () => {
        for (const sk of SKELS)
            for (const m of COMBAT_MOVES) {
                if (!m.strike) continue;
                const sm = stanced(m);
                const p = prepareKey(sk, keyPose(sm, 'peak'), sm.keys.peak, leadSide('orthodox'));
                const e = solveLimb(sk, p, m.strike.limb, m.strike.side, soloAim(sk, p, m.strike));
                const limit = ARMS.has(m.strike.limb) ? 2.5 : 9;
                expect(e.error, `${m.id} on ${sk.height.toFixed(0)} cm`).toBeLessThanOrEqual(limit);
            }
    });

    it('a shot puts the lead knee on the mat and the rear foot down (double and single leg)', () => {
        for (const id of ['cs-double-leg', 'cs-single-leg'])
            for (const sk of SKELS) {
                const peak = solveKeys(sk, stanced(moveById(id)!)).peak;
                expect(peak.ground).toBe('air');
                const f = solveFK(sk, peak);
                expect(f.pos.lowerLegL[1], `${id} knee`).toBeCloseTo(sk.size.knee * 0.5, 0);
                const ball = effector(sk, f, 'foot', 'R');
                expect(Math.abs(ball[1] - 1), `${id} rear foot`).toBeLessThan(4);
            }
    });

    it('every solved key stays inside the joint limits', () => {
        for (const m of COMBAT_MOVES) {
            const keys = solveKeys(SKELS[1], stanced(m));
            for (const k of KEY_NAMES)
                expect(clampPose(keys[k]).joints, `${m.id} ${k}`).toEqual(keys[k].joints);
        }
    });
});

describe('timing', () => {
    it('eases: a strike snaps out, a recovery settles, all start at 0 and end at 1', () => {
        for (const f of Object.values(EASES)) {
            expect(f(0)).toBeCloseTo(0, 9);
            expect(f(1)).toBeCloseTo(1, 9);
        }
        expect(EASES.snap(0.3)).toBeGreaterThan(0.6);
        expect(EASES.settle(0.5)).toBeCloseTo(0.5, 9);
        expect(EASES.drop(0.3)).toBeLessThan(0.1);
    });

    it('bakes start → peak, holds the impact, then recovers; the freeze can be turned off', () => {
        const jab = stanced(moveById('cs-jab')!);
        const keys = solveKeys(SKELS[1], jab);
        const b = bakeKeys(jab, keys);
        const { peak, recover } = jab.keys;
        expect(b.hit).toBe(peak.frames);
        expect(b.frames).toHaveLength(1 + peak.frames + jab.move.hitStop + recover.frames);
        for (const j of JOINTS)
            for (const ax of ['x', 'y', 'z'] as const)
                expect(b.frames[b.hit].joints[j]?.[ax] ?? 0, `${j}.${ax}`).toBeCloseTo(
                    keys.peak.joints[j]?.[ax] ?? 0,
                    6,
                );
        for (let i = 1; i <= jab.move.hitStop; i++) expect(b.frames[b.hit + i]).toBe(keys.peak);
        expect(bakeKeys(jab, keys, 0).frames).toHaveLength(1 + peak.frames + recover.frames);
    });

    it('caches a solo bake per move, stance and body', () => {
        const jab = moveById('cs-jab')!;
        expect(bakeCached(BODIES[1], jab)).toBe(bakeCached(BODIES[1], jab));
        expect(bakeCached(BODIES[1], jab, 'southpaw')).not.toBe(bakeCached(BODIES[1], jab));
        expect(bakeCached(BODIES[2], jab)).not.toBe(bakeCached(BODIES[1], jab));
    });
});
