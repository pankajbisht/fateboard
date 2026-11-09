import clsx from 'clsx';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/atoms/Icon';
import { FOCUS_RING } from '@/components/atoms/control.styles';

import { findTopic, HELP_GROUPS, HELP_TOPICS } from '../helpTopics';
import { EditorMap } from './EditorMap';
import { HELP_CARD, HELP_PILL_LINK, Keys } from './helpParts';
import { QuickStart } from './QuickStart';

const POPULAR = ['shapes', 'animate', 'export', 'layers', 'node', 'shortcuts'];

export function HelpHome() {
    return (
        <div className="space-y-8">
            <header className="rounded-lg bg-gradient-to-br from-primary-100 to-primary-50 p-6 md:p-8">
                <h1 className="text-display text-ink md:text-3xl">How can we help?</h1>
                <p className="mt-2 max-w-xl text-sm text-ink-muted">
                    Learn every tool in Fateboard, try things out right here, and jump straight to
                    the panel you need. Press <Keys caps={['/']} /> to search.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                    {POPULAR.map((id) => {
                        const topic = findTopic(id);
                        return (
                            topic && (
                                <Link key={id} to={`/help?topic=${id}`} className={HELP_PILL_LINK}>
                                    <Icon name={topic.icon} />
                                    {topic.title}
                                </Link>
                            )
                        );
                    })}
                </div>
            </header>

            <section className="space-y-3">
                <h2 className="text-title text-ink">Find your way around</h2>
                <EditorMap />
            </section>

            <QuickStart />

            {HELP_GROUPS.map((group) => (
                <section key={group} className="space-y-3">
                    <h2 className="text-title text-ink">{group}</h2>
                    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {HELP_TOPICS.filter((t) => t.group === group).map((topic) => (
                            <li key={topic.id}>
                                <Link
                                    to={`/help?topic=${topic.id}`}
                                    className={clsx(
                                        HELP_CARD,
                                        'flex h-full gap-3 p-3 transition-colors hover:border-primary-400',
                                        FOCUS_RING,
                                    )}
                                >
                                    <Icon
                                        name={topic.icon}
                                        className="mt-0.5 shrink-0 text-primary-ink"
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-ink">
                                            {topic.title}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-ink-muted">
                                            {topic.summary}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}
