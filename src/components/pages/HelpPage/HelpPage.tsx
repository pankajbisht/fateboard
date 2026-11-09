import clsx from 'clsx';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FOCUS_RING } from '@/components/atoms/control.styles';
import {
    buildHelpIndex,
    type HelpHit,
    searchHelp,
    searchTerms,
} from '@/components/organisms/helpsection/helpSearch';
import { helpShortcuts } from '@/components/organisms/helpsection/helpShortcuts';
import {
    findTopic,
    HELP_GROUPS,
    HELP_TOPICS,
    sectionSlug,
} from '@/components/organisms/helpsection/helpTopics';
import { HelpHome } from '@/components/organisms/helpsection/ui/HelpHome';
import { HELP_CARD, Highlight, Keys } from '@/components/organisms/helpsection/ui/helpParts';
import { TopicView } from '@/components/organisms/helpsection/ui/TopicView';
import { canvasKeysBlocked } from '@/lib/keyboard/modalOpen';

const OVERVIEW = '';

const hitHref = (hit: HelpHit) =>
    `/help?topic=${hit.topicId}${hit.section && !hit.caps ? `&section=${sectionSlug(hit.section)}` : ''}`;

const isTyping = (el: EventTarget | null) =>
    el instanceof HTMLElement &&
    (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);

export default function HelpPage() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const topic = findTopic(params.get('topic'));

    const [query, setQuery] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLUListElement>(null);
    const mainRef = useRef<HTMLElement>(null);

    const index = useMemo(() => buildHelpIndex(HELP_TOPICS, helpShortcuts()), []);
    const hits = useMemo(() => searchHelp(index, query), [index, query]);
    const terms = searchTerms(query);
    const searching = terms.length > 0;

    useLayoutEffect(() => {
        mainRef.current?.scrollTo?.({ top: 0 });
    }, [topic?.id]);

    // "/" jumps to search from anywhere on the page
    useEffect(() => {
        const onKey = (e: globalThis.KeyboardEvent) => {
            if (e.key !== '/' || isTyping(e.target) || canvasKeysBlocked()) return;
            e.preventDefault();
            searchRef.current?.focus();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') setQuery('');
        if (e.key === 'Enter' && hits[0]) {
            navigate(hitHref(hits[0]));
            setQuery('');
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            resultsRef.current?.querySelector('a')?.focus();
        }
    };

    const onResultsKey = (e: KeyboardEvent<HTMLUListElement>) => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const links = [...(resultsRef.current?.querySelectorAll('a') ?? [])];
        const at = links.indexOf(document.activeElement as HTMLAnchorElement);
        const next = links[at + (e.key === 'ArrowDown' ? 1 : -1)];
        (next ?? searchRef.current)?.focus();
    };

    return (
        <div className="flex h-dvh flex-col bg-surface-muted text-ink md:flex-row">
            <aside className="flex shrink-0 flex-col gap-3 border-b border-line bg-surface p-4 md:w-64 md:border-b-0 md:border-r">
                <div className="flex items-center justify-between gap-2">
                    <Link
                        to="/help"
                        onClick={() => setQuery('')}
                        className={clsx('rounded-sm text-title text-ink', FOCUS_RING)}
                    >
                        Help
                    </Link>
                    <Link
                        to="/draw"
                        className={clsx(
                            'inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-primary-ink hover:underline',
                            FOCUS_RING,
                        )}
                    >
                        Open editor
                        <Icon name="chevron-right" />
                    </Link>
                </div>

                <Input
                    ref={searchRef}
                    type="search"
                    leadingIcon="magnifying-glass"
                    placeholder="Search help"
                    aria-label="Search help"
                    value={query}
                    autoComplete="off"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onSearchKey}
                />

                <div className="md:hidden">
                    <Select
                        aria-label="Help topic"
                        value={topic?.id ?? OVERVIEW}
                        onChange={(id) => {
                            setQuery('');
                            navigate(id ? `/help?topic=${id}` : '/help');
                        }}
                        options={[
                            { value: OVERVIEW, label: 'Overview' },
                            ...HELP_TOPICS.map((t) => ({ value: t.id, label: t.title })),
                        ]}
                    />
                </div>

                <nav
                    aria-label="Help topics"
                    className="hidden min-h-0 flex-1 space-y-4 overflow-y-auto md:block"
                >
                    {HELP_GROUPS.map((group) => (
                        <div key={group}>
                            <p className="mb-1 px-2 text-label uppercase text-ink-muted">{group}</p>
                            <ul className="space-y-0.5">
                                {HELP_TOPICS.filter((t) => t.group === group).map((t) => {
                                    const current = t.id === topic?.id;
                                    return (
                                        <li key={t.id}>
                                            <Link
                                                to={`/help?topic=${t.id}`}
                                                aria-current={current ? 'page' : undefined}
                                                onClick={() => setQuery('')}
                                                className={clsx(
                                                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                                    FOCUS_RING,
                                                    current
                                                        ? 'bg-primary-100 font-semibold text-primary-ink'
                                                        : 'text-ink hover:bg-surface-muted',
                                                )}
                                            >
                                                <Icon name={t.icon} className="shrink-0" />
                                                <span className="truncate">{t.title}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>

            <main ref={mainRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
                <div className="mx-auto max-w-4xl p-4 md:p-8">
                    {searching ? (
                        <div className="space-y-4">
                            <h1 className="text-display text-ink">
                                {hits.length ? `Results for “${query.trim()}”` : 'No results'}
                            </h1>
                            {hits.length ? (
                                <ul
                                    ref={resultsRef}
                                    aria-label="Search results"
                                    onKeyDown={onResultsKey}
                                    className="space-y-2"
                                >
                                    {hits.map((hit) => (
                                        <li key={`${hit.topicId}/${hit.section ?? ''}/${hit.text}`}>
                                            <Link
                                                to={hitHref(hit)}
                                                onClick={() => setQuery('')}
                                                className={clsx(
                                                    HELP_CARD,
                                                    'flex items-center justify-between gap-4 p-3 transition-colors hover:border-primary-400',
                                                    FOCUS_RING,
                                                )}
                                            >
                                                <span className="min-w-0">
                                                    <span className="block text-caption text-ink-muted">
                                                        {hit.topicTitle}
                                                        {hit.section && ` · ${hit.section}`}
                                                    </span>
                                                    <span className="mt-0.5 block text-sm text-ink">
                                                        <Highlight text={hit.text} terms={terms} />
                                                    </span>
                                                </span>
                                                {hit.caps && <Keys caps={hit.caps} />}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-ink-muted">
                                    Nothing matches “{query.trim()}”. Try a different word.
                                </p>
                            )}
                        </div>
                    ) : topic ? (
                        <TopicView key={topic.id} topic={topic} />
                    ) : (
                        <HelpHome />
                    )}
                </div>
            </main>
        </div>
    );
}
