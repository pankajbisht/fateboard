import { useRef, useState } from 'react';

import Chip from '@/components/atoms/Chip';

import { DemoCard } from '../helpParts';

type Preset = { label: string; group: string; frames: Keyframe[]; duration: number };

const PRESETS: Preset[] = [
    {
        label: 'Fade in',
        group: 'Entrance',
        duration: 700,
        frames: [{ opacity: 0 }, { opacity: 1 }],
    },
    {
        label: 'Slide from left',
        group: 'Entrance',
        duration: 700,
        frames: [
            { transform: 'translateX(-120px)', opacity: 0 },
            { transform: 'translateX(0)', opacity: 1 },
        ],
    },
    {
        label: 'Zoom in',
        group: 'Entrance',
        duration: 600,
        frames: [
            { transform: 'scale(0)', opacity: 0 },
            { transform: 'scale(1)', opacity: 1 },
        ],
    },
    {
        label: 'Pulse',
        group: 'Emphasis',
        duration: 700,
        frames: [
            { transform: 'scale(1)' },
            { transform: 'scale(1.25)' },
            { transform: 'scale(1)' },
        ],
    },
    {
        label: 'Shake',
        group: 'Emphasis',
        duration: 600,
        frames: [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-14px)' },
            { transform: 'translateX(14px)' },
            { transform: 'translateX(-14px)' },
            { transform: 'translateX(14px)' },
            { transform: 'translateX(0)' },
        ],
    },
    {
        label: 'Spin 360°',
        group: 'Emphasis',
        duration: 800,
        frames: [{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }],
    },
    { label: 'Fade out', group: 'Exit', duration: 700, frames: [{ opacity: 1 }, { opacity: 0 }] },
    {
        label: 'Slide to right',
        group: 'Exit',
        duration: 700,
        frames: [
            { transform: 'translateX(0)', opacity: 1 },
            { transform: 'translateX(120px)', opacity: 0 },
        ],
    },
];

const GROUPS = ['Entrance', 'Emphasis', 'Exit'];

export function AnimateDemo() {
    const [current, setCurrent] = useState<string | null>(null);
    const tile = useRef<HTMLDivElement>(null);
    const playhead = useRef<HTMLDivElement>(null);

    const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const play = (preset: Preset) => {
        setCurrent(preset.label);
        if (reduced) return;
        tile.current?.getAnimations?.().forEach((a) => a.cancel());
        tile.current?.animate?.(preset.frames, { duration: preset.duration, easing: 'ease-out' });
        playhead.current?.animate?.([{ left: '0%' }, { left: '100%' }], {
            duration: preset.duration,
        });
    };

    return (
        <DemoCard
            title="Try it: motion presets"
            hint="Click a preset to play it"
            picture={
                <div className="flex w-full flex-col items-center gap-4 overflow-hidden p-4">
                    <div className="flex h-24 items-center justify-center">
                        <div
                            ref={tile}
                            className="size-16 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 shadow-sm"
                        />
                    </div>
                    <div
                        aria-hidden
                        className="relative h-1.5 w-full max-w-xs rounded-full bg-surface-strong"
                    >
                        <div
                            ref={playhead}
                            className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-accent-500"
                        />
                    </div>
                </div>
            }
        >
            {GROUPS.map((group) => (
                <div key={group}>
                    <p className="mb-1 text-label uppercase text-ink-muted">{group}</p>
                    <div className="flex flex-wrap gap-1">
                        {PRESETS.filter((p) => p.group === group).map((p) => (
                            <Chip
                                key={p.label}
                                active={current === p.label}
                                onClick={() => play(p)}
                            >
                                {p.label}
                            </Chip>
                        ))}
                    </div>
                </div>
            ))}
            {reduced && (
                <p className="text-caption text-ink-muted">
                    Motion is off because your device asks for reduced motion.
                </p>
            )}
        </DemoCard>
    );
}
