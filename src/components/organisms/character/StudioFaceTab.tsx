import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { EMOTIONS, VISEMES } from '@/character/data/emotions';
import { Button } from '../../atoms/Button';
import { Chip } from '../../atoms/Chip';
import { Select } from '../../atoms/Select';
import { SliderField } from '../../molecules/LabeledSlider';
import { PanelSection } from '../../molecules/PanelSection';

/** Emotion (20, with how strongly), where the eyes look, how shut they are, and the mouth shape for lip sync. */
export function StudioFaceTab() {
    const face = useStore(useShallow((s) => s.studioCharacter?.face));
    const emotion = useStore(useShallow((s) => s.studioCharacter?.emotion));
    const edit = useStore((s) => s.editStudioCharacter);
    if (!face || !emotion) return null;
    const pct = (v: number) => Math.round(v * 100);
    return (
        <div className="flex flex-col gap-4">
            <PanelSection
                title="Emotion"
                description="The whole face: brows, eyes, mouth, blush and tears."
            >
                <div className="flex flex-wrap gap-1" role="group" aria-label="Emotions">
                    {EMOTIONS.map((e) => (
                        <Chip
                            key={e.id}
                            active={
                                e.id === emotion.id && (e.id === 'neutral' || emotion.intensity > 0)
                            }
                            onClick={() =>
                                edit({
                                    emotion: { id: e.id, intensity: e.id === 'neutral' ? 0 : 1 },
                                })
                            }
                        >
                            {e.name}
                        </Chip>
                    ))}
                </div>
                <SliderField
                    label="Strength"
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    disabled={emotion.id === 'neutral'}
                    value={pct(emotion.intensity)}
                    onChange={(v) => edit({ emotion: { intensity: v / 100 } }, 'emotion-strength')}
                />
            </PanelSection>
            <PanelSection title="Eyes">
                <SliderField
                    label="Look left / right"
                    hint="Left and right are the character’s own"
                    min={-100}
                    max={100}
                    step={1}
                    unit="%"
                    value={pct(face.gaze.x)}
                    onChange={(v) => edit({ face: { gaze: { ...face.gaze, x: v / 100 } } }, 'gaze')}
                />
                <SliderField
                    label="Look up / down"
                    min={-100}
                    max={100}
                    step={1}
                    unit="%"
                    value={pct(face.gaze.y)}
                    onChange={(v) => edit({ face: { gaze: { ...face.gaze, y: v / 100 } } }, 'gaze')}
                />
                <Button
                    variant="secondary"
                    size="sm"
                    disabled={face.gaze.x === 0 && face.gaze.y === 0}
                    onClick={() => edit({ face: { gaze: { x: 0, y: 0 } } })}
                >
                    Look straight ahead
                </Button>
                <SliderField
                    label="Eyes closed"
                    hint="A held blink"
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    value={pct(face.blink)}
                    onChange={(v) => edit({ face: { blink: v / 100 } }, 'blink')}
                />
            </PanelSection>
            <PanelSection title="Mouth shape" description="For lip sync: M, A, E, O and more.">
                <Select<string>
                    aria-label="Mouth shape"
                    value={face.viseme}
                    onChange={(viseme) => edit({ face: { viseme } })}
                    options={VISEMES.map((v) => ({ value: v.id, label: v.name }))}
                />
            </PanelSection>
        </div>
    );
}

export default StudioFaceTab;
