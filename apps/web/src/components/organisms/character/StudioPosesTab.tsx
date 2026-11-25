import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { useStore } from '@store';
import { POSES, POSE_CATEGORIES } from '@/character/data/poses';
import { parseCharacter } from '@/character/schema/parse';
import { Button } from '../../atoms/Button';
import { Chip } from '../../atoms/Chip';
import { Input } from '../../atoms/Input';
import { FOCUS_RING } from '../../atoms/control.styles';
import { PanelSection } from '../../molecules/PanelSection';
import { PoseThumb } from './CharacterView';
import { CATEGORY_LABELS } from './studioLabels';

/** Neutral grey figure for pose thumbnails: cheap, and the same for every character. */
const MANNEQUIN = parseCharacter({
    id: 'mannequin',
    name: 'Mannequin',
    body: { skinTone: '#c9ccd3', age: 25 },
    hair: { style: 'bald', color: '#c9ccd3' },
    face: { eyeColor: '#9ca3af' },
    dress: {
        top: { color: '#aeb3bd' },
        bottom: { kind: 'pants', color: '#8f95a1' },
        shoes: { color: '#6b7280' },
    },
})!;

/** The pose library: search by name or tag, filter by category, mirror, back to standing. */
export function StudioPosesTab() {
    const current = useStore((s) => s.studioCharacter?.rig.pose.id);
    const edit = useStore((s) => s.editStudioCharacter);
    const mirror = useStore((s) => s.mirrorStudioPose);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<string | null>(null);

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return POSES.filter(
            (p) =>
                (!category || p.category === category) &&
                (!q || p.name.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q))),
        );
    }, [query, category]);

    return (
        <PanelSection
            title={`Poses (${POSES.length})`}
            description="Every pose fits every body; feet stay on the floor."
        >
            <Input
                size="sm"
                aria-label="Search poses"
                placeholder="Search poses (wave, sit, kick…)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex flex-wrap gap-1" role="group" aria-label="Pose categories">
                <Chip active={!category} onClick={() => setCategory(null)}>
                    All
                </Chip>
                {POSE_CATEGORIES.map((c) => (
                    <Chip
                        key={c}
                        active={category === c}
                        onClick={() => setCategory(category === c ? null : c)}
                    >
                        {CATEGORY_LABELS[c]}
                    </Chip>
                ))}
            </div>
            <div className="flex gap-2">
                <Button variant="secondary" size="sm" icon="flip-horizontal" onClick={mirror}>
                    Mirror
                </Button>
                <Button variant="secondary" size="sm" onClick={() => edit({ pose: POSES[0] })}>
                    Stand
                </Button>
            </div>
            {shown.length === 0 ? (
                <p className="py-4 text-center text-caption text-ink-muted">
                    No pose matches “{query}”.
                </p>
            ) : (
                <div className="grid grid-cols-3 gap-1.5">
                    {shown.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            aria-pressed={current === p.id}
                            onClick={() => edit({ pose: p })}
                            className={clsx(
                                'flex flex-col items-center rounded-md border p-1 text-[11px] text-ink transition-colors hover:bg-surface-strong',
                                FOCUS_RING,
                                current === p.id
                                    ? 'border-primary-500 bg-surface-strong'
                                    : 'border-line',
                            )}
                        >
                            <span className="h-16 w-full">
                                <PoseThumb mannequin={MANNEQUIN} pose={p} />
                            </span>
                            <span className="w-full truncate">{p.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </PanelSection>
    );
}

export default StudioPosesTab;
