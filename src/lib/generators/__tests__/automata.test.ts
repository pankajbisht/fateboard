import { describe, expect, it } from 'vitest';
import { cellsToPath, elementary, lifeRun, lifeSeed } from '../automata';

const rows = (grid: boolean[][]) => grid.map((r) => r.map((c) => (c ? '#' : '.')).join(''));

describe('elementary automaton', () => {
    it('rule 90 from one cell draws the Sierpinski pattern', () => {
        expect(rows(elementary({ rule: 90, width: 7, generations: 4 }))).toEqual([
            '...#...',
            '..#.#..',
            '.#...#.',
            '#.#.#.#',
        ]);
    });

    it('rule 30 grows the left edge to the left', () => {
        expect(rows(elementary({ rule: 30, width: 5, generations: 3 }))).toEqual([
            '..#..',
            '.###.',
            '##..#',
        ]);
    });

    it('random seed uses the injected rng', () => {
        const first = elementary({
            rule: 110,
            width: 4,
            generations: 1,
            seed: 'random',
            rng: () => 0.1,
        });
        expect(rows(first)).toEqual(['####']);
    });
});

describe('game of life', () => {
    it('a blinker flips every step', () => {
        const blinker = [
            [false, false, false],
            [true, true, true],
            [false, false, false],
        ];
        expect(rows(lifeRun(blinker, 1, false))).toEqual(['.#.', '.#.', '.#.']);
        expect(rows(lifeRun(blinker, 2, false))).toEqual(rows(blinker));
    });

    it('a glider moves one cell diagonally every 4 steps on a wrapped grid', () => {
        const start = lifeSeed({ preset: 'glider', cols: 8, rows: 8 });
        const moved = lifeRun(start, 4, true);
        const alive = (g: boolean[][]) =>
            g.flatMap((r, y) => r.flatMap((c, x) => (c ? [`${x},${y}`] : [])));
        expect(alive(moved)).toEqual(
            alive(start).map((p) =>
                p
                    .split(',')
                    .map((n) => +n + 1)
                    .join(','),
            ),
        );
    });

    it('random density 0 is empty and 1 is full', () => {
        expect(
            lifeSeed({ preset: 'random', cols: 3, rows: 2, density: 0 }).flat().some(Boolean),
        ).toBe(false);
        expect(
            lifeSeed({ preset: 'random', cols: 3, rows: 2, density: 1 }).flat().every(Boolean),
        ).toBe(true);
    });
});

describe('cellsToPath', () => {
    it('draws one square per live cell and reports the grid size', () => {
        const { d, width, height } = cellsToPath(
            [
                [true, false],
                [false, true],
            ],
            10,
            2,
        );
        expect(d).toBe('M0 0h8v8h-8Z M10 10h8v8h-8Z');
        expect([width, height]).toEqual([20, 20]);
    });

    it('returns an empty path for a dead grid', () => {
        expect(cellsToPath([[false]], 10, 0).d).toBe('');
    });
});
