// @vitest-environment node
/** Comic tools geometry (2026-11-17): panel layouts, split, speed / focus lines, bursts, screentone tiles. */
import { describe, expect, it, vi } from 'vitest';
import { PANEL_PRESETS, layoutPanels, splitRect } from '../panelLayouts';
import { burstPath, focusLinesPath, speedLinesPath } from '../mangaEffects';
import { normalizeTone, paintToneTile, toneTileSize } from '../screentone';

const box = { left: 0, top: 0, width: 100, height: 100 };
const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe('panel layouts', () => {
    it('2 × 2: four equal panels with gutters between them, inside the area', () => {
        const preset = PANEL_PRESETS.find((p) => p.id === 'grid-4')!;
        expect(layoutPanels(preset, box, 10)).toEqual([
            { left: 0, top: 0, width: 45, height: 45 },
            { left: 55, top: 0, width: 45, height: 45 },
            { left: 0, top: 55, width: 45, height: 45 },
            { left: 55, top: 55, width: 45, height: 45 },
        ]);
    });

    it('every preset fills the area exactly (no panel outside it)', () => {
        for (const p of PANEL_PRESETS) {
            const rects = layoutPanels(p, { left: 10, top: 20, width: 300, height: 400 }, 8);
            expect(rects.length, p.id).toBeGreaterThan(0);
            for (const r of rects) {
                expect(r.left).toBeGreaterThanOrEqual(10 - 1e-9);
                expect(r.top).toBeGreaterThanOrEqual(20 - 1e-9);
                expect(r.left + r.width).toBeLessThanOrEqual(310 + 1e-9);
                expect(r.top + r.height).toBeLessThanOrEqual(420 + 1e-9);
            }
        }
    });

    it('split: a horizontal cut makes top / bottom, a vertical cut left / right, gutter apart', () => {
        expect(splitRect(box, 'horizontal', 10)).toEqual([
            { left: 0, top: 0, width: 100, height: 45 },
            { left: 0, top: 55, width: 100, height: 45 },
        ]);
        expect(splitRect(box, 'vertical', 4, 0.25)).toEqual([
            { left: 0, top: 0, width: 24, height: 100 },
            { left: 28, top: 0, width: 72, height: 100 },
        ]);
    });
});

describe('manga effects', () => {
    it('focus lines: one wedge per line, all inside the box, the same for the same seed', () => {
        const p = {
            width: 200,
            height: 100,
            count: 60,
            innerRadius: 0.4,
            thickness: 6,
            jitter: 0.5,
            seed: 3,
        };
        const d = focusLinesPath(p);
        expect(d.match(/M/g)).toHaveLength(60);
        const all = numbers(d);
        expect(Math.min(...all)).toBeGreaterThanOrEqual(0); // clamped to the box
        expect(Math.max(...all)).toBeLessThanOrEqual(200);
        expect(focusLinesPath(p)).toBe(d);
        expect(focusLinesPath({ ...p, seed: 4 })).not.toBe(d);
    });

    it('speed lines: tapered streaks across the box', () => {
        const d = speedLinesPath({
            width: 300,
            height: 80,
            count: 25,
            thickness: 4,
            minLength: 0.3,
            seed: 1,
        });
        expect(d.match(/M/g)).toHaveLength(25);
        const xs = numbers(d).filter((_, i) => i % 2 === 0);
        expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...xs)).toBeLessThanOrEqual(300);
    });

    it('burst: one closed spiky outline', () => {
        const d = burstPath({
            width: 100,
            height: 100,
            spikes: 12,
            innerRadius: 0.6,
            jitter: 0.3,
            seed: 2,
        });
        expect(d.match(/M/g)).toHaveLength(1);
        expect(d.match(/L/g)).toHaveLength(23);
        expect(d.trim().endsWith('Z')).toBe(true);
    });
});

describe('screentones', () => {
    it('clamps settings', () => {
        expect(
            normalizeTone({ kind: 'nope', spacing: 999, density: -1, angle: 400 }),
        ).toMatchObject({
            kind: 'dots',
            spacing: 40,
            density: 0.05,
            angle: 40,
        });
    });

    it('dots: one dot per tile cell (plus wrap-around corners); lines: one band', () => {
        const calls: string[] = [];
        const ctx = {
            fillStyle: '',
            beginPath: vi.fn(),
            arc: vi.fn(() => calls.push('arc')),
            fill: vi.fn(),
            fillRect: vi.fn(() => calls.push('rect')),
            clearRect: vi.fn(),
        } as unknown as CanvasRenderingContext2D;
        const dots = normalizeTone({ kind: 'dots', spacing: 8, density: 0.3 });
        paintToneTile(ctx, dots, toneTileSize(dots));
        expect(calls.filter((c) => c === 'arc').length).toBe(5); // centre + 4 corners (seamless)
        calls.length = 0;
        const lines = normalizeTone({ kind: 'lines', spacing: 8, density: 0.5 });
        paintToneTile(ctx, lines, toneTileSize(lines));
        expect(calls).toEqual(['rect']);
        expect(toneTileSize(normalizeTone({ kind: 'noise' }))).toBe(64);
    });
});
