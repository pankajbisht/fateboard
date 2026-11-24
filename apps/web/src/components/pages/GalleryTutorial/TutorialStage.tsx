/**
 * The piece, built step by step: the SVG is shown inline and each `<g id="step-N">` gets a state
 * (done / current / next) that CSS turns into visibility. Ghost shows what comes next faintly (for
 * tracing), Spotlight dims what is already done. Play is opt-in (never on load), stops at the end.
 * Arrow keys / Home / End work while the stage has focus.
 */
import clsx from 'clsx';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { Chip } from '@/components/atoms/Chip';
import { Icon } from '@/components/atoms/Icon';
import { IconButton } from '@/components/atoms/IconButton';
import { FOCUS_RING } from '@/components/atoms/control.styles';

import type { TutorialStep } from '../web/gallery/galleryTutorials';
import type { ArtworkState } from './useArtwork';

export const PLAY_MS = 1800;

interface TutorialStageProps {
    title: string;
    artwork: ArtworkState;
    steps: TutorialStep[];
    step: number;
    onStep: (step: number) => void;
}

export function TutorialStage({ title, artwork, steps, step, onStep }: TutorialStageProps) {
    const boardRef = useRef<HTMLDivElement>(null);
    const [playing, setPlaying] = useState(false);
    const [ghost, setGhost] = useState(false);
    const [spotlight, setSpotlight] = useState(false);
    const last = steps.length - 1;
    const go = (to: number) => onStep(Math.min(last, Math.max(0, to)));

    // put the SVG in the board once per artwork
    useEffect(() => {
        const board = boardRef.current;
        if (!board || artwork.status !== 'ready') return;
        const doc = new DOMParser().parseFromString(artwork.svg, 'image/svg+xml');
        const svg = document.importNode(doc.documentElement, true);
        svg.setAttribute('width', '100%');
        svg.removeAttribute('height');
        svg.setAttribute('aria-hidden', 'true');
        svg.querySelector('title')?.remove();
        board.replaceChildren(svg);
    }, [artwork]);

    // mark every step group done / current / next
    useEffect(() => {
        boardRef.current?.querySelectorAll('g[id^="step-"]').forEach((group, i) => {
            const state = i < step ? 'done' : i === step ? 'current' : 'next';
            group.setAttribute('data-state', state);
        });
    }, [artwork, step]);

    useEffect(() => {
        if (!playing) return;
        if (step >= last) {
            setPlaying(false);
            return;
        }
        const timer = setTimeout(() => onStep(step + 1), PLAY_MS);
        return () => clearTimeout(timer);
    }, [playing, step, last, onStep]);

    const togglePlay = () => {
        if (!playing && step >= last) onStep(0);
        setPlaying((p) => !p);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
        if (e.target !== e.currentTarget || e.altKey || e.metaKey || e.ctrlKey) return;
        const to = { ArrowLeft: step - 1, ArrowRight: step + 1, Home: 0, End: last }[e.key];
        if (to === undefined) return;
        e.preventDefault();
        setPlaying(false);
        go(to);
    };

    const current = steps[step];

    return (
        <section
            aria-label={`Build ${title} step by step`}
            tabIndex={0}
            onKeyDown={onKeyDown}
            className={clsx(
                'rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4',
                FOCUS_RING,
            )}
        >
            <div
                ref={boardRef}
                role="img"
                aria-label={`${title}, step ${step + 1} of ${steps.length}: ${current?.title ?? ''}`}
                data-testid="tutorial-board"
                className={clsx(
                    'aspect-[4/3] overflow-hidden rounded-xl bg-surface-muted [&_svg]:block',
                    '[&_[data-state]]:transition-opacity [&_[data-state]]:duration-500 motion-reduce:[&_[data-state]]:transition-none',
                    ghost
                        ? '[&_[data-state=next]]:opacity-[.12]'
                        : '[&_[data-state=next]]:opacity-0',
                    spotlight && '[&_[data-state=done]]:opacity-30',
                )}
            >
                {artwork.status === 'error' && (
                    <p className="flex h-full items-center justify-center p-6 text-sm text-ink-muted">
                        The artwork could not load. Check your connection and reload.
                    </p>
                )}
            </div>

            <p aria-live="polite" className="mt-3 text-sm text-ink">
                <span className="font-bold tabular-nums text-primary-ink">
                    Step {step + 1} of {steps.length}
                </span>
                <span className="text-ink-muted"> · {current?.title}</span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <IconButton
                    size="sm"
                    icon={<Icon name="chevron-left" />}
                    aria-label="Previous step"
                    disabled={step === 0}
                    onClick={() => {
                        setPlaying(false);
                        go(step - 1);
                    }}
                />
                <IconButton
                    size="sm"
                    icon={<Icon name={playing ? 'pause' : 'play'} />}
                    aria-label={playing ? 'Pause' : 'Play the build'}
                    onClick={togglePlay}
                />
                <IconButton
                    size="sm"
                    icon={<Icon name="chevron-right" />}
                    aria-label="Next step"
                    disabled={step === last}
                    onClick={() => {
                        setPlaying(false);
                        go(step + 1);
                    }}
                />
                <div className="flex flex-1 items-center gap-1" aria-label="Steps" role="group">
                    {steps.map((s, i) => (
                        <button
                            key={s.title}
                            type="button"
                            aria-label={`Step ${i + 1}: ${s.title}`}
                            aria-current={i === step ? 'step' : undefined}
                            onClick={() => {
                                setPlaying(false);
                                go(i);
                            }}
                            className={clsx(
                                'h-2 flex-1 rounded-full transition-colors',
                                FOCUS_RING,
                                i <= step
                                    ? 'bg-primary-600'
                                    : 'bg-surface-strong hover:bg-line-strong',
                            )}
                        />
                    ))}
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <Chip active={ghost} icon="eye" onClick={() => setGhost((g) => !g)}>
                    Ghost next steps
                </Chip>
                <Chip active={spotlight} icon="crosshairs" onClick={() => setSpotlight((s) => !s)}>
                    Spotlight this step
                </Chip>
            </div>
        </section>
    );
}
