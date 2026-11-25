import { useState } from 'react';
import { useStore } from '@store';
import { AUTOMATA_LIMITS, type LifePreset } from '@/lib/generators/automata';
import { PanelSection } from '../../molecules/PanelSection';
import { SliderField } from '../../molecules/LabeledSlider';
import { SelectField } from '../../molecules/SelectField';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { Field } from '../../molecules/Field';
import LabeledToggle from '../../molecules/LabeledToggle';
import { PanelAction } from '../../molecules/PanelAction';

type Mode = 'elementary' | 'life';

const RULES = [30, 90, 110, 184, 54, 150].map((r) => ({ value: r, label: `Rule ${r}` }));
const PRESETS: { value: LifePreset; label: string }[] = [
    { value: 'random', label: 'Random soup' },
    { value: 'glider', label: 'Glider' },
    { value: 'gosper', label: 'Gosper glider gun' },
    { value: 'pulsar', label: 'Pulsar' },
];

/** Right dock "Cellular Automata": draws the live cells as one filled vector path. */
export function AutomataPanel() {
    const insertAutomaton = useStore((s) => s.insertAutomaton);
    const hasCanvas = useStore((s) => !!s.canvas);
    const [mode, setMode] = useState<Mode>('elementary');
    const [rule, setRule] = useState(30);
    const [randomSeed, setRandomSeed] = useState(false);
    const [preset, setPreset] = useState<LifePreset>('random');
    const [steps, setSteps] = useState(10);
    const [density, setDensity] = useState(30);
    const [cols, setCols] = useState(64);
    const [rows, setRows] = useState(32);
    const [cell, setCell] = useState(8);

    const insert = () =>
        insertAutomaton(
            mode === 'elementary'
                ? { mode, rule, seed: randomSeed ? 'random' : 'single', cols, rows, cell }
                : { mode, preset, steps, density: density / 100, cols, rows, cell },
        );

    return (
        <PanelSection
            title="Cellular automaton"
            description="Live cells become one vector path. Run it again for a new random result."
        >
            <Field label="Kind">
                <SegmentedControl<Mode>
                    aria-label="Automaton kind"
                    size="sm"
                    options={[
                        { value: 'elementary', label: '1D rule' },
                        { value: 'life', label: 'Game of Life' },
                    ]}
                    value={mode}
                    onChange={setMode}
                />
            </Field>

            {mode === 'elementary' ? (
                <>
                    <SelectField<number>
                        label="Rule"
                        options={RULES}
                        value={rule}
                        onChange={setRule}
                    />
                    <SliderField
                        label="Custom rule"
                        min={0}
                        max={255}
                        value={rule}
                        onChange={setRule}
                    />
                    <LabeledToggle
                        label="Random first row"
                        checked={randomSeed}
                        onChange={setRandomSeed}
                    />
                </>
            ) : (
                <>
                    <SelectField<LifePreset>
                        label="Start"
                        options={PRESETS}
                        value={preset}
                        onChange={setPreset}
                    />
                    {preset === 'random' && (
                        <SliderField
                            label="Density"
                            min={5}
                            max={95}
                            unit="%"
                            value={density}
                            onChange={setDensity}
                        />
                    )}
                    <SliderField
                        label="Generations"
                        min={0}
                        max={AUTOMATA_LIMITS.maxSteps}
                        value={steps}
                        onChange={setSteps}
                    />
                </>
            )}

            <SliderField
                label={mode === 'elementary' ? 'Width (cells)' : 'Columns'}
                min={8}
                max={AUTOMATA_LIMITS.maxSide}
                value={cols}
                onChange={setCols}
            />
            <SliderField
                label={mode === 'elementary' ? 'Generations (rows)' : 'Rows'}
                min={8}
                max={AUTOMATA_LIMITS.maxSide}
                value={rows}
                onChange={setRows}
            />
            <SliderField
                label="Cell size"
                min={2}
                max={32}
                unit="px"
                value={cell}
                onChange={setCell}
            />
            <PanelAction icon="plus" disabled={!hasCanvas} onClick={insert}>
                Insert pattern
            </PanelAction>
        </PanelSection>
    );
}

export default AutomataPanel;
