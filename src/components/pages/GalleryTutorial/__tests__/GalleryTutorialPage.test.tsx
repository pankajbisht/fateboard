/**
 * `/gallery/:id`: the stage reveals the artwork one step group at a time, in sync with the written
 * steps; Ghost / Spotlight, keys, Play, the palette and "Make it yours"; unknown ids get a message.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GalleryTutorialPage from '../GalleryTutorialPage';
import { PLAY_MS } from '../TutorialStage';

const open = (id: string) =>
    render(
        <MemoryRouter initialEntries={[`/gallery/${id}`]}>
            <Routes>
                <Route path="/gallery/:id" element={<GalleryTutorialPage />} />
            </Routes>
        </MemoryRouter>,
    );

const stage = () => screen.getByRole('region', { name: /step by step/ });
const board = () => screen.getByTestId('tutorial-board');
const states = () =>
    [...board().querySelectorAll('g[id^="step-"]')].map((g) => g.getAttribute('data-state'));
const ready = () => waitFor(() => expect(board().querySelector('svg')).not.toBeNull());

beforeEach(() => {
    vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => ({
            ok: true,
            text: async () => readFileSync(resolve(process.cwd(), 'public', url.slice(1)), 'utf8'),
        })),
    );
});
afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('GalleryTutorialPage', () => {
    it('starts on step 1: only the first group shows, the first written step is current', async () => {
        open('manga-ronin');
        expect(screen.getByRole('heading', { level: 1, name: 'How to make Ronin at Dusk' }));
        await ready();
        expect(states()).toEqual(['current', ...Array(7).fill('next')]);
        expect(board()).toHaveAccessibleName(/step 1 of 8: Dusk sky and sun/);
        const steps = screen.getAllByRole('listitem').filter((li) => li.closest('ol'));
        expect(steps[0]).toHaveAttribute('aria-current', 'step');
    });

    it('Next, the step bar, keys and the written steps all move the same board', async () => {
        open('manga-ronin');
        await ready();
        fireEvent.click(within(stage()).getByRole('button', { name: 'Next step' }));
        expect(states().slice(0, 3)).toEqual(['done', 'current', 'next']);

        fireEvent.click(within(stage()).getByRole('button', { name: /^Step 5:/ }));
        expect(board()).toHaveAccessibleName(/step 5 of 8/);

        fireEvent.keyDown(stage(), { key: 'End' });
        expect(states().at(-1)).toBe('current');
        fireEvent.keyDown(stage(), { key: 'ArrowLeft', metaKey: true }); // browser Back: left alone
        expect(board()).toHaveAccessibleName(/step 8 of 8/);
        fireEvent.keyDown(stage(), { key: 'Home' });
        expect(board()).toHaveAccessibleName(/step 1 of 8/);

        fireEvent.click(screen.getByRole('button', { name: 'Show step 3 on the board' }));
        expect(board()).toHaveAccessibleName(/step 3 of 8: Kanji and seal/);
    });

    it('Ghost shows the next steps faintly, Spotlight dims the finished ones', async () => {
        open('flow-signup');
        await ready();
        const ghost = screen.getByRole('button', { name: /Ghost next steps/ });
        expect(board().className).toContain('[&_[data-state=next]]:opacity-0');
        fireEvent.click(ghost);
        expect(ghost).toHaveAttribute('aria-pressed', 'true');
        expect(board().className).toContain('[&_[data-state=next]]:opacity-[.12]');
        fireEvent.click(screen.getByRole('button', { name: /Spotlight this step/ }));
        expect(board().className).toContain('[&_[data-state=done]]:opacity-30');
    });

    it('Play builds to the end and stops there', async () => {
        open('design-poster');
        await ready();
        vi.useFakeTimers();
        fireEvent.click(screen.getByRole('button', { name: 'Play the build' }));
        for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(PLAY_MS));
        expect(board()).toHaveAccessibleName(/step 4 of 4/);
        expect(screen.getByRole('button', { name: 'Play the build' })).toBeInTheDocument();
    });

    it('offers the palette, the download and the neighbours', async () => {
        open('scenery-alpine');
        await ready();
        await waitFor(() =>
            expect(screen.getAllByRole('button', { name: /^Copy #/ }).length).toBeGreaterThan(3),
        );
        const download = screen.getByRole('link', { name: 'Download SVG' });
        expect(download).toHaveAttribute('href', '/gallery/scenery-alpine.svg');
        expect(download).toHaveAttribute('download', 'scenery-alpine.svg');
        const more = screen.getByRole('navigation', { name: 'More pieces' });
        expect(within(more).getByRole('link', { name: /Night Skyline/ })).toHaveAttribute(
            'href',
            '/gallery/scenery-neon-city',
        );
    });

    it('an unknown piece gets a way back instead of a blank page', () => {
        open('no-such-piece');
        expect(screen.getByRole('heading', { name: /not in the gallery/ })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Back to the gallery/ })).toHaveAttribute(
            'href',
            '/gallery',
        );
    });
});
