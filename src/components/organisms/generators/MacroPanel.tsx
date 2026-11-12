import { useMemo, useState } from 'react';
import { useStore } from '@store';
import { MACRO_MAX_TIMES } from '@/store/slices/createMacroSlice';
import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import { Button } from '../../atoms/Button';
import { PanelSection } from '../../molecules/PanelSection';
import { SliderField } from '../../molecules/LabeledSlider';
import { SelectField } from '../../molecules/SelectField';
import { PanelAction } from '../../molecules/PanelAction';
import { EmptyState } from '../../molecules/EmptyState';

const nameOf = (c: { id: string; label?: string; title?: string }) => c.label || c.title || c.id;

/**
 * Right dock "Macro": record keyboard shortcuts (or pick commands from the list), then replay them on the
 * current selection, N times. Steps are the shortcut commands, so anything with a shortcut can be recorded.
 */
export function MacroPanel() {
    const commands = useStore((s) => s.commands);
    const steps = useStore((s) => s.macroSteps);
    const recording = useStore((s) => s.macroRecording);
    const playing = useStore((s) => s.macroPlaying);
    const startMacroRecording = useStore((s) => s.startMacroRecording);
    const stopMacroRecording = useStore((s) => s.stopMacroRecording);
    const addMacroStep = useStore((s) => s.addMacroStep);
    const removeMacroStep = useStore((s) => s.removeMacroStep);
    const clearMacro = useStore((s) => s.clearMacro);
    const playMacro = useStore((s) => s.playMacro);
    const [times, setTimes] = useState(1);

    const options = useMemo(
        () =>
            commands
                .filter((c) => c.macro !== false)
                .map((c) => ({ value: c.id, label: nameOf(c) }))
                .sort((a, b) => a.label.localeCompare(b.label)),
        [commands],
    );
    const labels = useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);

    return (
        <>
            <PanelSection
                title="Record"
                description="Press Record, use keyboard shortcuts on the canvas (duplicate, flip, align…), then Stop."
            >
                {recording ? (
                    <Button
                        size="sm"
                        variant="danger-outline"
                        icon="stop"
                        onClick={stopMacroRecording}
                    >
                        Stop recording
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        icon="circle"
                        disabled={playing}
                        onClick={startMacroRecording}
                    >
                        Record
                    </Button>
                )}
                <SelectField<string>
                    label="Add step"
                    placeholder="Pick a command…"
                    options={options}
                    value={null}
                    onChange={addMacroStep}
                    disabled={playing}
                />
            </PanelSection>

            <PanelSection
                title={`Steps (${steps.length})`}
                actions={
                    steps.length > 0 && (
                        <Button size="sm" variant="ghost" onClick={clearMacro} disabled={playing}>
                            Clear
                        </Button>
                    )
                }
            >
                {steps.length === 0 ? (
                    <EmptyState
                        icon="macro"
                        title="No steps yet"
                        description="Record shortcuts or add commands from the list."
                    />
                ) : (
                    <ol className="flex flex-col gap-1" aria-label="Macro steps">
                        {steps.map((id, i) => (
                            <li
                                key={`${id}-${i}`}
                                className="flex items-center gap-2 rounded-md bg-surface-muted px-2 py-1 text-sm text-ink"
                            >
                                <span className="w-5 text-xs text-ink-muted">{i + 1}</span>
                                <span className="flex-1 truncate">{labels.get(id) ?? id}</span>
                                <IconButton
                                    size="sm"
                                    tone="danger"
                                    aria-label={`Remove step ${i + 1}`}
                                    icon={<Icon name="xmark" />}
                                    disabled={playing}
                                    onClick={() => removeMacroStep(i)}
                                />
                            </li>
                        ))}
                    </ol>
                )}
            </PanelSection>

            <PanelSection title="Play">
                <SliderField
                    label="Repeat"
                    min={1}
                    max={MACRO_MAX_TIMES}
                    unit="×"
                    value={times}
                    onChange={setTimes}
                />
                <PanelAction
                    icon="play"
                    loading={playing}
                    disabled={!steps.length || recording}
                    onClick={() => void playMacro(times)}
                >
                    Play macro
                </PanelAction>
            </PanelSection>
        </>
    );
}

export default MacroPanel;
