/**
 * The `/gallery` page content (`pages/Gallery/GalleryPage`): what people can make with Fateboard (cartoons, manga, scenery, flow
 * diagrams, design). Category filter pills and a card grid of lazy-loaded SVGs (`public/gallery/`);
 * each card opens the piece's step-by-step tutorial (`/gallery/<id>`). Light-only like the landing.
 */
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { FOCUS_RING } from '@/components/atoms/control.styles';

import {
    CATEGORY_LABEL,
    GALLERY_CATEGORIES,
    GALLERY_ITEMS,
    galleryImage,
    galleryPath,
    type GalleryCategory,
} from './galleryData';

type Filter = GalleryCategory | 'all';

const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: GALLERY_ITEMS.length },
    ...GALLERY_CATEGORIES.map(({ id, label }) => ({
        id,
        label,
        count: GALLERY_ITEMS.filter((item) => item.category === id).length,
    })),
];

export function GallerySection() {
    const [filter, setFilter] = useState<Filter>('all');
    const items = useMemo(
        () =>
            filter === 'all' ? GALLERY_ITEMS : GALLERY_ITEMS.filter((i) => i.category === filter),
        [filter],
    );

    return (
        <section aria-labelledby="gallery-title" className="bg-white py-16 sm:py-20">
            <div className="theme-light mx-auto max-w-7xl px-5 sm:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary-ink">
                        Gallery
                    </p>
                    <h1
                        id="gallery-title"
                        className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-5xl"
                    >
                        Made with Fateboard.
                    </h1>
                    <p className="mt-5 leading-7 text-ink-muted">
                        Characters, worlds and diagrams built from shapes, pen paths, gradients and
                        text. Open any piece to watch it being built step by step, and learn the
                        tricks behind it.
                    </p>
                </div>

                <div
                    role="group"
                    aria-label="Filter by category"
                    className="mt-10 flex flex-wrap justify-center gap-2"
                >
                    {FILTERS.map(({ id, label, count }) => (
                        <button
                            key={id}
                            type="button"
                            aria-pressed={filter === id}
                            onClick={() => setFilter(id)}
                            className={clsx(
                                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                                FOCUS_RING,
                                filter === id
                                    ? 'border-primary-600 bg-primary-600 text-white'
                                    : 'border-line bg-surface text-ink-muted hover:border-primary-300 hover:text-ink',
                            )}
                        >
                            {label}{' '}
                            <span
                                className={clsx(
                                    'text-xs tabular-nums',
                                    filter === id ? 'text-white' : 'text-ink-subtle',
                                )}
                            >
                                {count} <span className="sr-only">pieces</span>
                            </span>
                        </button>
                    ))}
                </div>

                <ul
                    aria-label="Gallery pieces"
                    className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {items.map((item) => (
                        <li
                            key={item.id}
                            className="group relative overflow-hidden rounded-2xl border border-line bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary-300 hover:shadow-xl has-[:focus-visible]:-translate-y-1"
                        >
                            <div className="aspect-[4/3] overflow-hidden bg-surface-muted">
                                <img
                                    src={galleryImage(item)}
                                    alt={item.title}
                                    width={480}
                                    height={360}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                />
                            </div>
                            <div className="p-5">
                                <p className="text-xs font-bold uppercase tracking-wider text-primary-ink">
                                    {CATEGORY_LABEL[item.category]}
                                </p>
                                <h2 className="mt-1.5 text-lg font-bold text-ink">{item.title}</h2>
                                <p className="mt-1 text-sm leading-6 text-ink-muted">
                                    {item.description}
                                </p>
                                <p className="mt-3 text-sm font-semibold text-primary-ink">
                                    See how it&apos;s made →
                                </p>
                            </div>
                            {/* stretched link: the whole card opens the tutorial, the image keeps its role */}
                            <Link
                                to={galleryPath(item)}
                                aria-label={`How to make ${item.title}`}
                                className={clsx(
                                    'absolute inset-0 rounded-2xl',
                                    FOCUS_RING,
                                    'focus-visible:ring-inset focus-visible:ring-offset-0',
                                )}
                            />
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
