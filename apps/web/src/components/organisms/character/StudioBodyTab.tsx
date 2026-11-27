import { useStore } from '@store';
import { SKIN_TONES } from '@/character/data/recipes';
import { identityOf } from '@/character/data/audience';
import { BODY_TYPES, BODY_TYPE_LABELS, bodyTypeEdit, bodyTypeOf } from '@/character/data/bodyTypes';
import type { Body, Identity } from '@/character/schema/types';
import { Button } from '../../atoms/Button';
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

/** Male and female also set the frame (as the old Male / Female switch did); trans keeps the body as it is. */
const IDENTITY_OPTIONS: { value: Identity; label: string; gender?: number }[] = [
    { value: 'male', label: 'Male', gender: 0 },
    { value: 'female', label: 'Female', gender: 1 },
    { value: 'trans', label: 'Trans' },
];

/** Identity, frame and bust, body type presets; body sliders (0–100 on screen, 0–1 stored), age and skin. */
export function StudioBodyTab() {
    const c = useStore((s) => s.studioCharacter);
    const edit = useStore((s) => s.editStudioCharacter);
    if (!c) return null;
    const body = c.body;
    const current = bodyTypeOf(c);
    const set = (key: keyof Body, value: number) => edit({ body: { [key]: value } }, `body-${key}`);

    return (
        <>
            <StudioBodyStyle />
            <PanelSection
                title="Body"
                description="Identity decides which hair and clothes are listed (Trans lists everything). Male and Female also set the frame; the frame and the bust are separate, so any body can be made."
            >
                <SegmentedControl<Identity>
                    aria-label="Identity"
                    value={identityOf(c)}
                    onChange={(identity) => {
                        const gender = IDENTITY_OPTIONS.find((o) => o.value === identity)!.gender;
                        edit(
                            gender === undefined
                                ? { identity }
                                : { identity, body: { gender }, resetBust: true },
                        );
                    }}
                    options={IDENTITY_OPTIONS.map(({ value, label }) => ({ value, label }))}
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
            <PanelSection
                title="Body type"
                description="A build in one click, in the male or female version (by identity; for Trans, by the frame). Fine-tune with the sliders below."
            >
                <div role="group" aria-label="Body type" className="grid grid-cols-3 gap-1.5">
                    {BODY_TYPES.map((t) => (
                        <Button
                            key={t}
                            size="sm"
                            variant={current === t ? 'primary' : 'secondary'}
                            aria-pressed={current === t}
                            onClick={() => edit(bodyTypeEdit(c, t))}
                        >
                            {BODY_TYPE_LABELS[t]}
                        </Button>
                    ))}
                </div>
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
