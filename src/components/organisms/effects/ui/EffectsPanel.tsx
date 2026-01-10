import { useState } from 'react';
import { EffectSwitcher } from './EffectSwitcher';
import { PathEffects } from './PathEffects';
import { RepeatRadially } from './RepeatRadially';
import { RepeatAlongPath } from './RepeatAlongPath';

export type EffectType = 'tiling' | 'rotate' | 'along-path';

const EFFECT_COMPONENTS: Record<EffectType, React.FC> = {
    tiling: PathEffects,
    rotate: RepeatRadially,
    'along-path': RepeatAlongPath,
};

export const EffectsPanel = () => {
    const [activeEffect, setActiveEffect] = useState<EffectType>('tiling');

    const ActiveEffect = EFFECT_COMPONENTS[activeEffect];

    return (
        <div className="flex flex-col gap-4 p-3">
            <EffectSwitcher value={activeEffect} onChange={setActiveEffect} />

            <ActiveEffect />
        </div>
    );
};
