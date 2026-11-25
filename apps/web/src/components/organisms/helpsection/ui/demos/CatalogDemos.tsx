/** Galleries read from the real catalogs, so a new shape or brush shows up here by itself. */
import clsx from 'clsx';
import { useState } from 'react';

import Chip from '@/components/atoms/Chip';
import { Input } from '@/components/atoms/Input';
import { SHAPE_CATEGORIES, SHAPES, shapeIconPath } from '@/hooks/shape/shapeCatalog';
import { BRUSH_ORDER, BRUSH_PRESETS } from '@/store/brushConfig';

import { HELP_CARD } from '../helpParts';

export function ShapesDemo() {
    const [category, setCategory] = useState<string>('all');
    const [query, setQuery] = useState('');

    const terms = query.trim().toLowerCase();
    const shown = SHAPES.filter(
        (s) =>
            (category === 'all' || s.category === category) &&
            (!terms || `${s.label} ${s.keywords ?? ''}`.toLowerCase().includes(terms)),
    );
    const categories = SHAPE_CATEGORIES.filter(
        (c) => c.id === 'all' || SHAPES.some((s) => s.category === c.id),
    );

    return (
        <section aria-label="Shape library" className={clsx(HELP_CARD, 'p-4')}>
            <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-title text-ink">All {SHAPES.length} shapes</h2>
                <Input
                    type="search"
                    leadingIcon="magnifying-glass"
                    placeholder="Search shapes"
                    aria-label="Search the shape library"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="ml-auto w-56 max-w-full"
                />
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
                {categories.map((c) => (
                    <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                        {c.label}
                    </Chip>
                ))}
            </div>
            {shown.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-muted">No shapes found.</p>
            ) : (
                <ul className="mt-3 grid max-h-60 grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1 overflow-y-auto">
                    {shown.map((shape) => (
                        <li
                            key={shape.type}
                            title={shape.label}
                            className="flex flex-col items-center gap-1 rounded-md p-2 text-center"
                        >
                            <svg viewBox="-4 -4 108 108" aria-hidden className="size-8">
                                <path
                                    d={shapeIconPath(shape)}
                                    className={
                                        shape.open
                                            ? 'fill-none stroke-primary-600'
                                            : 'fill-primary-100 stroke-primary-600'
                                    }
                                    strokeWidth={5}
                                    fillRule={shape.evenodd ? 'evenodd' : undefined}
                                />
                            </svg>
                            <span className="w-full truncate text-caption text-ink-muted">
                                {shape.label}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export function BrushesDemo() {
    return (
        <section aria-label="Brushes" className={clsx(HELP_CARD, 'p-4')}>
            <h2 className="text-title text-ink">{BRUSH_ORDER.length} brushes to choose from</h2>
            <ul className="mt-3 flex flex-wrap gap-1.5">
                {BRUSH_ORDER.map((brush) => (
                    <li
                        key={brush}
                        className="rounded-full bg-surface-strong px-3 py-1 text-xs font-medium text-ink"
                    >
                        {BRUSH_PRESETS[brush].label}
                    </li>
                ))}
            </ul>
        </section>
    );
}
