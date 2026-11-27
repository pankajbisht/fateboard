import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@store';
import { BRUSH_ORDER, brushCategory, getPreset, type BrushId } from '@/store/brushConfig';
import { BRUSH_CATEGORIES, STAMP_BRUSH_IDS, type BrushCategory } from '@/store/brushLibrary';
import { resolveStamp } from '@/lib/brushes/stamp/stampParams';
import { Chip } from '../../atoms/Chip';
import { Icon } from '../../atoms/Icon';
import { Input } from '../../atoms/Input';
import { EmptyState } from '../../molecules/EmptyState';
import { PanelSection } from '../../molecules/PanelSection';
import { BrushPreview } from './BrushPreview';
import { StampPreview } from './StampPreview';
import { BrushSettingsSection } from './BrushSettingsSection';
import { ClassicBrushSettings } from './ClassicBrushSettings';
import { useBrushSizeKeys } from './useBrushSizeKeys';

const ALL_BRUSHES: BrushId[] = [...BRUSH_ORDER, ...STAMP_BRUSH_IDS];

/**
 * Left rail "Brush" (B): the brush library by category (sketching, inking, manga, painting, watercolour,
 * airbrush, texture, spray, fire, smoke, sparkle, nature, calligraphy) with a search. Each tile shows a sample
 * stroke drawn by the brush's own engine; a click picks the brush and starts painting (Draw tool). Below the
 * library: every setting of the picked brush (library brushes: BrushSettingsSection; classic brushes and the
 * eraser: ClassicBrushSettings, the former Draw panel). `[` / `]` change the size while it is open.
 */
export function BrushPickerPanel() {
    const brush = useStore((s) => s.brush);
    const activeTool = useStore((s) => s.activeTool);
    const setBrush = useStore((s) => s.setBrush);
    const setActiveTool = useStore((s) => s.setActiveTool);
    const canvas = useStore((s) => s.canvas);
    const initBrush = useStore((s) => s.initBrush);
    const [category, setCategory] = useState<BrushCategory | 'all'>(() => brushCategory(brush));
    const [query, setQuery] = useState('');

    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return ALL_BRUSHES.filter((b) =>
            q
                ? getPreset(b).label.toLowerCase().includes(q) || brushCategory(b).includes(q)
                : category === 'all' || brushCategory(b) === category,
        );
    }, [category, query]);

    // (re)apply the brush whenever the canvas instance changes
    useEffect(() => {
        initBrush();
    }, [canvas, initBrush]);
    useBrushSizeKeys();

    const pick = (b: BrushId) => {
        setBrush({ brush: b });
        if (activeTool !== 'draw') setActiveTool('draw');
    };

    return (
        <>
            <PanelSection
                title="Brushes"
                description={`${ALL_BRUSHES.length} brushes. Pick one and paint.`}
            >
                <Input
                    type="search"
                    aria-label="Search brushes"
                    placeholder="Search brushes"
                    leadingIcon="magnifying-glass"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <div className="flex flex-wrap gap-1" role="group" aria-label="Brush categories">
                    <Chip active={category === 'all' && !query} onClick={() => setCategory('all')}>
                        All
                    </Chip>
                    {BRUSH_CATEGORIES.map((c) => (
                        <Chip
                            key={c.id}
                            active={category === c.id && !query}
                            onClick={() => {
                                setCategory(c.id);
                                setQuery('');
                            }}
                        >
                            <Icon name={c.icon} />
                            {c.label}
                        </Chip>
                    ))}
                </div>
                {shown.length === 0 ? (
                    <EmptyState icon="paintbrush" title="No brush found" />
                ) : (
                    <div
                        className="grid grid-cols-2 gap-1.5"
                        role="radiogroup"
                        aria-label="Brushes"
                    >
                        {shown.map((b) => {
                            const preset = getPreset(b);
                            return (
                                <button
                                    key={b}
                                    type="button"
                                    role="radio"
                                    aria-checked={brush === b}
                                    onClick={() => pick(b)}
                                    className={clsx(
                                        'flex flex-col items-center gap-0.5 rounded-md border px-1.5 pt-1 pb-1.5 text-xs transition-colors',
                                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500',
                                        brush === b
                                            ? 'border-primary-500 bg-primary-50 font-medium text-primary-ink'
                                            : 'border-line-strong bg-surface text-ink hover:bg-surface-muted',
                                    )}
                                >
                                    {preset.engine === 'stamp' ? (
                                        <StampPreview
                                            params={resolveStamp(preset.stamp)}
                                            width={preset.width}
                                            category={preset.category}
                                        />
                                    ) : (
                                        <BrushPreview brush={b as never} />
                                    )}
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>
                )}
                {brush === 'nib' && (
                    <p className="text-caption text-ink-muted">
                        Calligraphy pen: width, thinning, angle, fixation and caps are in the top
                        bar.
                    </p>
                )}
            </PanelSection>
            <BrushSettingsSection />
            <ClassicBrushSettings />
        </>
    );
}

export default BrushPickerPanel;
