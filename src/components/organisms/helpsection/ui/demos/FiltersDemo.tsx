import { useState } from 'react';

import { Button } from '@/components/atoms/Button';
import Chip from '@/components/atoms/Chip';

import { DemoCard, DemoSlider } from '../helpParts';

type Look = { brightness: number; contrast: number; saturation: number; hue: number };

const ORIGINAL: Look = { brightness: 100, contrast: 100, saturation: 100, hue: 0 };

const PRESETS: { label: string; look: Look }[] = [
    { label: 'Original', look: ORIGINAL },
    { label: 'Vivid', look: { brightness: 105, contrast: 120, saturation: 170, hue: 0 } },
    { label: 'Noir', look: { brightness: 100, contrast: 145, saturation: 0, hue: 0 } },
    { label: 'Faded', look: { brightness: 110, contrast: 75, saturation: 70, hue: 0 } },
    { label: 'Shifted', look: { brightness: 100, contrast: 105, saturation: 120, hue: 140 } },
];

const cssFilter = ({ brightness, contrast, saturation, hue }: Look) =>
    `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`;

export function FiltersDemo() {
    const [look, setLook] = useState(ORIGINAL);
    const [comparing, setComparing] = useState(false);
    const set = (key: keyof Look) => (value: number) => setLook((l) => ({ ...l, [key]: value }));

    return (
        <DemoCard
            title="Try it: adjust a picture"
            hint="A preview; the Filter Tools panel has many more controls"
            picture={
                <svg
                    viewBox="0 0 320 180"
                    role="img"
                    aria-label="Picture with the filters applied"
                    className="w-full max-w-md rounded-md"
                    style={{ filter: cssFilter(comparing ? ORIGINAL : look) }}
                >
                    <rect width="320" height="180" className="fill-primary-200" />
                    <circle cx="240" cy="60" r="30" className="fill-accent-500" />
                    <path
                        d="M0 130 L80 70 L150 125 L220 85 L320 140 V180 H0 Z"
                        className="fill-primary-600"
                    />
                    <path
                        d="M0 155 L110 115 L210 150 L320 125 V180 H0 Z"
                        className="fill-primary-800"
                    />
                </svg>
            }
        >
            <div className="flex flex-wrap gap-1">
                {PRESETS.map((p) => (
                    <Chip key={p.label} active={look === p.look} onClick={() => setLook(p.look)}>
                        {p.label}
                    </Chip>
                ))}
            </div>
            <DemoSlider
                label="Brightness"
                min={40}
                max={160}
                unit="%"
                value={look.brightness}
                onChange={set('brightness')}
            />
            <DemoSlider
                label="Contrast"
                min={40}
                max={180}
                unit="%"
                value={look.contrast}
                onChange={set('contrast')}
            />
            <DemoSlider
                label="Saturation"
                min={0}
                max={200}
                unit="%"
                value={look.saturation}
                onChange={set('saturation')}
            />
            <DemoSlider
                label="Hue"
                min={0}
                max={360}
                unit="°"
                value={look.hue}
                onChange={set('hue')}
            />
            <Button
                size="sm"
                variant="secondary"
                onPointerDown={() => setComparing(true)}
                onPointerUp={() => setComparing(false)}
                onPointerLeave={() => setComparing(false)}
            >
                Hold to compare
            </Button>
        </DemoCard>
    );
}
