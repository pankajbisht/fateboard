import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { COLOR_PROPS, NUM_PROPS, toHex, type PropValues } from '@/animation/engine';
import { useUnit } from '@hooks/useUnit';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import { NumberField } from '../../atoms/NumberField';
import { Field } from '../../molecules/Field';
import { PaintTargetSwatch } from '../../molecules/PaintTargetSwatch';
import { PanelSection } from '../../molecules/PanelSection';
import CurveEditor from './CurveEditor';
import { PROP_LABELS, propField } from './animation.labels';

/** Edits the selected keyframe(s): easing for all of them, time and values for a single one. */
export function KeyframeInspector() {
    const { selected, tracks, fps, canPaste } = useStore(
        useShallow((s) => ({
            selected: s.selectedKeyframes,
            tracks: s.tracks,
            fps: s.animFps,
            canPaste: s.keyframeClipboard.length > 0,
        })),
    );
    const a = useStore(
        useShallow((s) => ({
            updateKeyframe: s.updateKeyframe,
            updateSelectedCurve: s.updateSelectedCurve,
            deleteSelected: s.deleteSelected,
            copyKeyframes: s.copyKeyframes,
            pasteKeyframes: s.pasteKeyframes,
        })),
    );
    const unit = useUnit();

    const items = selected
        .map((ref) => {
            const tr = tracks[ref.objectId];
            const kf = tr?.keyframes.find((k) => k.id === ref.keyframeId);
            return tr && kf ? { tr, kf } : null;
        })
        .filter((x): x is NonNullable<typeof x> => !!x);
    if (!items.length) return null;

    const first = items[0];
    const single = items.length === 1;
    const mixed = items.some(
        (i) =>
            i.kf.easing !== first.kf.easing ||
            JSON.stringify(i.kf.bezier) !== JSON.stringify(first.kf.bezier),
    );
    const { tr, kf } = first;
    const set = (props: Record<string, number | string | undefined>) =>
        a.updateKeyframe(tr.objectId, kf.id, { props: props as PropValues });

    // "Text shown" (typewriter) only exists on text objects
    const numericProps = NUM_PROPS.filter((p) => p !== 'reveal' || tr.fullText !== undefined);

    return (
        <PanelSection
            title={single ? `Keyframe · ${tr.label}` : `${items.length} keyframes selected`}
            collapsible
        >
            <div>
                <span className="mb-1 block text-[11px] text-ink-muted">
                    Motion from this keyframe to the next
                </span>
                <CurveEditor
                    easing={first.kf.easing}
                    bezier={mixed ? undefined : first.kf.bezier}
                    mixed={mixed}
                    onChange={a.updateSelectedCurve}
                />
            </div>

            {single && (
                <>
                    <Field
                        wrap
                        label="Time"
                        trailing={`frame ${Math.round((kf.time / 1000) * fps)}`}
                    >
                        <NumberField
                            aria-label="Keyframe time"
                            unit="s"
                            step={1 / fps}
                            min={0}
                            precision={3}
                            value={+(kf.time / 1000).toFixed(3)}
                            onCommit={(v) =>
                                a.updateKeyframe(tr.objectId, kf.id, { time: v * 1000 })
                            }
                        />
                    </Field>

                    <div className="grid grid-cols-3 gap-2">
                        {numericProps.map((p) => {
                            const f = propField(p, unit);
                            const stored = kf.props[p];
                            return (
                                <Field key={p} wrap label={PROP_LABELS[p]}>
                                    <NumberField
                                        aria-label={PROP_LABELS[p]}
                                        stepper="stack"
                                        unit={f.unit}
                                        step={f.step}
                                        precision={f.precision}
                                        value={stored !== undefined ? f.show(stored) : undefined}
                                        onCommit={(v) => set({ [p]: f.store(v) })}
                                    />
                                </Field>
                            );
                        })}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {COLOR_PROPS.map((p) => {
                            const v = kf.props[p];
                            return (
                                <Field key={p} wrap label={PROP_LABELS[p]}>
                                    {v !== undefined ? (
                                        <div className="flex gap-1">
                                            <PaintTargetSwatch
                                                id={`keyframe-${p}`}
                                                label={`Keyframe ${p}`}
                                                value={toHex(v)}
                                                onChange={(hex) => set({ [p]: hex })}
                                                className="flex-1"
                                            />
                                            <IconButton
                                                icon={<Icon name="xmark" />}
                                                tone="danger"
                                                title="Stop animating this color"
                                                aria-label={`Stop animating ${p}`}
                                                onClick={() => set({ [p]: undefined })}
                                            />
                                        </div>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            block
                                            icon="plus"
                                            disabled={!tr.rest[p]}
                                            title={
                                                tr.rest[p]
                                                    ? undefined
                                                    : `This object has no plain ${p} color`
                                            }
                                            onClick={() => set({ [p]: tr.rest[p] })}
                                        >
                                            Animate {p}
                                        </Button>
                                    )}
                                </Field>
                            );
                        })}
                    </div>
                </>
            )}

            <div className="flex gap-1.5">
                <Button variant="secondary" size="sm" icon="copy" onClick={a.copyKeyframes}>
                    Copy
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    icon="paste"
                    disabled={!canPaste}
                    onClick={a.pasteKeyframes}
                >
                    Paste at playhead
                </Button>
                <Button
                    variant="danger-outline"
                    size="sm"
                    icon="trash-can"
                    className="ml-auto"
                    onClick={a.deleteSelected}
                >
                    Delete
                </Button>
            </div>
        </PanelSection>
    );
}

export default KeyframeInspector;
