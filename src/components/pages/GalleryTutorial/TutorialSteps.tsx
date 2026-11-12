/** The written walkthrough: one card per build step; the current one is highlighted, any card jumps the stage. */
import clsx from 'clsx';

import { Icon } from '@/components/atoms/Icon';
import { FOCUS_RING } from '@/components/atoms/control.styles';
import { RichText } from '@/components/organisms/helpsection/ui/RichText';

import type { TutorialStep } from '../web/gallery/galleryTutorials';

interface TutorialStepsProps {
    steps: TutorialStep[];
    step: number;
    onStep: (step: number) => void;
}

export function TutorialSteps({ steps, step, onStep }: TutorialStepsProps) {
    return (
        <ol className="space-y-4">
            {steps.map((s, i) => {
                const current = i === step;
                return (
                    <li
                        key={s.title}
                        aria-current={current ? 'step' : undefined}
                        className={clsx(
                            'rounded-2xl border p-5 transition-colors',
                            current
                                ? 'border-primary-600 bg-surface shadow-md'
                                : 'border-line bg-surface',
                        )}
                    >
                        <div className="flex items-start gap-3">
                            <span
                                className={clsx(
                                    'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums',
                                    i <= step
                                        ? 'bg-primary-600 text-white'
                                        : 'bg-surface-strong text-ink-muted',
                                )}
                            >
                                {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-bold text-ink">{s.title}</h3>
                                <p className="mt-2 leading-7 text-ink-muted">
                                    <RichText text={s.text} />
                                </p>
                                {s.trick && (
                                    <p className="mt-3 flex gap-2 rounded-xl bg-surface-muted p-3 text-sm leading-6 text-ink">
                                        <Icon
                                            name="wand-magic-sparkles"
                                            className="mt-1 shrink-0 text-primary-ink"
                                        />
                                        <span>
                                            <span className="font-bold">Trick: </span>
                                            <RichText text={s.trick} />
                                        </span>
                                    </p>
                                )}
                                {!current && (
                                    <button
                                        type="button"
                                        onClick={() => onStep(i)}
                                        className={clsx(
                                            'mt-3 text-sm font-semibold text-primary-ink hover:underline',
                                            FOCUS_RING,
                                        )}
                                    >
                                        Show step {i + 1} on the board
                                    </button>
                                )}
                            </div>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}
