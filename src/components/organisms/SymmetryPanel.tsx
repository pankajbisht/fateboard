import { useState } from 'react';
import { useStore } from '@store';
import { useSelectionStyle } from '@hooks/useSelectionStyle';
import type { ReflectOptions } from '@/store/slices/createPaintToolsSlice';
import { SYMMETRY_COUNT } from '@/lib/canvas/symmetry';
import { Chip } from '../atoms/Chip';
import { Icon } from '../atoms/Icon';
import { PanelAction } from '../molecules/PanelAction';
import { PanelSection } from '../molecules/PanelSection';
import { SegmentedControl } from '../molecules/SegmentedControl';
import { SliderField } from '../molecules/LabeledSlider';
import { SYMMETRY_CHOICES, SymmetryControls, usesAngle, usesCount } from './SymmetryControls';

type Mode = ReflectOptions['mode'];

/**
 * Right dock "Symmetry": drawing symmetry for the brushes, and "Reflect selection", which makes the mirrored
 * half (or every turn) of the selected objects: reflection, rotational and point symmetry, kaleidoscope.
 */
export function SymmetryPanel() {
    const reflectSelection = useStore((s) => s.reflectSelection);
    const showToast = useStore((s) => s.showToast);
    const [style] = useSelectionStyle();
    const [mode, setMode] = useState<Mode>('x');
    const [angle, setAngle] = useState(90);
    const [count, setCount] = useState(6);
    const [around, setAround] = useState<'selection' | 'page'>('selection');
    const selected = style?.count ?? 0;

    const run = async () => {
        const added = await reflectSelection({ mode, angle, count, around });
        showToast({
            message: added
                ? `Added ${added} ${added === 1 ? 'copy' : 'copies'}.`
                : 'Select something to reflect first.',
        });
    };

    return (
        <>
            <PanelSection
                title="Drawing symmetry"
                description="Every stroke you draw is copied around the centre. The axes show while you draw."
            >
                <SymmetryControls />
            </PanelSection>
            <PanelSection
                title="Reflect selection"
                description="Make the other half, or every turn, of the selected objects."
            >
                <div className="flex flex-wrap gap-1" role="group" aria-label="Reflection type">
                    {SYMMETRY_CHOICES.filter((c) => c.value !== 'none').map((c) => (
                        <Chip
                            key={c.value}
                            active={mode === c.value}
                            onClick={() => setMode(c.value as Mode)}
                        >
                            <Icon name={c.icon} />
                            {c.label}
                        </Chip>
                    ))}
                </div>
                {usesAngle(mode) && (
                    <SliderField
                        label="Axis angle"
                        min={0}
                        max={180}
                        unit="°"
                        value={angle}
                        onChange={setAngle}
                    />
                )}
                {usesCount(mode) && (
                    <SliderField
                        label="Copies"
                        min={SYMMETRY_COUNT.min}
                        max={SYMMETRY_COUNT.max}
                        value={count}
                        onChange={setCount}
                    />
                )}
                <SegmentedControl<'selection' | 'page'>
                    aria-label="Reflect around"
                    value={around}
                    onChange={setAround}
                    options={[
                        { value: 'selection', label: 'Selection centre' },
                        { value: 'page', label: 'Page centre' },
                    ]}
                />
                <PanelAction icon="reflect" disabled={!selected} onClick={run}>
                    Reflect selection
                </PanelAction>
            </PanelSection>
        </>
    );
}

export default SymmetryPanel;
