import { useStore } from '@store';
import { NO_EFFECTS, type Effects } from '@/character/schema/effects';
import { Button } from '../../atoms/Button';
import { SliderField } from '../../molecules/LabeledSlider';
import { PanelSection } from '../../molecules/PanelSection';
import { SegmentedControl } from '../../molecules/SegmentedControl';

type Strength = 'wind' | 'updraft' | 'twirl' | 'wet';

const STRENGTHS: { key: Strength; label: string; hint: string }[] = [
    { key: 'wind', label: 'Wind', hint: 'Hair, skirts and long tops blow with it' },
    { key: 'updraft', label: 'Updraft', hint: 'A jump or a fall: hair floats up, hems lift' },
    { key: 'twirl', label: 'Twirl', hint: 'A spin: skirts and coats flare out all round' },
    {
        key: 'wet',
        label: 'Wet',
        hint: 'Rain or a swim: hair hangs flat, cloth clings and darkens, drops fall',
    },
];

/** Where the wind blows to, as seen in the front view (schema/effects.ts `windDir`). */
const DIRECTIONS = [
    { value: '0', label: '→ Right' },
    { value: '180', label: '← Left' },
    { value: '90', label: 'Toward' },
    { value: '270', label: 'Away' },
];

/**
 * Effects on hair and hanging cloth (2026-11-27): wind with a direction, updraft, twirl and wet, each 0–100. They go
 * on the page with the character; a scene's wind blows on every actor (Scene, Place tab).
 */
export function StudioEffectsTab() {
    const effects = useStore((s) => s.studioCharacter?.effects);
    const edit = useStore((s) => s.editStudioCharacter);
    const has = !!useStore((s) => s.studioCharacter);
    if (!has) return null;
    const e: Effects = { ...NO_EFFECTS, ...effects };
    const dir = String(e.windDir);
    return (
        <PanelSection
            title="Effects"
            description="What the air or water does to the hair and the hanging cloth (skirts, kurtas, coats)."
        >
            {STRENGTHS.map(({ key, label, hint }) => (
                <SliderField
                    key={key}
                    label={label}
                    hint={hint}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    value={Math.round(e[key] * 100)}
                    onChange={(v) => edit({ effects: { [key]: v / 100 } }, `fx-${key}`)}
                />
            ))}
            <SegmentedControl<string>
                aria-label="Wind direction"
                value={DIRECTIONS.some((d) => d.value === dir) ? dir : '0'}
                onChange={(v) => edit({ effects: { windDir: Number(v) } })}
                options={DIRECTIONS}
            />
            <Button
                variant="secondary"
                size="sm"
                disabled={!effects}
                onClick={() => edit({ effects: { ...NO_EFFECTS } })}
            >
                Clear effects
            </Button>
        </PanelSection>
    );
}

export default StudioEffectsTab;
