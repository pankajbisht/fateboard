import { useStore } from '@store';
import { impactCloseup, impactPoint } from '@/scene/combat/camera';
import { FIGHT_FX_KEYS, type FightFxKey, type SceneFight } from '@/scene/schema/types';
import { Button } from '../../atoms/Button';
import { Select } from '../../atoms/Select';
import { SwitchField } from '../../molecules/LabeledToggle';
import { PanelSection } from '../../molecules/PanelSection';

const INTENSITIES: { value: SceneFight['intensity']; label: string }[] = [
    { value: 'off', label: 'No effects' },
    { value: 'subtle', label: 'Subtle' },
    { value: 'normal', label: 'Normal' },
    { value: 'dramatic', label: 'Dramatic (manga)' },
];
const LABELS: Record<FightFxKey, string> = {
    flash: 'Impact flash',
    speedLines: 'Speed lines',
    smear: 'Motion smear',
    shockwave: 'Shockwave ring',
    sweat: 'Sweat drops',
    shake: 'Camera shake (clips)',
    hitStop: 'Freeze on impact (clips)',
};

/**
 * Effects of the placed fight exchange (docs/COMBAT_PACK.md, Stage 3): how strong, and which ones show. Drawn at the
 * impact moment; a miss shows motion only, a block a smaller burst. Fight clips on the page use the same settings.
 */
export function SceneFightFx() {
    const scene = useStore((s) => s.studioScene);
    const edit = useStore((s) => s.editStudioScene);
    const fight = scene?.fight;
    if (!scene || !fight) return null;
    const point = impactPoint(scene);
    const closeUp = (dramatic: boolean) => {
        if (point) edit({ kind: 'camera', patch: impactCloseup(point, dramatic) });
    };
    return (
        <PanelSection
            title="Fight effects"
            description={
                fight.key === 'peak'
                    ? 'Shown at the impact. Clips placed on the page use these too.'
                    : 'Shown when the exchange is at its impact moment.'
            }
        >
            {point && (
                <div className="grid grid-cols-2 gap-1" role="group" aria-label="Impact camera">
                    <Button variant="secondary" size="sm" onClick={() => closeUp(false)}>
                        Close-up on impact
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => closeUp(true)}>
                        Dramatic close-up
                    </Button>
                </div>
            )}
            <Select<SceneFight['intensity']>
                aria-label="Effect strength"
                value={fight.intensity}
                onChange={(intensity) => edit({ kind: 'fightFx', intensity })}
                options={INTENSITIES}
            />
            {fight.intensity !== 'off' &&
                FIGHT_FX_KEYS.map((k) => (
                    <SwitchField
                        key={k}
                        label={LABELS[k]}
                        checked={fight.effects[k]}
                        onChange={(on) => edit({ kind: 'fightFx', effects: { [k]: on } })}
                    />
                ))}
        </PanelSection>
    );
}

export default SceneFightFx;
