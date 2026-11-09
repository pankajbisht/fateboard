import { useState } from 'react';

import Chip from '@/components/atoms/Chip';
import { Icon } from '@/components/atoms/Icon';

import { DemoCard, RichText } from '../helpParts';

const NEEDS = [
    {
        need: 'Post it online',
        answer: 'PNG',
        how: 'Pick a size preset such as Instagram Post, with High Quality · 2×.',
    },
    {
        need: 'No background',
        answer: 'PNG',
        how: 'Set Background to Transparent. JPEG cannot be transparent.',
    },
    {
        need: 'A small file',
        answer: 'JPEG',
        how: 'Lower JPEG compression until the file is small enough.',
    },
    {
        need: 'Sharp at any size',
        answer: 'SVG',
        how: 'Best for logos and diagrams, and it opens in other design tools.',
    },
    {
        need: 'A video',
        answer: 'MP4',
        how: 'Animate it first, then export from the Animate tab.',
    },
    {
        need: 'Keep editing later',
        answer: '.fateboard',
        how: 'Press `mod+S` to download every page as a file you can open again.',
    },
];

export function ExportDemo() {
    const [picked, setPicked] = useState(NEEDS[0]!);

    return (
        <DemoCard
            title="Which format do I need?"
            picture={
                <div className="p-6 text-center">
                    <Icon name="file-export" className="text-2xl text-primary-ink" />
                    <p className="mt-2 text-3xl font-bold tracking-tight text-ink">
                        {picked.answer}
                    </p>
                    <p className="mt-2 max-w-sm text-sm text-ink-muted">
                        <RichText text={picked.how} />
                    </p>
                </div>
            }
        >
            <p className="text-sm text-ink-muted">I want…</p>
            <div className="flex flex-wrap gap-1">
                {NEEDS.map((n) => (
                    <Chip key={n.need} active={picked === n} onClick={() => setPicked(n)}>
                        {n.need}
                    </Chip>
                ))}
            </div>
        </DemoCard>
    );
}
