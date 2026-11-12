/** Landing page gallery: category filter and cards that open each piece's tutorial. */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { GallerySection } from '../GallerySection';
import { GALLERY_ITEMS } from '../galleryData';

const renderSection = () =>
    render(
        <MemoryRouter>
            <GallerySection />
        </MemoryRouter>,
    );
const grid = () => screen.getByRole('list', { name: 'Gallery pieces' });
const cards = () => within(grid()).getAllByRole('listitem');
const filter = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name} \\d`) });

describe('GallerySection', () => {
    it('shows every piece under "All", each with a lazy image', () => {
        renderSection();
        expect(screen.getByRole('heading', { name: /Made with Fateboard/ })).toBeInTheDocument();
        expect(cards()).toHaveLength(GALLERY_ITEMS.length);
        expect(filter('All')).toHaveAttribute('aria-pressed', 'true');
        expect(filter('Manga')).toHaveAccessibleName('Manga 4 pieces');
        const img = within(grid()).getByRole('img', { name: 'Rookie Astronaut' });
        expect(img).toHaveAttribute('src', '/gallery/cartoon-astronaut.svg');
        expect(img).toHaveAttribute('loading', 'lazy');
    });

    it('filters by category', () => {
        renderSection();
        fireEvent.click(filter('Manga'));
        expect(filter('Manga')).toHaveAttribute('aria-pressed', 'true');
        expect(filter('All')).toHaveAttribute('aria-pressed', 'false');
        expect(cards()).toHaveLength(4);
        expect(within(grid()).queryByRole('img', { name: 'Rookie Astronaut' })).toBeNull();

        fireEvent.click(filter('Flow diagrams'));
        expect(cards()).toHaveLength(3);
    });

    it('every card links to its tutorial page', () => {
        renderSection();
        const link = screen.getByRole('link', { name: 'How to make Ronin at Dusk' });
        expect(link).toHaveAttribute('href', '/gallery/manga-ronin');
        expect(screen.getAllByRole('link', { name: /^How to make / })).toHaveLength(
            GALLERY_ITEMS.length,
        );
    });
});
