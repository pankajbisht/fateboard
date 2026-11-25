/**
 * `/gallery`: everything made with Fateboard, filterable by category; each card opens its tutorial
 * (`/gallery/:id`). Its own lazy route so the landing page does not load 18 artworks. Light-only.
 */
import { useEffect } from 'react';

import { GalleryHeader } from '../web/gallery/GalleryHeader';
import { GallerySection } from '../web/gallery/GallerySection';

export default function GalleryPage() {
    useEffect(() => {
        window.scrollTo?.(0, 0);
    }, []);

    return (
        <div className="theme-light min-h-screen bg-surface text-ink antialiased">
            <GalleryHeader />
            <main>
                <GallerySection />
            </main>
        </div>
    );
}
