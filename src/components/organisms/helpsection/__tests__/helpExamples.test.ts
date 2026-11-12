/**
 * Real-world examples must describe the editor that ships, like the topics they belong to.
 */
import { describe, expect, it } from 'vitest';

import { exampleSection, exampleText, HELP_EXAMPLES } from '../helpExamples';
import { type SceneItem, visibleAt } from '../helpScene';
import { HELP_TOPICS } from '../helpTopics';

const topicIds = new Set(HELP_TOPICS.map((t) => t.id));
const all = Object.values(HELP_EXAMPLES).flat();
const allText = all.map(exampleText).join('\n');

describe('help examples', () => {
    it('belong to topics that exist', () => {
        for (const id of Object.keys(HELP_EXAMPLES)) expect(topicIds).toContain(id);
    });

    it('give every topic but the shortcut reference at least one example', () => {
        for (const topic of HELP_TOPICS) {
            if (topic.id === 'shortcuts') continue;
            expect(HELP_EXAMPLES[topic.id]?.length ?? 0, topic.id).toBeGreaterThan(0);
        }
    });

    it('have unique ids and addresses', () => {
        const ids = all.map((e) => e.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(new Set(all.map(exampleSection)).size).toBe(ids.length);
    });

    it('tell a short story: 3 to 6 steps and a result', () => {
        for (const e of all) {
            expect(e.steps.length, e.id).toBeGreaterThanOrEqual(3);
            expect(e.steps.length, e.id).toBeLessThanOrEqual(6);
            expect(e.result.length, e.id).toBeGreaterThan(0);
        }
    });

    it('show every step on the picture, and keep it on the board', () => {
        for (const e of all) {
            const last = e.steps.length; // the result
            expect(new Set(e.steps.map((step) => step.text)).size, e.id).toBe(last);
            // something to see on every step and at the end
            for (let step = 0; step <= last; step++) {
                expect(visibleAt(e.scene, step).length, `${e.id} step ${step}`).toBeGreaterThan(0);
            }
            // you watch it get built: every step adds, changes or removes something
            e.steps.forEach((_, step) => {
                const changes = e.scene.some((i) => i.from === step || i.to === step);
                expect(changes, `${e.id} step ${step + 1} changes nothing`).toBe(true);
            });
            for (const item of e.scene) {
                expect(item.from, e.id).toBeGreaterThanOrEqual(0);
                expect(item.from, e.id).toBeLessThanOrEqual(last);
                if (item.to !== undefined) expect(item.to, e.id).toBeGreaterThan(item.from);
            }
            for (const step of e.steps) {
                if (!step.at) continue;
                const [x, y] = step.at;
                expect(x >= 0 && x <= 320 && y >= 0 && y <= 180, `${e.id}: ${step.text}`).toBe(
                    true,
                );
            }
        }
    });

    it('keep text readable in dark mode: no theme-colored text on fixed light artwork', () => {
        const inside = (item: SceneItem, x: number, y: number) =>
            (item.kind === 'rect' &&
                x >= item.x &&
                x <= item.x + item.w &&
                y >= item.y &&
                y <= item.y + item.h) ||
            (item.kind === 'circle' && Math.hypot(x - item.cx, y - item.cy) <= item.r) ||
            (item.kind === 'ellipse' &&
                ((x - item.cx) / item.rx) ** 2 + ((y - item.cy) / item.ry) ** 2 <= 1);
        const flips = (paint?: string) => !paint?.startsWith('#'); // a token, or the ink default
        const problems: string[] = [];
        for (const e of all) {
            for (let step = 0; step <= e.steps.length; step++) {
                const shown = visibleAt(e.scene, step);
                shown.forEach((item, i) => {
                    if (item.kind !== 'text' || !flips(item.style.fill)) return;
                    // the topmost filled shape under the text is what it is read against
                    const under = shown
                        .slice(0, i)
                        .filter((b) => b.style.fill && inside(b, item.x, item.y))
                        .at(-1);
                    if (under && !flips(under.style.fill))
                        problems.push(`${e.id} step ${step + 1}: "${item.text}"`);
                });
            }
        }
        expect([...new Set(problems)]).toEqual([]);
    });

    it('only point to topics that exist, and not to their own', () => {
        for (const [topicId, examples] of Object.entries(HELP_EXAMPLES)) {
            for (const e of examples) {
                for (const used of e.uses ?? []) {
                    expect(topicIds, `${e.id} uses ${used}`).toContain(used);
                    expect(used, e.id).not.toBe(topicId);
                }
            }
        }
    });

    it('close every key mark they open', () => {
        for (const e of all) {
            const lines = e.steps.flatMap((step) => [step.text, step.ui ?? '']);
            for (const line of [...lines, e.result, e.brief]) {
                expect((line.match(/`/g) ?? []).length % 2, line).toBe(0);
            }
        }
    });

    it.each([
        ['PDF export', /\bpdf\b/i],
        ['an S key for Shapes', /`S`/],
        ['a T key for Text', /`T`/],
        ['a C key for colors', /`C`/],
        ['the wrong Ungroup key', /mod\+shift\+G/i],
        ['Shift to keep proportions', /shift[^.]*(keep|maintain)[^.]*(proportion|aspect)/i],
    ])('do not promise %s', (_name, claim) => {
        expect(allText).not.toMatch(claim);
    });
});
