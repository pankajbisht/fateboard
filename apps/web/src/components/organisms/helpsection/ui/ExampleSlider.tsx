/**
 * "Build something real": the real-world examples of a topic, one per slide. Each slide holds
 * its own step slider (`ExampleSteps`), so this is a slider inside a slider. A search link
 * (`?section=example-…`) opens the example it found.
 */
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Icon } from '@/components/atoms/Icon';
import { IconButton } from '@/components/atoms/IconButton';
import { FOCUS_RING } from '@/components/atoms/control.styles';

import { examplesFor, exampleSection } from '../helpExamples';
import { findTopic, type HelpTopic } from '../helpTopics';
import { ExampleSteps } from './ExampleSteps';
import { HELP_CARD, HELP_PILL_LINK } from './helpParts';

const FLASH_MS = 1600;

export function ExampleSlider({ topic }: { topic: HelpTopic }) {
    const examples = examplesFor(topic.id);
    const [params] = useSearchParams();
    const target = params.get('section');
    const targetIndex = examples.findIndex((e) => exampleSection(e) === target);

    const [active, setActive] = useState(Math.max(0, targetIndex));
    // a new search link to an example of this topic: show it (state follows the address)
    const [seenTarget, setSeenTarget] = useState(target);
    if (target !== seenTarget) {
        setSeenTarget(target);
        if (targetIndex >= 0) setActive(targetIndex);
    }

    const [flash, setFlash] = useState(false);
    useEffect(() => {
        if (targetIndex < 0) return;
        document.getElementById('section-examples')?.scrollIntoView?.({ block: 'center' });
        setFlash(true);
        const timer = setTimeout(() => setFlash(false), FLASH_MS);
        return () => clearTimeout(timer);
    }, [targetIndex, target]);

    if (!examples.length) return null;
    const total = examples.length;
    const go = (to: number) => setActive((to + total) % total);

    return (
        <section
            id="section-examples"
            aria-roledescription="carousel"
            aria-label="Real-world examples"
            className={clsx(
                HELP_CARD,
                'scroll-mt-4 overflow-hidden transition-shadow duration-300',
                flash && 'ring-2 ring-primary-400',
            )}
        >
            <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
                <Icon name="wand-magic-sparkles" className="text-primary-ink" />
                <h2 className="text-title text-ink">Build something real</h2>
                {total > 1 && (
                    <div className="ml-auto flex items-center gap-1">
                        <span className="mr-1 text-caption tabular-nums text-ink-muted">
                            {active + 1} / {total}
                        </span>
                        <IconButton
                            size="sm"
                            icon={<Icon name="chevron-left" />}
                            aria-label="Previous example"
                            onClick={() => go(active - 1)}
                        />
                        <IconButton
                            size="sm"
                            icon={<Icon name="chevron-right" />}
                            aria-label="Next example"
                            onClick={() => go(active + 1)}
                        />
                    </div>
                )}
            </div>

            {total > 1 && (
                <div
                    role="group"
                    aria-label="Choose an example"
                    className="flex gap-2 overflow-x-auto px-4 pt-3"
                >
                    {examples.map((example, i) => (
                        <button
                            key={example.id}
                            type="button"
                            aria-pressed={i === active}
                            onClick={() => go(i)}
                            className={clsx(
                                'relative flex shrink-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                                FOCUS_RING,
                                i === active
                                    ? 'border-primary-400 bg-primary-50 text-primary-ink dark:bg-primary-950'
                                    : 'border-line text-ink-muted hover:border-primary-300 hover:text-ink',
                            )}
                        >
                            <Icon name={example.icon} />
                            {example.title}
                            {i === active && (
                                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary-600" />
                            )}
                        </button>
                    ))}
                </div>
            )}

            <div className="overflow-hidden">
                <div
                    className="flex motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
                    style={{ transform: `translateX(-${active * 100}%)` }}
                >
                    {examples.map((example, i) => (
                        <div
                            key={example.id}
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`${i + 1} of ${total}: ${example.title}`}
                            aria-hidden={i !== active}
                            inert={i !== active}
                            className="w-full shrink-0 space-y-3 p-4"
                        >
                            <div className="flex items-start gap-3">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-lg text-primary-ink">
                                    <Icon name={example.icon} />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="text-title text-ink">{example.title}</h3>
                                    <p className="text-sm text-ink-muted">{example.brief}</p>
                                </div>
                            </div>

                            <ExampleSteps example={example} topic={topic} active={i === active} />

                            {!!example.uses?.length && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-caption text-ink-muted">Also uses</span>
                                    {example.uses.map((id) => {
                                        const used = findTopic(id);
                                        return (
                                            used && (
                                                <Link
                                                    key={id}
                                                    to={`/help?topic=${id}`}
                                                    className={HELP_PILL_LINK}
                                                >
                                                    <Icon name={used.icon} />
                                                    {used.title}
                                                </Link>
                                            )
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
