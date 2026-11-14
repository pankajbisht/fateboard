/** `/gallery`: its own page (moved off the landing so the landing loads faster). */
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { GALLERY_ITEMS } from '@/components/pages/web/gallery/galleryData';

import GalleryPage from '../GalleryPage';

const renderPage = () =>
    render(
        <MemoryRouter initialEntries={['/gallery']}>
            <GalleryPage />
        </MemoryRouter>,
    );

describe('GalleryPage', () => {
    it('is a full page: one h1, a main landmark and every piece', () => {
        renderPage();
        expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
        expect(
            screen.getByRole('heading', { level: 1, name: 'Made with Fateboard.' }),
        ).toBeInTheDocument();
        const main = screen.getByRole('main');
        const grid = within(main).getByRole('list', { name: 'Gallery pieces' });
        expect(within(grid).getAllByRole('listitem')).toHaveLength(GALLERY_ITEMS.length);
        // card titles follow the h1 directly (axe heading-order)
        expect(within(grid).getAllByRole('heading', { level: 2 })).toHaveLength(
            GALLERY_ITEMS.length,
        );
    });

    it('links back home and to the editor', () => {
        renderPage();
        const header = screen.getByRole('banner');
        expect(within(header).getByRole('link', { name: 'Fateboard home' })).toHaveAttribute(
            'href',
            '/',
        );
        expect(within(header).getByRole('link', { name: 'Start Drawing' })).toHaveAttribute(
            'href',
            '/draw',
        );
    });
});
