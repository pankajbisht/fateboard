import { useState } from 'react';
import { useStore } from '@store';
import { PRESETS, type PresetGroup, type PresetMeta } from '@/animation/engine';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import { NumberField } from '../../atoms/NumberField';
import { Field } from '../../molecules/Field';
import { PanelSection } from '../../molecules/PanelSection';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { presetEnd, presetStart, seconds, type StartMode } from './animation.logic';
import { PresetTile } from './PresetTile';
import { describeSelection, type AnimSelection } from './useAnimationCanvas';

interface Timing {
    mode: StartMode;
    /** seconds; '' = the preset's own length */
    length: number | '';
    /** ms between objects */
    stagger: number;
    repeat: number;
}

/**
 * The preset that was just added. The next pick of the same kind replaces it (trying presets one
 * after another must not stack them), until something else happens: another edit (a new undo
 * step), another selection, or the playhead leaving the preset.
 */
interface Applied {
    preset: PresetMeta;
    start: number;
    end: number;
    mode: StartMode;
    /** the keyframe history right after adding; any later edit replaces this array */
    past: unknown[];
    selectionKey: string;
}

const GROUPS: { value: PresetGroup; label: string }[] = [
    { value: 'entrance', label: 'Entrance' },
    { value: 'emphasis', label: 'Emphasis' },
    { value: 'exit', label: 'Exit' },
];
const START_MODES: { value: StartMode; label: string; title: string }[] = [
    { value: 'playhead', label: 'Playhead', title: 'Start where the playhead is' },
    { value: 'start', label: 'Start', title: 'Start at 0 s' },
    { value: 'after', label: 'After last', title: "Start after the object's last keyframe" },
];

/** Shows where the next preset will start. Follows the playhead, so it renders on its own. */
function StartsAt({ mode, objectIds }: { mode: StartMode; objectIds: string[] }) {
    const currentTime = useStore((s) => s.currentTime);
    const tracks = useStore((s) => s.tracks);
    return <>at {seconds(presetStart(mode, { currentTime, tracks, objectIds }))}</>;
}

/** Ready-made animations: pick one for the selected objects, then adjust its timing. */
export function PresetPicker({ selection }: { selection: AnimSelection }) {
    const past = useStore((s) => s.past);
    const [group, setGroup] = useState<PresetGroup>('entrance');
    const [timing, setTiming] = useState<Timing>({
        mode: 'playhead',
        length: '',
        stagger: 0,
        repeat: 1,
    });
    const [applied, setApplied] = useState<Applied | null>(null);

    const playheadOnIt = useStore(
        (s) => !!applied && s.currentTime >= applied.start - 1 && s.currentTime <= applied.end + 1,
    );
    const live =
        applied && playheadOnIt && applied.past === past && applied.selectionKey === selection.key
            ? applied
            : null;

    const apply = (preset: PresetMeta, t: Timing) => {
        const swap = live && live.preset.group === preset.group ? live : null;
        if (swap) useStore.getState().animUndo();
        const st = useStore.getState();
        const start =
            swap && swap.mode === t.mode
                ? swap.start // the preview moved the playhead: keep the place of the one swapped
                : presetStart(t.mode, { ...st, objectIds: selection.ids });
        const duration = t.length === '' ? preset.defaultDuration : Math.round(t.length * 1000);
        const repeat = preset.repeatable ? t.repeat : 1;
        const stagger = selection.count > 1 ? t.stagger : 0;
        if (!st.applyPreset(preset.id, { start, duration, stagger, repeat })) {
            setApplied(null);
            return;
        }
        const end = presetEnd(preset.id, start, duration, {
            repeat,
            stagger,
            count: selection.count,
        });
        const after = useStore.getState();
        setApplied({
            preset,
            start,
            end,
            mode: t.mode,
            past: after.past,
            selectionKey: describeSelection(after.canvas?.getActiveObjects() ?? []).key,
        });
        st.previewRange(start, end);
    };

    /** A timing change also re-times the preset that was just added. */
    const retime = (patch: Partial<Timing>) => {
        const next = { ...timing, ...patch };
        setTiming(next);
        if (live) apply(live.preset, next);
    };

    const undo = () => {
        useStore.getState().animUndo();
        setApplied(null);
    };

    return (
        <PanelSection
            title="Add animation"
            description={
                selection.count
                    ? 'Hover to preview, click to add.'
                    : 'Select one or more objects on the canvas first.'
            }
        >
            <SegmentedControl<PresetGroup>
                aria-label="Animation type"
                value={group}
                onChange={setGroup}
                options={GROUPS}
            />

            <div className="grid grid-cols-3 gap-1.5">
                {PRESETS.filter((p) => p.group === group).map((p) => {
                    const needsText = !!p.textOnly && !selection.hasText;
                    return (
                        <PresetTile
                            key={p.id}
                            preset={p}
                            disabled={!selection.count || needsText}
                            applied={live?.preset.id === p.id}
                            hint={
                                !selection.count
                                    ? 'Select an object first'
                                    : needsText
                                      ? 'Select a text object'
                                      : undefined
                            }
                            onApply={() => apply(p, timing)}
                        />
                    );
                })}
            </div>

            {live && (
                <div
                    role="status"
                    className="flex items-start gap-2 rounded-md bg-primary-100 px-2 py-1.5 text-caption text-primary-ink"
                >
                    <Icon name="check" className="mt-0.5 shrink-0" />
                    <p className="min-w-0 flex-1">
                        <span className="font-semibold">{live.preset.label}</span> added at{' '}
                        {seconds(live.start)}. Pick another {live.preset.group} to swap it, or
                        change the timing.
                    </p>
                    <Button variant="ghost" size="sm" icon="undo" onClick={undo}>
                        Undo
                    </Button>
                </div>
            )}

            <Field
                label="Starts"
                trailing={<StartsAt mode={timing.mode} objectIds={selection.ids} />}
            >
                <SegmentedControl<StartMode>
                    aria-label="Starts"
                    value={timing.mode}
                    onChange={(mode) => retime({ mode })}
                    options={START_MODES}
                />
            </Field>

            <div className="grid grid-cols-2 gap-2">
                <Field wrap label="Duration" trailing={timing.length === '' ? 'Auto' : undefined}>
                    <div className="flex gap-1">
                        <NumberField
                            aria-label="Duration"
                            unit="s"
                            min={0.1}
                            step={0.1}
                            precision={2}
                            // Auto: empty, or the length of the preset that was just added
                            value={
                                timing.length !== ''
                                    ? timing.length
                                    : live
                                      ? live.preset.defaultDuration / 1000
                                      : undefined
                            }
                            onCommit={(v) => retime({ length: Math.max(0.1, v) })}
                        />
                        {timing.length !== '' && (
                            <IconButton
                                icon={<Icon name="rotate-left" />}
                                className="border border-line-strong"
                                title="Use the preset's own duration"
                                aria-label="Use the preset's own duration"
                                onClick={() => retime({ length: '' })}
                            />
                        )}
                    </div>
                </Field>
                {group === 'emphasis' && (
                    <Field wrap label="Repeat">
                        <NumberField
                            aria-label="Repeat"
                            unit="×"
                            min={1}
                            max={20}
                            step={1}
                            precision={0}
                            value={timing.repeat}
                            onCommit={(v) =>
                                retime({ repeat: Math.max(1, Math.min(20, Math.round(v))) })
                            }
                        />
                    </Field>
                )}
                {selection.count > 1 && (
                    <Field wrap label="Delay between objects">
                        <NumberField
                            aria-label="Delay between objects"
                            unit="ms"
                            min={0}
                            step={50}
                            precision={0}
                            value={timing.stagger}
                            onCommit={(v) => retime({ stagger: Math.max(0, v) })}
                        />
                    </Field>
                )}
            </div>
        </PanelSection>
    );
}

export default PresetPicker;
