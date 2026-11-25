import clsx from 'clsx';
import { useEffect, useState, type ComponentType } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Icon } from '@/components/atoms/Icon';

import {
    editorHref,
    findTopic,
    type HelpDemo,
    type HelpTopic,
    HELP_TOPICS,
    sectionSlug,
} from '../helpTopics';
import { AnimateDemo } from './demos/AnimateDemo';
import { BrushesDemo, ShapesDemo } from './demos/CatalogDemos';
import { ExportDemo } from './demos/ExportDemo';
import { FiltersDemo } from './demos/FiltersDemo';
import { ExampleSlider } from './ExampleSlider';
import { NodeDemo } from './demos/NodeDemo';
import { GridDemo, PathDemo, RadialDemo } from './demos/RepeatDemos';
import { HELP_CARD, HELP_PILL_LINK, HELP_PRIMARY_LINK, RichText } from './helpParts';
import ShortcutExplorer from './ShortcutExplorer';

const DEMOS: Record<HelpDemo, ComponentType> = {
    node: NodeDemo,
    brushes: BrushesDemo,
    shapes: ShapesDemo,
    grid: GridDemo,
    radial: RadialDemo,
    path: PathDemo,
    filters: FiltersDemo,
    animate: AnimateDemo,
    export: ExportDemo,
    shortcuts: ShortcutExplorer,
};

const FLASH_MS = 1600;

export function TopicView({ topic }: { topic: HelpTopic }) {
    const [params] = useSearchParams();
    const target = params.get('section');
    const [flash, setFlash] = useState<string | null>(null);

    // a search result points at one section: bring it into view and mark it for a moment
    useEffect(() => {
        if (!target) return;
        document.getElementById(`section-${target}`)?.scrollIntoView?.({ block: 'center' });
        setFlash(target);
        const timer = setTimeout(() => setFlash(null), FLASH_MS);
        return () => clearTimeout(timer);
    }, [topic.id, target]);

    const index = HELP_TOPICS.indexOf(topic);
    const previous = HELP_TOPICS[index - 1];
    const next = HELP_TOPICS[index + 1];
    const Demo = topic.demo && DEMOS[topic.demo];

    return (
        <article className="space-y-6">
            <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-xl text-primary-ink">
                    <Icon name={topic.icon} />
                </span>
                <div className="min-w-0 flex-1 basis-64">
                    <p className="text-label uppercase text-ink-muted">{topic.group}</p>
                    <h1 className="text-display text-ink">{topic.title}</h1>
                    <p className="mt-1 text-sm text-ink-muted">{topic.summary}</p>
                </div>
                {topic.open && (
                    <Link to={editorHref(topic.open)} className={HELP_PRIMARY_LINK}>
                        {topic.open.label}
                        <Icon name="chevron-right" />
                    </Link>
                )}
            </header>

            {Demo && <Demo />}

            {topic.sections.length > 0 && (
                <div className="gap-3 md:columns-2 [&>*]:mb-3 [&>*]:break-inside-avoid">
                    {topic.sections.map((section) => {
                        const slug = sectionSlug(section.title);
                        return (
                            <section
                                key={section.title}
                                id={`section-${slug}`}
                                className={clsx(
                                    HELP_CARD,
                                    'scroll-mt-4 p-4 transition-shadow duration-300',
                                    flash === slug && 'ring-2 ring-primary-400',
                                )}
                            >
                                <h2 className="text-title text-ink">{section.title}</h2>
                                {section.text && (
                                    <p className="mt-1.5 text-sm text-ink-muted">
                                        <RichText text={section.text} />
                                    </p>
                                )}
                                {section.items && (
                                    <ul className="mt-2 space-y-1.5">
                                        {section.items.map((item) => (
                                            <li
                                                key={item}
                                                className="flex gap-2 text-sm text-ink-muted"
                                            >
                                                <span
                                                    aria-hidden
                                                    className="mt-2 size-1 shrink-0 rounded-full bg-primary-600"
                                                />
                                                <span className="min-w-0">
                                                    <RichText text={item} />
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}

            <ExampleSlider key={topic.id} topic={topic} />

            {!!topic.related?.length && (
                <section>
                    <h2 className="text-label uppercase text-ink-muted">Related</h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {topic.related.map((id) => {
                            const related = findTopic(id);
                            return (
                                related && (
                                    <Link
                                        key={id}
                                        to={`/help?topic=${id}`}
                                        className={HELP_PILL_LINK}
                                    >
                                        <Icon name={related.icon} />
                                        {related.title}
                                    </Link>
                                )
                            );
                        })}
                    </div>
                </section>
            )}

            <nav aria-label="Previous and next topic" className="flex justify-between gap-3 pt-2">
                {previous ? (
                    <Link
                        to={`/help?topic=${previous.id}`}
                        className={clsx(HELP_PILL_LINK, 'min-w-0')}
                    >
                        <Icon name="chevron-left" />
                        <span className="truncate">Previous: {previous.title}</span>
                    </Link>
                ) : (
                    <Link to="/help" className={HELP_PILL_LINK}>
                        <Icon name="chevron-left" />
                        Overview
                    </Link>
                )}
                {next && (
                    <Link to={`/help?topic=${next.id}`} className={clsx(HELP_PILL_LINK, 'min-w-0')}>
                        <span className="truncate">Next: {next.title}</span>
                        <Icon name="chevron-right" />
                    </Link>
                )}
            </nav>
        </article>
    );
}
