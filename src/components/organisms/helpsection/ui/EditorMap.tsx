import clsx from 'clsx';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { FOCUS_RING } from '@/components/atoms/control.styles';

import { findTopic } from '../helpTopics';
import { HELP_CARD, HELP_PILL_LINK } from './helpParts';

interface Region {
    id: string;
    label: string;
    /** Grid placement in the schematic. */
    area: string;
    description: string;
    topics: string[];
}

const REGIONS: Region[] = [
    {
        id: 'top',
        label: 'Top bar',
        area: 'col-span-3',
        description: 'File actions, undo, the clipboard, arranging, and exact position and size.',
        topics: ['top-bar', 'arrange', 'clones', 'basics'],
    },
    {
        id: 'rail',
        label: 'Left rail',
        area: '',
        description: 'Your tools, and the panels you add things from.',
        topics: [
            'select',
            'hand',
            'node',
            'pen',
            'pencil',
            'laser',
            'draw',
            'shapes',
            'text',
            'templates',
            'font-templates',
            'pages',
            'layers',
        ],
    },
    {
        id: 'canvas',
        label: 'Your board',
        area: '',
        description: 'Where the work happens. Right-click anything for quick actions.',
        topics: ['select', 'hand', 'basics'],
    },
    {
        id: 'dock',
        label: 'Right dock',
        area: '',
        description: 'The color strip, and tabs for effects, animation and export.',
        topics: [
            'color',
            'fill-shadow',
            'tiling',
            'rotate',
            'along-path',
            'filters',
            'animate',
            'export',
        ],
    },
    {
        id: 'footer',
        label: 'Footer',
        area: 'col-span-3',
        description: 'What gets painted, stroke style, combining shapes, and zoom.',
        topics: ['color', 'boolean', 'top-bar'],
    },
];

/** A clickable schematic of the editor: pick a part to see what lives there. */
export function EditorMap() {
    const [activeId, setActiveId] = useState(REGIONS[1]!.id);
    const active = REGIONS.find((r) => r.id === activeId) ?? REGIONS[0]!;

    return (
        <div
            className={clsx(HELP_CARD, 'grid gap-4 p-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]')}
        >
            <div
                role="group"
                aria-label="Editor map"
                className="grid h-56 grid-cols-[4rem_minmax(0,1fr)_4.5rem] grid-rows-[2rem_minmax(0,1fr)_2rem] gap-1 rounded-md bg-surface-strong p-1"
            >
                {REGIONS.map((region) => (
                    <button
                        key={region.id}
                        type="button"
                        aria-pressed={region.id === active.id}
                        onClick={() => setActiveId(region.id)}
                        onMouseEnter={() => setActiveId(region.id)}
                        className={clsx(
                            'cursor-pointer rounded-sm text-caption font-medium transition-colors',
                            region.area,
                            FOCUS_RING,
                            region.id === active.id
                                ? 'bg-primary-600 text-white'
                                : 'bg-surface text-ink hover:bg-primary-100 hover:text-primary-ink',
                        )}
                    >
                        {region.label}
                    </button>
                ))}
            </div>

            <div role="region" aria-label={active.label} className="min-w-0">
                <h3 className="text-title text-ink">{active.label}</h3>
                <p className="mt-1 text-sm text-ink-muted">{active.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {active.topics.map((id) => {
                        const topic = findTopic(id);
                        return (
                            topic && (
                                <Link key={id} to={`/help?topic=${id}`} className={HELP_PILL_LINK}>
                                    {topic.title}
                                </Link>
                            )
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
