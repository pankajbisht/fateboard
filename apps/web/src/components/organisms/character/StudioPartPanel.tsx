import { useStore } from '@store';
import { PART_GROUPS } from '@/character/schema/types';
import { colorOf, materialOf, type StudioPart } from '@/character/studio/edit';
import { Select } from '../../atoms/Select';
import { Field } from '../../molecules/Field';
import { CustomColorButton } from './CustomColorButton';
import { PanelSection } from '../../molecules/PanelSection';
import { MATERIAL_LABELS, PART_LABELS } from './studioLabels';

const PARTS: StudioPart[] = [...PART_GROUPS, 'hair'];

/** The selected body part (click it on the character, or pick it here) and the colour it shows. */
export function StudioPartPanel() {
    const c = useStore((s) => s.studioCharacter);
    const part = useStore((s) => s.studioSelectedPart);
    const select = useStore((s) => s.selectStudioPart);
    const recolor = useStore((s) => s.recolorStudioPart);
    if (!c) return null;
    const material = part ? materialOf(c, part) : null;

    return (
        <PanelSection
            title="Selected part"
            description="Click a part of the character to select it."
        >
            <Field wrap label="Part">
                <Select<StudioPart | ''>
                    aria-label="Part"
                    value={part ?? ''}
                    onChange={(v) => select(v || null)}
                    options={[
                        { value: '', label: 'None' },
                        ...PARTS.map((p) => ({ value: p, label: PART_LABELS[p] })),
                    ]}
                />
            </Field>
            {part && material && (
                <Field wrap label={`${MATERIAL_LABELS[material]} colour`}>
                    <CustomColorButton
                        label={`${PART_LABELS[part]}: ${MATERIAL_LABELS[material].toLowerCase()} colour`}
                        value={colorOf(c, material)}
                        onChange={recolor}
                    />
                </Field>
            )}
        </PanelSection>
    );
}

export default StudioPartPanel;
