import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useStore } from '@store';
import { SegmentedControl, type SegmentOption } from '../../molecules/SegmentedControl';
import { ClearAllAnimations } from './ClearAllAnimations';
import { ExportSection } from './ExportSection';
import { KeyframeInspector } from './KeyframeInspector';
import { PresetPicker } from './PresetPicker';
import { SelectionSummary } from './SelectionSummary';
import { Timeline } from './Timeline';
import type { AnimSelection } from './useAnimationCanvas';
import { ViewSettings } from './ViewSettings';

export type DockPane = 'timeline' | 'animate' | 'keyframe' | 'view' | 'export';

const SIDE_PANES: SegmentOption<DockPane>[] = [
    { value: 'animate', label: 'Animate' },
    { value: 'keyframe', label: 'Keyframe' },
    { value: 'view', label: 'View' },
    { value: 'export', label: 'Export' },
];
const NARROW_PANES: SegmentOption<DockPane>[] = [
    { value: 'timeline', label: 'Timeline' },
    ...SIDE_PANES,
];
/** Below this dock width the timeline and the side panes take turns (phones, narrow windows). */
export const WIDE_DOCK_MIN = 720;

/** True when the element is at least `min` px wide (unknown width, e.g. no layout: wide). */
function useWide(ref: RefObject<HTMLElement | null>, min: number) {
    const [wide, setWide] = useState(true);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const check = () => {
            const w = el.getBoundingClientRect().width;
            setWide(w === 0 || w >= min);
        };
        check();
        const ro = new ResizeObserver(check);
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref, min]);
    return wide;
}

function NoKeyframe() {
    return (
        <p className="py-6 text-center text-[11px] text-ink-muted">
            Click a keyframe on the timeline to change its easing, time and values.
        </p>
    );
}

/**
 * The dock body: the timeline, and beside it (or, when narrow, in turn with it) the panes Animate (presets),
 * Keyframe, View (onion skin, motion path) and Export. Panes stay mounted while hidden, so their settings
 * survive switching (BUG-185).
 */
export function DockPanes({ selection }: { selection: AnimSelection }) {
    const ref = useRef<HTMLDivElement>(null);
    const wide = useWide(ref, WIDE_DOCK_MIN);
    const [pane, setPane] = useState<DockPane>('animate');
    const hasKeyframe = useStore((s) => s.selectedKeyframes.length > 0);

    // picking a keyframe opens its settings (only beside the timeline: never hide the timeline you click on)
    const had = useRef(hasKeyframe);
    useEffect(() => {
        if (hasKeyframe && !had.current && wide) setPane('keyframe');
        had.current = hasKeyframe;
    }, [hasKeyframe, wide]);

    const side: DockPane = wide && pane === 'timeline' ? 'animate' : pane;
    const showTimeline = wide || pane === 'timeline';
    const switcher = (
        <SegmentedControl<DockPane>
            aria-label="Timeline panes"
            size="sm"
            value={wide ? side : pane}
            onChange={setPane}
            options={wide ? SIDE_PANES : NARROW_PANES}
        />
    );

    return (
        <div ref={ref} className="flex min-h-0 flex-1 flex-col">
            {!wide && <div className="shrink-0 border-b border-line p-1.5">{switcher}</div>}
            <div className="flex min-h-0 flex-1">
                <div hidden={!showTimeline} className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <Timeline selectedIds={selection.ids} />
                </div>
                <div
                    hidden={!wide && pane === 'timeline'}
                    className={clsx(
                        'flex min-h-0 min-w-0 flex-col',
                        wide ? 'w-80 shrink-0 border-l border-line' : 'flex-1',
                    )}
                >
                    {wide && <div className="shrink-0 p-1.5">{switcher}</div>}
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1.5">
                        <div hidden={side !== 'animate'} className="flex flex-col gap-4">
                            <SelectionSummary selection={selection} />
                            <PresetPicker selection={selection} />
                            <ClearAllAnimations />
                        </div>
                        <div hidden={side !== 'keyframe'}>
                            {hasKeyframe ? <KeyframeInspector /> : <NoKeyframe />}
                        </div>
                        <div hidden={side !== 'view'} className="flex flex-col gap-4">
                            <ViewSettings />
                        </div>
                        <div hidden={side !== 'export'}>
                            <ExportSection />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DockPanes;
