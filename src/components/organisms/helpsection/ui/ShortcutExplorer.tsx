import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/atoms/Button';
import Chip from '@/components/atoms/Chip';
import { Icon } from '@/components/atoms/Icon';
import { Input } from '@/components/atoms/Input';

import {
    HELP_GESTURES,
    HELP_SHORTCUT_CATEGORIES,
    type HelpShortcut,
    helpShortcuts,
    isModifierOnly,
    pressedCaps,
} from '../helpShortcuts';
import { HELP_CARD, Keys } from './helpParts';

type Mode = 'browse' | 'find' | 'practice';
type Found = { caps: string[]; hits: HelpShortcut[] };
type Score = { right: number; missed: number; miss: HelpShortcut | null; wasRight: boolean };

const NEW_SCORE: Score = { right: 0, missed: 0, miss: null, wasRight: false };

const nextQuestion = (pool: HelpShortcut[], current?: HelpShortcut): HelpShortcut => {
    const i = Math.floor(Math.random() * pool.length);
    return pool[i] === current ? pool[(i + 1) % pool.length]! : pool[i]!;
};

/** A key press aimed at a control on the page, not at this tool. */
const isForTheControl = (e: KeyboardEvent): boolean => {
    if (!(e.target instanceof Element)) return false;
    if (e.target.tagName === 'INPUT') return true;
    return e.target.closest('button, a') !== null && (e.code === 'Enter' || e.code === 'Space');
};

export default function ShortcutExplorer() {
    const rows = useMemo(helpShortcuts, []);
    const pool = useMemo(() => rows.filter((r) => r.practice), [rows]);

    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string | null>(null);
    const [mode, setMode] = useState<Mode>('browse');
    const [found, setFound] = useState<Found | null>(null);
    const [question, setQuestion] = useState<HelpShortcut | null>(null);
    const [score, setScore] = useState<Score>(NEW_SCORE);

    useEffect(() => {
        if (mode === 'browse') return;

        const onKey = (e: KeyboardEvent) => {
            if (e.code === 'Tab' || isModifierOnly(e) || isForTheControl(e)) return;
            if (e.code === 'Escape') {
                setMode('browse');
                return;
            }
            e.preventDefault(); // ⌘S and friends must not trigger the browser while listening

            if (mode === 'find') {
                setFound({ caps: pressedCaps(e), hits: rows.filter((r) => r.matches(e)) });
                return;
            }
            if (!question) return;
            const correct = question.matches(e);
            setScore((s) =>
                correct
                    ? { ...s, right: s.right + 1, miss: null, wasRight: true }
                    : { ...s, missed: s.missed + 1, miss: question, wasRight: false },
            );
            setQuestion(nextQuestion(pool, question));
        };

        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mode, question, rows, pool]);

    const start = (next: Mode) => {
        // a focused button would swallow Space and Enter: the keys belong to the tool now
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setFound(null);
        setScore(NEW_SCORE);
        setQuestion(next === 'practice' ? nextQuestion(pool) : null);
        setMode(next);
    };

    const terms = query.trim().toLowerCase();
    const shown = rows.filter(
        (r) =>
            (!category || r.category === category) &&
            (!terms || `${r.label} ${r.caps.join(' ')}`.toLowerCase().includes(terms)),
    );
    const gestures = HELP_GESTURES.filter(
        (g) => !category && (!terms || g.label.toLowerCase().includes(terms)),
    );
    const categories = HELP_SHORTCUT_CATEGORIES.filter((c) => rows.some((r) => r.category === c));

    return (
        <div className="space-y-4">
            <section aria-label="Learn the keys" className={clsx(HELP_CARD, 'p-4')}>
                <div className="flex flex-wrap items-center gap-2">
                    {mode === 'browse' ? (
                        <>
                            <Button size="sm" onClick={() => start('find')}>
                                Press keys to find
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => start('practice')}>
                                Practice
                            </Button>
                        </>
                    ) : (
                        <Button size="sm" variant="secondary" onClick={() => setMode('browse')}>
                            Stop
                        </Button>
                    )}
                    {mode === 'practice' && (
                        <>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setQuestion(nextQuestion(pool, question!))}
                            >
                                Skip
                            </Button>
                            <span className="ml-auto text-sm font-semibold tabular-nums text-ink">
                                {score.right} right · {score.missed} missed
                            </span>
                        </>
                    )}
                </div>

                <div role="status" className="mt-3 min-h-6 text-sm text-ink-muted">
                    {mode === 'browse' && 'Find out what a key does, or test yourself.'}

                    {mode === 'find' &&
                        (!found ? (
                            'Listening… press any key combination. Escape stops.'
                        ) : found.hits.length ? (
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <Keys caps={found.caps} />
                                {found.hits.map((hit) => (
                                    <span key={hit.id} className="text-ink">
                                        <strong className="font-semibold">{hit.label}</strong>
                                        {hit.where && (
                                            <span className="text-ink-muted"> ({hit.where})</span>
                                        )}
                                    </span>
                                ))}
                            </span>
                        ) : (
                            <span className="flex flex-wrap items-center gap-2">
                                <Keys caps={found.caps} /> is not a shortcut in the editor.
                            </span>
                        ))}

                    {mode === 'practice' && question && (
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                                Press the keys for{' '}
                                <strong className="text-base font-semibold text-ink">
                                    {question.label}
                                </strong>
                            </span>
                            {score.miss && (
                                <span className="inline-flex items-center gap-1.5">
                                    {score.miss.label}: it was <Keys caps={score.miss.caps} />
                                </span>
                            )}
                            {score.wasRight && (
                                <span className="inline-flex items-center gap-1 text-ink">
                                    <Icon name="check" className="text-primary-ink" /> Correct
                                </span>
                            )}
                        </span>
                    )}
                </div>
            </section>

            <Input
                type="search"
                leadingIcon="magnifying-glass"
                placeholder="Filter by action or key"
                aria-label="Filter shortcuts"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />

            <div className="flex flex-wrap gap-1">
                <Chip active={!category} onClick={() => setCategory(null)}>
                    All
                </Chip>
                {categories.map((c) => (
                    <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                        {c}
                    </Chip>
                ))}
            </div>

            {shown.length === 0 && gestures.length === 0 && (
                <p className="py-6 text-center text-sm text-ink-muted">No shortcuts found.</p>
            )}

            <div className="gap-3 md:columns-2 [&>*]:mb-3 [&>*]:break-inside-avoid">
                {categories.map((c) => {
                    const inCategory = shown.filter((r) => r.category === c);
                    if (!inCategory.length) return null;
                    return (
                        <section key={c} className={clsx(HELP_CARD, 'p-4')}>
                            <h2 className="text-title text-ink">{c}</h2>
                            <ul className="mt-2 divide-y divide-line">
                                {inCategory.map((row) => (
                                    <li
                                        key={row.id}
                                        className="flex items-center justify-between gap-3 py-1.5"
                                    >
                                        <span className="min-w-0 text-sm text-ink">
                                            {row.label}
                                            {row.where && (
                                                <span className="block text-caption text-ink-muted">
                                                    {row.where}
                                                </span>
                                            )}
                                        </span>
                                        <span className="flex shrink-0 items-center gap-1 text-caption text-ink-muted">
                                            <Keys caps={row.caps} />
                                            {row.altCaps && (
                                                <>
                                                    or <Keys caps={row.altCaps} />
                                                </>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}

                {gestures.length > 0 && (
                    <section className={clsx(HELP_CARD, 'p-4')}>
                        <h2 className="text-title text-ink">With the mouse</h2>
                        <ul className="mt-2 divide-y divide-line">
                            {gestures.map((g) => (
                                <li
                                    key={g.label}
                                    className="flex items-center justify-between gap-3 py-1.5"
                                >
                                    <span className="min-w-0 text-sm text-ink">{g.label}</span>
                                    <Keys caps={g.caps} />
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </div>
    );
}
