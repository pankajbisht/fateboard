/**
 * The inner slider of a real-world example: watch the project get built. The picture on top shows
 * the board after each step (new pieces draw in, a cursor shows where to act, a label names the
 * control); the caption below slides from step to step, then to the result. Play walks through
 * the steps on its own (only when asked); stepping by hand, or leaving the example, stops it.
 */
import clsx from 'clsx';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from '@/components/atoms/Icon';
import { IconButton } from '@/components/atoms/IconButton';
import { FOCUS_RING } from '@/components/atoms/control.styles';

import type { HelpExample } from '../helpExamples';
import { editorHref, type HelpTopic } from '../helpTopics';
import { ExampleScene } from './ExampleScene';
import { HELP_PRIMARY_LINK, RichText } from './helpParts';

/** How long Play shows each step. */
export const STEP_MS = 4000;

const pad = (n: number) => String(n).padStart(2, '0');
/** At either end the arrow stays focusable (a disabled button would drop keyboard focus). */
const END_BUTTON = 'aria-disabled:cursor-default aria-disabled:opacity-40';

export function ExampleSteps({
    example,
    topic,
    active,
}: {
    example: HelpExample;
    topic: HelpTopic;
    /** False while its example is off screen: Play stops there. */
    active: boolean;
}) {
    const count = example.steps.length;
    const last = count; // the result slide comes after the steps
    const [step, setStep] = useState(0);
    const [playing, setPlaying] = useState(false);
    // leaving the example stops Play for good, so coming back does not restart it
    if (playing && !active) setPlaying(false);
    const running = playing && step < last;

    useEffect(() => {
        if (!running) return;
        const timer = setTimeout(() => {
            setStep((s) => Math.min(s + 1, last));
            if (step + 1 >= last) setPlaying(false);
        }, STEP_MS);
        return () => clearTimeout(timer);
    }, [running, step, last]);

    /** Stepping by hand takes over from Play. */
    const go = (to: number) => {
        setPlaying(false);
        setStep(Math.max(0, Math.min(last, to)));
    };
    const togglePlay = () => {
        if (running) {
            setPlaying(false);
            return;
        }
        if (step >= last) setStep(0); // played to the end: start over
        setPlaying(true);
    };
    const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.target !== e.currentTarget) return; // let buttons keep their own keys
        if (e.key === 'ArrowRight') go(step + 1);
        else if (e.key === 'ArrowLeft') go(step - 1);
        else if (e.key === 'Home') go(0);
        else if (e.key === 'End') go(last);
        else return;
        e.preventDefault();
    };

    return (
        <div
            role="group"
            aria-roledescription="carousel"
            aria-label={`Steps: ${example.title}`}
            tabIndex={0}
            onKeyDown={onKey}
            className={clsx('rounded-md border border-line bg-surface-muted', FOCUS_RING)}
        >
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <span role="status" className="text-label uppercase text-ink-muted">
                    {step < last ? `Step ${step + 1} of ${count}` : 'Result'}
                </span>
                <div className="ml-auto flex items-center gap-1">
                    <IconButton
                        size="sm"
                        tone={running ? 'default' : 'primary'}
                        icon={<Icon name={running ? 'pause' : 'play'} />}
                        aria-label={running ? 'Pause steps' : 'Play steps'}
                        title={running ? 'Pause' : 'Play the steps'}
                        onClick={togglePlay}
                    />
                    <IconButton
                        size="sm"
                        icon={<Icon name="chevron-left" />}
                        aria-label="Previous step"
                        aria-disabled={step === 0}
                        className={END_BUTTON}
                        onClick={() => step > 0 && go(step - 1)}
                    />
                    <IconButton
                        size="sm"
                        icon={<Icon name="chevron-right" />}
                        aria-label="Next step"
                        aria-disabled={step === last}
                        className={END_BUTTON}
                        onClick={() => step < last && go(step + 1)}
                    />
                </div>
            </div>

            <div className="px-3 pt-3">
                <ExampleScene example={example} step={step} />
            </div>

            <div className="overflow-hidden">
                <div
                    className="flex motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-out"
                    style={{ transform: `translateX(-${step * 100}%)` }}
                >
                    {example.steps.map((item, i) => (
                        <div
                            key={item.text}
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`Step ${i + 1} of ${count}`}
                            aria-hidden={i !== step}
                            inert={i !== step}
                            className="flex w-full shrink-0 items-center gap-3 px-4 py-3"
                        >
                            <span
                                aria-hidden
                                className="text-display font-bold tabular-nums leading-none text-primary-ink"
                            >
                                {pad(i + 1)}
                            </span>
                            <p className="min-w-0 text-sm text-ink">
                                <RichText text={item.text} />
                            </p>
                        </div>
                    ))}
                    <div
                        role="group"
                        aria-roledescription="slide"
                        aria-label="Result"
                        aria-hidden={step !== last}
                        inert={step !== last}
                        className="flex w-full shrink-0 flex-wrap items-center gap-3 px-4 py-3"
                    >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white">
                            <Icon name="check" />
                        </span>
                        <div className="min-w-0 flex-1 basis-48">
                            <p className="text-title text-ink">What you end up with</p>
                            <p className="mt-0.5 text-sm text-ink-muted">{example.result}</p>
                        </div>
                        {topic.open && (
                            <Link to={editorHref(topic.open)} className={HELP_PRIMARY_LINK}>
                                Try it: {topic.open.label}
                                <Icon name="chevron-right" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex gap-1 px-3 pb-3">
                {[...example.steps, null].map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        aria-label={i < last ? `Go to step ${i + 1}` : 'Go to the result'}
                        aria-current={i === step ? 'step' : undefined}
                        onClick={() => go(i)}
                        className={clsx(
                            'group relative h-4 flex-1 cursor-pointer rounded-full',
                            FOCUS_RING,
                        )}
                    >
                        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-surface-strong group-hover:bg-primary-200">
                            {i === step && running ? (
                                <span
                                    key={step}
                                    data-testid="step-progress"
                                    className="block h-full origin-left animate-help-progress bg-primary-600 motion-reduce:animate-none"
                                    style={{ animationDuration: `${STEP_MS}ms` }}
                                />
                            ) : (
                                i <= step && <span className="block h-full bg-primary-600" />
                            )}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
