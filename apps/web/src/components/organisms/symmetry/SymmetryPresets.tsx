import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import {
    BUILTIN_SYMMETRY_PRESETS,
    type SymmetryPreset,
} from '@/store/slices/symmetry/symmetryPresets';
import { Button } from '../../atoms/Button';
import { Chip } from '../../atoms/Chip';
import { Icon } from '../../atoms/Icon';
import { Input } from '../../atoms/Input';

const GROUPS: { id: SymmetryPreset['group']; label: string }[] = [
    { id: 'brush', label: 'Kaleidoscope brush' },
    { id: 'mood', label: 'Moods' },
];

/**
 * Presets: the Kaleidoscope Brush (Snowflake, Mandala, Flower, Lotus), moods (Calm, Chaos, Royal, Tech), the
 * user's saved setups, and the dice (a surprising setup; "Keep this one" saves it).
 */
export function SymmetryPresets() {
    const { mine, apply, save, remove, roll, showToast } = useStore(
        useShallow((s) => ({
            mine: s.symmetryPresets,
            apply: s.applySymmetryPreset,
            save: s.saveSymmetryPreset,
            remove: s.deleteSymmetryPreset,
            roll: s.rollSymmetryDice,
            showToast: s.showToast,
        })),
    );
    const [name, setName] = useState('');
    const [rolled, setRolled] = useState<SymmetryPreset | null>(null);

    const keep = () => {
        const saved = save(name || rolled?.name);
        if (!saved) return;
        setName('');
        setRolled(null);
        showToast({ message: `Saved "${saved.name}".` });
    };

    return (
        <div className="flex flex-col gap-3">
            {GROUPS.map((g) => (
                <div key={g.id} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-ink-muted">{g.label}</span>
                    <div className="flex flex-wrap gap-1" role="group" aria-label={g.label}>
                        {BUILTIN_SYMMETRY_PRESETS.filter((p) => p.group === g.id).map((p) => (
                            <Chip key={p.id} active={false} onClick={() => apply(p)}>
                                {p.name}
                            </Chip>
                        ))}
                    </div>
                </div>
            ))}
            <div className="flex flex-wrap items-center gap-1">
                <Button size="sm" variant="secondary" onClick={() => setRolled(roll())}>
                    <Icon name="wand-magic-sparkles" />
                    Surprise me
                </Button>
                {rolled && (
                    <Button size="sm" variant="primary" onClick={keep}>
                        <Icon name="floppy-disk" />
                        Keep this one
                    </Button>
                )}
            </div>
            {mine.length > 0 && (
                <ul className="flex flex-col gap-1" aria-label="My presets">
                    {mine.map((p) => (
                        <li key={p.id} className="flex items-center gap-1">
                            <Chip
                                active={false}
                                className="flex-1 justify-start"
                                onClick={() => apply(p)}
                            >
                                {p.name}
                            </Chip>
                            <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Delete ${p.name}`}
                                onClick={() => void remove(p.id)}
                            >
                                <Icon name="trash-can" />
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex items-end gap-1">
                <Input
                    label="Preset name"
                    value={name}
                    maxLength={40}
                    placeholder="My symmetry"
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1"
                />
                <Button size="sm" variant="secondary" onClick={keep}>
                    <Icon name="floppy-disk" />
                    Save
                </Button>
            </div>
        </div>
    );
}
