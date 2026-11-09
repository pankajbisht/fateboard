import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import HelpPage from '../HelpPage';

const open = (url = '/help') =>
    render(
        <MemoryRouter initialEntries={[url]}>
            <HelpPage />
        </MemoryRouter>,
    );

const search = () => screen.getByRole('searchbox', { name: 'Search help' });
const heading = () => screen.getByRole('heading', { level: 1 });

describe('HelpPage', () => {
    afterEach(() => localStorage.clear());

    it('opens on the overview, with the editor map and quick start', () => {
        open();
        expect(heading()).toHaveTextContent(/help/i);
        expect(screen.getByRole('group', { name: /editor map/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /quick start/i })).toBeInTheDocument();
    });

    it('opens a topic from the link', () => {
        open('/help?topic=animate');
        expect(heading()).toHaveTextContent('Animate');
    });

    it('shows the overview for an unknown topic instead of an empty page', () => {
        open('/help?topic=nope');
        expect(screen.getByRole('heading', { name: /quick start/i })).toBeInTheDocument();
    });

    it('moves between topics from the sidebar', () => {
        open();
        const nav = screen.getByRole('navigation', { name: 'Help topics' });
        fireEvent.click(within(nav).getByRole('link', { name: 'Filters' }));
        expect(heading()).toHaveTextContent('Filters');
        expect(within(nav).getByRole('link', { name: 'Filters' })).toHaveAttribute(
            'aria-current',
            'page',
        );
    });

    it('searches inside topics and opens the result', () => {
        open();
        fireEvent.change(search(), { target: { value: 'stagger' } });
        const results = screen.getByRole('list', { name: 'Search results' });
        fireEvent.click(within(results).getAllByRole('link')[0]!);
        expect(heading()).toHaveTextContent('Animate');
        expect(search()).toHaveValue('');
    });

    it('says so when nothing matches', () => {
        open();
        fireEvent.change(search(), { target: { value: 'zzz-no-match' } });
        expect(screen.getByText(/nothing matches/i)).toBeInTheDocument();
    });

    it('opens the first result on Enter and clears on Escape', () => {
        open();
        fireEvent.change(search(), { target: { value: 'repeat radially' } });
        fireEvent.keyDown(search(), { key: 'Enter' });
        expect(heading()).toHaveTextContent('Rotate Tools');

        fireEvent.change(search(), { target: { value: 'export' } });
        fireEvent.keyDown(search(), { key: 'Escape' });
        expect(search()).toHaveValue('');
    });

    it('focuses search with the / key, but not while typing', () => {
        open();
        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }));
        });
        expect(search()).toHaveFocus();
    });

    it('offers the panel in the editor, from a topic', () => {
        open('/help?topic=layers');
        expect(screen.getByRole('link', { name: /open layers/i })).toHaveAttribute(
            'href',
            '/draw?panel=layers',
        );
    });

    it('links dock tabs too', () => {
        open('/help?topic=filters');
        expect(screen.getByRole('link', { name: /open filter/i })).toHaveAttribute(
            'href',
            '/draw?tab=filter',
        );
    });

    it('goes to the next topic', () => {
        open('/help?topic=select');
        fireEvent.click(screen.getByRole('link', { name: /next:/i }));
        expect(heading()).not.toHaveTextContent('Select');
    });

    it('remembers quick start progress', () => {
        const first = open();
        const box = screen.getAllByRole('checkbox')[0]!;
        expect(box).toHaveAttribute('aria-checked', 'false');
        fireEvent.click(box);
        expect(box).toHaveAttribute('aria-checked', 'true');
        first.unmount();

        open();
        expect(screen.getAllByRole('checkbox')[0]).toHaveAttribute('aria-checked', 'true');
    });

    it('explains an editor region when it is picked on the map', () => {
        open();
        const map = screen.getByRole('group', { name: /editor map/i });
        fireEvent.click(within(map).getByRole('button', { name: /right dock/i }));
        const details = screen.getByRole('region', { name: /right dock/i });
        expect(within(details).getByRole('link', { name: 'Animate' })).toBeInTheDocument();
    });
});
