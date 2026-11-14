/**
 * Landing page pointer to `/gallery`. Text only on purpose: the 18 artworks live on their own route
 * so the landing page stays fast (`landingBundle.test.ts` keeps `GallerySection` out of it).
 */
import clsx from 'clsx';
import { Link } from 'react-router-dom';

import { PATHS } from '@/app/routes/paths';
import { FOCUS_RING } from '@/components/atoms/control.styles';

export function GalleryTeaser() {
    return (
        <section aria-labelledby="gallery-teaser-title" className="bg-white py-20 sm:py-24">
            <div className="theme-light mx-auto max-w-2xl px-5 text-center sm:px-8">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-ink">
                    Gallery
                </p>
                <h2
                    id="gallery-teaser-title"
                    className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-5xl"
                >
                    Made with Fateboard.
                </h2>
                <p className="mt-5 leading-7 text-ink-muted">
                    Cartoons, manga, scenery, flow diagrams and designs, each with a step-by-step
                    tutorial that shows how it is built.
                </p>
                <Link
                    to={PATHS.gallery}
                    className={clsx(
                        'mt-8 inline-flex rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-700',
                        FOCUS_RING,
                    )}
                >
                    Browse the gallery
                </Link>
            </div>
        </section>
    );
}
