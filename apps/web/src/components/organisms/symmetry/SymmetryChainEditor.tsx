import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import type { ChainStep, ChainStepKind } from '@/lib/canvas/symmetryGroups';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { SelectField } from '../../molecules/SelectField';
import { SliderField } from '../../molecules/LabeledSlider';
import { SwitchField } from '../../molecules/LabeledToggle';

export const STEP_CHOICES: { value: ChainStepKind; label: string }[] = [
    { value: 'mirror', label: 'Mirror' },
    { value: 'rotate', label: 'Turn' },
    { value: 'kaleido', label: 'Kaleidoscope' },
    { value: 'spiral', label: 'Spiral' },
    { value: 'glide', label: 'Glide' },
    { value: 'translate', label: 'Repeat (hall of mirrors)' },
];

const label = (kind: ChainStepKind) => STEP_CHOICES.find((c) => c.value === kind)?.label ?? kind;

function StepCard({ step, index, last }: { step: ChainStep; index: number; last: boolean }) {
    const { update, move, remove, pins } = useStore(
        useShallow((s) => ({
            update: s.updateSymmetryStep,
            move: s.moveSymmetryStep,
            remove: s.removeSymmetryStep,
            pins: s.symmetryPins,
        })),
    );
    const set = (patch: Partial<ChainStep>) => update(step.id, patch);
    const name = `Step ${index + 1}: ${label(step.kind)}`;
    const usesCount = step.kind !== 'mirror';
    const usesScale = step.kind === 'spiral' || step.kind === 'translate';
    const usesShift = step.kind === 'glide' || step.kind === 'translate';
    return (
        <li
            className="flex flex-col gap-2 rounded-md border border-line bg-surface p-2"
            aria-label={name}
        >
            <div className="flex items-center gap-1">
                <span className="flex-1 truncate text-sm font-medium text-ink">{name}</span>
                <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Move ${name} up`}
                    disabled={index === 0}
                    onClick={() => move(step.id, -1)}
                >
                    <Icon name="chevron-up" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Move ${name} down`}
                    disabled={last}
                    onClick={() => move(step.id, 1)}
                >
                    <Icon name="chevron-down" />
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${name}`}
                    onClick={() => remove(step.id)}
                >
                    <Icon name="trash-can" />
                </Button>
            </div>
            <SwitchField
                label="Use this step"
                checked={step.enabled}
                onChange={(v) => set({ enabled: v })}
            />
            <SelectField<ChainStepKind>
                label="Kind"
                options={STEP_CHOICES}
                value={step.kind}
                onChange={(v) => set({ kind: v })}
            />
            <SliderField
                label={
                    step.kind === 'spiral'
                        ? 'Turn per copy'
                        : step.kind === 'translate'
                          ? 'Direction'
                          : 'Axis angle'
                }
                min={-180}
                max={180}
                unit="°"
                value={step.angle}
                onChange={(v) => set({ angle: v })}
            />
            {usesCount && (
                <SliderField
                    label="Copies"
                    min={2}
                    max={64}
                    value={step.count}
                    onChange={(v) => set({ count: v })}
                />
            )}
            {usesScale && (
                <SliderField
                    label="Size per copy"
                    min={5}
                    max={200}
                    unit="%"
                    value={Math.round(step.scale * 100)}
                    onChange={(v) => set({ scale: v / 100 })}
                />
            )}
            {usesShift && (
                <SliderField
                    label="Step length"
                    min={-800}
                    max={800}
                    unit="px"
                    value={step.shift}
                    onChange={(v) => set({ shift: v })}
                />
            )}
            {pins.length > 0 && (
                <SelectField<string>
                    label="Centre"
                    options={[
                        { value: '', label: 'Main centre' },
                        ...pins.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                    value={step.pinId ?? ''}
                    onChange={(v) => set({ pinId: v || null })}
                />
            )}
        </li>
    );
}

/**
 * Mirror Chain: steps applied in order (each copies everything before it), reordered like layers. Repeat
 * depth runs the whole chain again (a mirror of a mirror: infinite mirror).
 */
export function SymmetryChainEditor() {
    const { chain, add, depth, setOptions } = useStore(
        useShallow((s) => ({
            chain: s.symmetryChain,
            add: s.addSymmetryStep,
            depth: s.symmetryOptions.chainDepth,
            setOptions: s.setSymmetryOptions,
        })),
    );
    return (
        <div className="flex flex-col gap-2">
            {chain.length === 0 && (
                <p className="text-xs text-ink-muted">
                    Add steps: for example a Mirror, then a Kaleidoscope. Each step copies
                    everything above it.
                </p>
            )}
            <ol className="flex flex-col gap-2" aria-label="Mirror chain steps">
                {chain.map((step, i) => (
                    <StepCard key={step.id} step={step} index={i} last={i === chain.length - 1} />
                ))}
            </ol>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Add a chain step">
                {STEP_CHOICES.map((c) => (
                    <Button
                        key={c.value}
                        size="sm"
                        variant="secondary"
                        onClick={() => add(c.value)}
                    >
                        <Icon name="plus" />
                        {c.label}
                    </Button>
                ))}
            </div>
            <SliderField
                label="Repeat the chain"
                hint="2 or more: a mirror of a mirror (hall of mirrors)"
                min={1}
                max={6}
                value={depth}
                defaultValue={1}
                onChange={(v) => setOptions({ chainDepth: v })}
            />
        </div>
    );
}
