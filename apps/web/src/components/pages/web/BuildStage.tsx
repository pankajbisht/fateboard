/**
 * "From thought to visual" on the landing page: a live board that builds a launch poster, step
 * by step, next to the three steps it illustrates (they light up in sync; click one to jump).
 * Watch plays by itself (not under reduced motion, paused while the pointer is on it) and has a
 * time-lapse scrubber that blends the steps; Compare puts the sketch and the finished poster
 * behind a wipe; a zoom lens follows the mouse. Arrow keys work only while the stage has focus.
 * Replaces the screenshot slider (BUG-196).
 */
import clsx from 'clsx';
import { useEffect, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { Icon } from '@/components/atoms/Icon';
import { IconButton } from '@/components/atoms/IconButton';
import { Slider } from '@/components/atoms/Slider';
import { FOCUS_RING } from '@/components/atoms/control.styles';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';

import { STORY_STEPS } from './buildStory';
import { type StageMode, type StageState, StageView, STORY_LAST } from './StageView';

/** How long the stage shows each step while it plays. */
export const STAGE_MS = 3500;
const LENS = 128;
const ZOOM = 2.2;

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const KEY_STEP: Record<string, (step: number) => number> = {
    ArrowRight: (s) => s + 1,
    ArrowLeft: (s) => s - 1,
    Home: () => 0,
    End: () => STORY_LAST,
};

export function BuildStage() {
    const [step, setStep] = useState(0);
    const [scrub, setScrub] = useState<number | null>(null);
    const [mode, setMode] = useState<StageMode>('watch');
    const [wipe, setWipe] = useState(50);
    const [playing, setPlaying] = useState(() => !prefersReducedMotion());
    const [held, setHeld] = useState(false);
    const [lensOn, setLensOn] = useState(true);
    const [lens, setLens] = useState<{ x: number; y: number; w: number } | null>(null);
    const running = playing && !held && mode === 'watch' && scrub === null;
    const state: StageState = { mode, step, scrub, wipe };

    useEffect(() => {
        if (!running) return;
        const timer = setTimeout(() => setStep((s) => (s + 1) % (STORY_LAST + 1)), STAGE_MS);
        return () => clearTimeout(timer);
    }, [running, step]);

    /** Any hand on the controls takes over from autoplay. */
    const go = (to: number) => {
        setPlaying(false);
        setMode('watch');
        setScrub(null);
        setStep(clamp(to, 0, STORY_LAST));
    };

    const onStageKey = (e: KeyboardEvent<HTMLElement>) => {
        const move = KEY_STEP[e.key];
        if (e.target !== e.currentTarget || !move) return;
        e.preventDefault();
        go(move(step));
    };
    const onScrubKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const move = KEY_STEP[e.key];
        if (!move) return;
        e.preventDefault(); // whole steps, not 0.01 nudges
        go(move(Math.round(scrub ?? step)));
    };
    const onWipeKey = (e: KeyboardEvent<HTMLDivElement>) => {
        const next = { ArrowLeft: wipe - 5, ArrowRight: wipe + 5, Home: 0, End: 100 }[e.key];
        if (next === undefined) return;
        e.preventDefault();
        setWipe(clamp(next, 0, 100));
    };

    const onPicturePointer = (e: PointerEvent<HTMLDivElement>) => {
        const box = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - box.left;
        const y = e.clientY - box.top;
        const dragging = e.buttons === 1 || e.type === 'pointerdown';
        if (mode === 'compare' && dragging && box.width)
            setWipe(clamp((x / box.width) * 100, 0, 100));
        setLens(e.pointerType === 'mouse' && !dragging ? { x, y, w: box.width } : null);
    };

    return (
        <div className="theme-light mt-16 grid items-center gap-10 lg:grid-cols-[.7fr_1.3fr] lg:gap-14">
            <ol className="space-y-3">
                {STORY_STEPS.map((item, i) => {
                    const current = mode === 'watch' && Math.round(scrub ?? step) === i;
                    const done = Math.round(scrub ?? step) > i;
                    return (
                        <li key={item.title}>
                            <button
                                type="button"
                                aria-current={current ? 'step' : undefined}
                                onClick={() => go(i)}
                                className={clsx(
                                    'flex w-full cursor-pointer gap-5 rounded-xl p-3 text-left transition-colors',
                                    current ? 'bg-surface shadow-md' : 'hover:bg-surface/70',
                                    FOCUS_RING,
                                )}
                            >
                                <span
                                    className={clsx(
                                        'flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-transform',
                                        done || current
                                            ? 'bg-primary-600 text-white shadow-lg'
                                            : 'bg-surface-strong text-ink-muted',
                                        current && 'scale-110',
                                    )}
                                >
                                    {done ? <Icon name="check" /> : String(i + 1).padStart(2, '0')}
                                </span>
                                <span>
                                    <span className="block font-bold text-ink">{item.title}</span>
                                    <span className="mt-1 block text-sm leading-6 text-ink-muted">
                                        {item.description}
                                    </span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            <section
                aria-label="From thought to visual, live"
                aria-roledescription="carousel"
                tabIndex={0}
                onKeyDown={onStageKey}
                onPointerEnter={() => setHeld(true)}
                onPointerLeave={() => setHeld(false)}
                className={clsx(
                    'rounded-2xl border border-line bg-surface p-3 shadow-xl sm:p-4',
                    FOCUS_RING,
                )}
            >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <SegmentedControl<StageMode>
                        aria-label="View"
                        block={false}
                        size="sm"
                        value={mode}
                        onChange={(next) => {
                            setPlaying(false);
                            setScrub(null);
                            setMode(next);
                        }}
                        options={[
                            { value: 'watch', label: 'Watch', icon: 'play' },
                            { value: 'compare', label: 'Compare', icon: 'arrows-left-right' },
                        ]}
                    />
                    <div className="ml-auto flex items-center gap-1">
                        <IconButton
                            icon={<Icon name="magnifying-glass-plus" />}
                            aria-label="Zoom lens"
                            title="Zoom lens"
                            active={lensOn}
                            onClick={() => setLensOn(!lensOn)}
                        />
                        {mode === 'watch' && (
                            <IconButton
                                tone={running ? 'default' : 'primary'}
                                icon={<Icon name={running ? 'pause' : 'play'} />}
                                aria-label={playing ? 'Pause' : 'Play'}
                                onClick={() => {
                                    if (!playing && step === STORY_LAST) setStep(0);
                                    setPlaying(!playing);
                                }}
                            />
                        )}
                    </div>
                </div>

                <div
                    data-stage-picture
                    className={clsx(
                        'relative touch-pan-y',
                        mode === 'compare' && 'cursor-ew-resize',
                    )}
                    onPointerDown={onPicturePointer}
                    onPointerMove={onPicturePointer}
                    onPointerLeave={() => setLens(null)}
                >
                    <StageView state={state} />
                    {mode === 'compare' && (
                        <div
                            role="slider"
                            tabIndex={0}
                            aria-label="Compare thought and visual"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(wipe)}
                            aria-valuetext={`${Math.round(wipe)}% sketch`}
                            onKeyDown={onWipeKey}
                            className={clsx(
                                'absolute inset-y-0 w-0.5 -translate-x-1/2 bg-surface shadow',
                                FOCUS_RING,
                            )}
                            style={{ left: `${wipe}%` }}
                        >
                            <span className="absolute left-1/2 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-md">
                                <Icon name="arrows-left-right" />
                            </span>
                        </div>
                    )}
                    {lens && lensOn && (
                        <div
                            data-testid="stage-lens"
                            aria-hidden
                            className="pointer-events-none absolute z-10 overflow-hidden rounded-full border-4 border-surface bg-surface shadow-2xl"
                            style={{
                                width: LENS,
                                height: LENS,
                                left: lens.x - LENS / 2,
                                top: lens.y - LENS / 2,
                            }}
                        >
                            <div
                                className="absolute origin-top-left"
                                style={{
                                    width: lens.w,
                                    left: LENS / 2 - lens.x * ZOOM,
                                    top: LENS / 2 - lens.y * ZOOM,
                                    transform: `scale(${ZOOM})`,
                                }}
                            >
                                <StageView state={state} still />
                            </div>
                        </div>
                    )}
                </div>

                {mode === 'watch' && (
                    <div className="mt-3 flex items-center gap-3">
                        <span className="w-16 shrink-0 text-caption font-semibold tabular-nums text-ink-muted">
                            {step === STORY_LAST && scrub === null
                                ? 'Finished'
                                : `Step ${Math.min(Math.floor(scrub ?? step), STORY_LAST - 1) + 1} / ${STORY_LAST}`}
                        </span>
                        <div className="relative flex-1" onKeyDownCapture={onScrubKey}>
                            <Slider
                                aria-label="Time-lapse"
                                aria-valuetext={
                                    scrub === null && step === STORY_LAST
                                        ? 'Finished'
                                        : `Step ${Math.floor(scrub ?? step) + 1}`
                                }
                                min={0}
                                max={STORY_LAST}
                                step={0.01}
                                value={scrub ?? step}
                                onChange={(v) => {
                                    setPlaying(false);
                                    setScrub(v);
                                }}
                                onCommit={(v) => go(Math.round(v))}
                            />
                            {running && (
                                <span
                                    key={step}
                                    aria-hidden
                                    className="pointer-events-none absolute -bottom-1.5 left-0 h-0.5 w-full origin-left animate-help-progress rounded-full bg-primary-400 motion-reduce:hidden"
                                    style={{ animationDuration: `${STAGE_MS}ms` }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
