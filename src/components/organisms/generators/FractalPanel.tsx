import { useState } from 'react';
import { useStore } from '@store';
import { FRACTAL_LIMITS, type FractalKind } from '@/lib/generators/fractals';
import { PanelSection } from '../../molecules/PanelSection';
import { SliderField } from '../../molecules/LabeledSlider';
import { SelectField } from '../../molecules/SelectField';
import { PanelAction } from '../../molecules/PanelAction';

const KINDS: { value: FractalKind; label: string; description: string }[] = [
    { value: 'koch', label: 'Koch snowflake', description: 'Filled, edges split into thirds' },
    {
        value: 'sierpinski',
        label: 'Sierpinski triangle',
        description: 'Filled, triangles in triangles',
    },
    { value: 'tree', label: 'Fractal tree', description: 'Branches split in two' },
    { value: 'dragon', label: 'Dragon curve', description: 'One line folded on itself' },
    { value: 'hilbert', label: 'Hilbert curve', description: 'Space-filling line' },
];

/** Right dock "Fractals": inserts one editable vector path at the centre of the view. */
export function FractalPanel() {
    const insertFractal = useStore((s) => s.insertFractal);
    const hasCanvas = useStore((s) => !!s.canvas);
    const [kind, setKind] = useState<FractalKind>('koch');
    const [depth, setDepth] = useState(4);
    const [size, setSize] = useState(300);
    const [angle, setAngle] = useState(25);

    const max = FRACTAL_LIMITS[kind];
    const level = Math.min(depth, max);

    return (
        <PanelSection
            title="Fractal"
            description="Inserted as one vector path: recolor it in Fill & Shadow, edit nodes with A."
        >
            <SelectField<FractalKind>
                label="Type"
                options={KINDS}
                value={kind}
                onChange={setKind}
            />
            <SliderField label="Depth" min={1} max={max} value={level} onChange={setDepth} />
            <SliderField
                label="Size"
                min={50}
                max={1000}
                step={10}
                unit="px"
                value={size}
                onChange={setSize}
            />
            {kind === 'tree' && (
                <SliderField
                    label="Branch angle"
                    min={5}
                    max={90}
                    unit="°"
                    value={angle}
                    onChange={setAngle}
                />
            )}
            <PanelAction
                icon="plus"
                disabled={!hasCanvas}
                onClick={() => insertFractal({ kind, depth: level, size, angle })}
            >
                Insert fractal
            </PanelAction>
        </PanelSection>
    );
}

export default FractalPanel;
