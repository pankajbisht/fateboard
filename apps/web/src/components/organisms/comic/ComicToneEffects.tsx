import { useState } from 'react';
import { useStore } from '@store';
import { Button } from '@/components/atoms/Button';
import { PanelSection } from '@/components/molecules/PanelSection';
import { SliderField } from '@/components/molecules/LabeledSlider';
import { SelectField } from '@/components/molecules/SelectField';
import { DEFAULT_TONE, type ToneKind, type ToneParams } from '@/lib/comic/screentone';

const TONE_OPTIONS: { value: ToneKind; label: string }[] = [
    { value: 'dots', label: 'Dots' },
    { value: 'lines', label: 'Lines' },
    { value: 'cross', label: 'Cross-hatch' },
    { value: 'noise', label: 'Noise (sand)' },
];

/** Comic panel: screentones on the selection and effect lines (focus, speed, burst). */
export function ComicToneEffects() {
    const [tone, setTone] = useState<ToneParams>(DEFAULT_TONE);
    const hasSelection = useStore((s) => !!s.hasSelection);
    const applyTone = useStore((s) => s.applyTone);
    const removeTone = useStore((s) => s.removeTone);
    const addEffect = useStore((s) => s.addMangaEffect);
    const patch = (p: Partial<ToneParams>) => setTone((t) => ({ ...t, ...p }));

    return (
        <>
            <PanelSection title="Screentones" description="Fill the selected shapes with a tone.">
                <SelectField<ToneKind>
                    label="Tone"
                    inline
                    options={TONE_OPTIONS}
                    value={tone.kind}
                    onChange={(kind) => patch({ kind })}
                />
                <SliderField
                    label="Cell size"
                    min={3}
                    max={40}
                    unit="px"
                    value={tone.spacing}
                    onChange={(spacing) => patch({ spacing })}
                />
                <SliderField
                    label="Density"
                    min={5}
                    max={95}
                    unit="%"
                    value={Math.round(tone.density * 100)}
                    onChange={(v) => patch({ density: v / 100 })}
                />
                <SliderField
                    label="Angle"
                    min={0}
                    max={179}
                    unit="°"
                    value={tone.angle}
                    onChange={(angle) => patch({ angle })}
                />
                <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" disabled={!hasSelection} onClick={() => applyTone(tone)}>
                        Apply tone
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={!hasSelection}
                        onClick={() => removeTone()}
                    >
                        Remove tone
                    </Button>
                </div>
            </PanelSection>

            <PanelSection
                title="Effect lines"
                description="Fills the selected panel (into its Art layer), else the page margins."
            >
                <div className="grid grid-cols-3 gap-2">
                    <Button variant="secondary" size="sm" onClick={() => addEffect('focus')}>
                        Focus lines
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => addEffect('speed')}>
                        Speed lines
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => addEffect('burst')}>
                        Burst
                    </Button>
                </div>
            </PanelSection>
        </>
    );
}
