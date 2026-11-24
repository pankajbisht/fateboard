import { useStore } from '@store';
import { SKIN_TONES } from '@/character/data/recipes';
import type { Body } from '@/character/schema/types';
import { SliderField } from '../../molecules/LabeledSlider';
import LabeledToggle from '../../molecules/LabeledToggle';
import { PanelSection } from '../../molecules/PanelSection';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { ColorChoices } from './ColorChoices';
import { StudioBodyStyle } from './StudioBodyStyle';

type Shape = keyof Pick<
    Body,
    | 'height'
    | 'fat'
    | 'muscle'
    | 'shoulderWidth'
    | 'hipWidth'
    | 'armLength'
    | 'legLength'
    | 'neckLength'
>;

const SHAPE: [Shape, string][] = [
    ['height', 'Height'],
    ['fat', 'Body fat'],
    ['muscle', 'Muscle'],
    ['shoulderWidth', 'Shoulders'],
    ['hipWidth', 'Hips'],
    ['armLength', 'Arm length'],
    ['legLength', 'Leg length'],
    ['neckLength', 'Neck length'],
];

const genderText = (v: number) => (v < 34 ? 'Male' : v > 66 ? 'Female' : 'Blend');

type BodyType = 'male' | 'female' | 'between';
const BODY_TYPES: { value: BodyType; label: string; gender: number }[] = [
    { value: 'male', label: 'Male', gender: 0 },
    { value: 'female', label: 'Female', gender: 1 },
    { value: 'between', label: 'In between', gender: 0.5 },
];
const typeOf = (gender: number): BodyType =>
    gender < 0.34 ? 'male' : gender > 0.66 ? 'female' : 'between';

/** Body type, frame and bust; body sliders (0–100 on screen, 0–1 stored), age and skin. */
export function StudioBodyTab() {
    const body = useStore((s) => s.studioCharacter?.body);
    const edit = useStore((s) => s.editStudioCharacter);
    if (!body) return null;
    const set = (key: keyof Body, value: number) => edit({ body: { [key]: value } }, `body-${key}`);

    return (
        <>
            <StudioBodyStyle />
            <PanelSection
                title="Body"
                description="Male: broad shoulders, narrow hips, a flat chest. Female: an hourglass, hips as wide as the shoulders, a bust. The frame and the bust are separate, so any body can be made (trans and nonbinary bodies too)."
            >
                <SegmentedControl<BodyType>
                    aria-label="Body type"
                    value={typeOf(body.gender)}
                    onChange={(type) =>
                        edit({
                            body: { gender: BODY_TYPES.find((t) => t.value === type)!.gender },
                            resetBust: true,
                        })
                    }
                    options={BODY_TYPES.map(({ value, label }) => ({ value, label }))}
                />
                <SliderField
                    label="Frame"
                    hint="Shoulders, chest, waist, hips, legs and height, from male to female"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(body.gender * 100)}
                    format={genderText}
                    onChange={(v) => set('gender', v / 100)}
                />
                <SliderField
                    label="Bust"
                    hint={
                        body.overridden.includes('bust')
                            ? 'Set by hand: it stays when the frame changes'
                            : 'Follows the frame until you move it'
                    }
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    value={Math.round(body.bust * 100)}
                    onChange={(v) => set('bust', v / 100)}
                />
            </PanelSection>
            <PanelSection title="Age and build">
                <SliderField
                    label="Age"
                    min={5}
                    max={80}
                    step={1}
                    unit=" years"
                    value={Math.round(body.age)}
                    onChange={(v) => set('age', v)}
                    hint="Children have bigger heads for their size; elders stoop a little and grey (unless you pick the hair colour)."
                />
                <LabeledToggle
                    label="Stoop with age"
                    hint="Off: stands upright at any age."
                    checked={!body.overridden.includes('posture')}
                    onChange={(posture) => edit({ posture })}
                />
                {SHAPE.map(([key, label]) => (
                    <SliderField
                        key={key}
                        label={label}
                        min={0}
                        max={100}
                        step={1}
                        value={Math.round(body[key] * 100)}
                        onChange={(v) => set(key, v / 100)}
                    />
                ))}
            </PanelSection>
            <PanelSection title="Skin">
                <ColorChoices
                    id="character-skin"
                    label="Skin tone"
                    colors={SKIN_TONES.map((t) => t.color)}
                    value={body.skinTone}
                    onChange={(skinTone) => edit({ body: { skinTone } }, 'skin')}
                />
            </PanelSection>
        </>
    );
}

export default StudioBodyTab;
