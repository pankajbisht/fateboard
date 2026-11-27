/** Scene Objects panel (docs/PROPS.md): browse by category, search, click or drag a prop onto the page. */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@store';
import { PROP_DRAG_TYPE } from '@/props/dragType';
import SceneObjectsPanel from '../SceneObjectsPanel';

const addProp = vi.fn(async () => true);
const togglePropFavorite = vi.fn();
const state = (extra: Record<string, unknown> = {}) =>
    useStore.setState({
        addProp,
        togglePropFavorite,
        propFavorites: [],
        propRecent: [],
        ...extra,
    } as never);
const grid = () => screen.getByRole('list', { name: 'Scene objects' });

describe('SceneObjectsPanel', () => {
    beforeEach(() => state());
    afterEach(() => vi.clearAllMocks());

    it('shows Nature first, then another category when picked', () => {
        render(<SceneObjectsPanel />);
        expect(screen.getByRole('button', { name: 'Nature', pressed: true })).toBeInTheDocument();
        expect(within(grid()).getByRole('button', { name: 'Add Sakura tree' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Sky' }));
        expect(screen.getByRole('button', { name: 'Sky', pressed: true })).toBeInTheDocument();
        expect(
            within(grid()).getByRole('button', { name: 'Add Crescent moon' }),
        ).toBeInTheDocument();
        expect(within(grid()).queryByRole('button', { name: 'Add Sakura tree' })).toBeNull();
    });

    it.each([
        ['Vehicles', 'Add Bicycle'],
        ['Furniture', 'Add Chair'],
        ['Kitchen', 'Add Plate'],
        ['Street', 'Add Street lamp'],
        ['Buildings', 'Add Village house'],
        ['Classroom', 'Add Blackboard'],
        ['Effects', 'Add Sweat drop'],
        ['Japan', 'Add Torii gate'],
    ])('the %s category holds its props', (category, card) => {
        render(<SceneObjectsPanel />);
        fireEvent.click(screen.getByRole('button', { name: category }));
        expect(within(grid()).getByRole('button', { name: card })).toBeInTheDocument();
    });

    it('search looks through every category', () => {
        render(<SceneObjectsPanel />);
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search scene objects' }), {
            target: { value: 'moon' },
        });
        const names = within(grid())
            .getAllByRole('button', { name: /^Add / })
            .map((b) => b.getAttribute('aria-label'));
        // matches from several categories (Sky, Animals), and nothing else
        expect(names).toEqual(
            expect.arrayContaining(['Add Crescent moon', 'Add Full moon', 'Add Rabbit']),
        );
        expect(names.every((n) => /moon|rabbit|night/i.test(String(n)))).toBe(true);
        expect(screen.queryByRole('group', { name: 'Category' })).toBeNull();
    });

    it('says so when nothing matches', () => {
        render(<SceneObjectsPanel />);
        fireEvent.change(screen.getByRole('searchbox', { name: 'Search scene objects' }), {
            target: { value: 'zzzz' },
        });
        expect(screen.getByText(/No scene objects match/)).toBeInTheDocument();
    });

    it('a click places the prop', () => {
        render(<SceneObjectsPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'Add Pine tree' }));
        expect(addProp).toHaveBeenCalledWith('tree-pine');
    });

    it('a card carries the prop id when dragged', () => {
        render(<SceneObjectsPanel />);
        const setData = vi.fn();
        fireEvent.dragStart(screen.getByRole('button', { name: 'Add Bush' }), {
            dataTransfer: { setData, effectAllowed: '' },
        });
        expect(setData).toHaveBeenCalledWith(PROP_DRAG_TYPE, 'bush');
    });

    it('a star on each card marks a favourite', () => {
        render(<SceneObjectsPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'Favorite Bush', pressed: false }));
        expect(togglePropFavorite).toHaveBeenCalledWith('bush');
    });

    it('Favorites and Recent appear first when they have props', () => {
        state({ propFavorites: ['torii'], propRecent: ['cat', 'gone-prop', 'sun'] });
        render(<SceneObjectsPanel />);
        expect(
            screen.getByRole('button', { name: 'Favorites', pressed: true }),
        ).toBeInTheDocument();
        expect(within(grid()).getByRole('button', { name: 'Add Torii gate' })).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Favorite Torii gate', pressed: true }),
        ).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Recent' }));
        const names = within(grid())
            .getAllByRole('button', { name: /^Add / })
            .map((b) => b.getAttribute('aria-label'));
        expect(names).toEqual(['Add Cat', 'Add Sun']); // unknown ids are skipped
    });

    it('hides Favorites and Recent while they are empty', () => {
        render(<SceneObjectsPanel />);
        expect(screen.queryByRole('button', { name: 'Favorites' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Recent' })).toBeNull();
    });

    it('My props opens the user library', () => {
        useStore.setState({
            propUserLibrary: [],
            propUserLibraryStatus: 'ready',
            loadPropLibrary: vi.fn(),
        } as never);
        render(<SceneObjectsPanel />);
        fireEvent.click(screen.getByRole('button', { name: 'My props' }));
        expect(screen.getByRole('button', { name: 'Import SVG or PNG' })).toBeInTheDocument();
        expect(screen.queryByRole('list', { name: 'Scene objects' })).toBeNull();
    });
});
