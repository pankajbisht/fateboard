import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import type { Symmetry } from '@/store/brushConfig';
import { SYMMETRY_COUNT } from '@/lib/canvas/symmetry';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Icon, type IconName } from '../atoms/Icon';
import { SliderField } from '../molecules/LabeledSlider';

export const SYMMETRY_CHOICES: { value: Symmetry; label: string; icon: IconName }[] = [
    { value: 'none', label: 'Off', icon: 'xmark' },
    { value: 'x', label: 'Left-right', icon: 'flip-horizontal' },
    { value: 'y', label: 'Top-bottom', icon: 'flip-vertical' },
    { value: 'both', label: '4-way', icon: 'symmetry' },
    { value: 'angle', label: 'Any axis', icon: 'reflect' },
    { value: 'radial', label: 'Radial', icon: 'symmetry-radial' },
    { value: 'point', label: 'Point', icon: 'symmetry-point' },
    { value: 'kaleido', label: 'Kaleidoscope', icon: 'kaleidoscope' },
];

export const usesAngle = (m: Symmetry) => m === 'angle' || m === 'kaleido';
export const usesCount = (m: Symmetry) => m === 'radial' || m === 'kaleido';

/**
 * Drawing symmetry (Draw panel, Symmetry tab): mirror left-right / top-bottom / 4-way, a mirror at any angle,
 * radial (N turns), point (a half turn) and kaleidoscope. Every finished stroke is copied around the centre;
 * the axes show on the board while a drawing tool is active.
 */
export function SymmetryControls() {
    const { symmetry, symmetryAngle, symmetryCount, setSymmetry, recenterSymmetry, updateBrush } =
        useStore(
            useShallow((s) => ({
                symmetry: s.symmetry,
                symmetryAngle: s.symmetryAngle,
                symmetryCount: s.symmetryCount,
                setSymmetry: s.setSymmetry,
                recenterSymmetry: s.recenterSymmetry,
                updateBrush: s.updateBrush,
            })),
        );
    return (
        <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Drawing symmetry">
                {SYMMETRY_CHOICES.map((c) => (
                    <Chip
                        key={c.value}
                        active={symmetry === c.value}
                        onClick={() => setSymmetry(c.value)}
                    >
                        <Icon name={c.icon} />
                        {c.label}
                    </Chip>
                ))}
            </div>
            {usesAngle(symmetry) && (
                <SliderField
                    label="Mirror axis angle"
                    min={0}
                    max={180}
                    unit="°"
                    value={symmetryAngle}
                    defaultValue={90}
                    onChange={(v) => updateBrush({ symmetryAngle: v })}
                />
            )}
            {usesCount(symmetry) && (
                <SliderField
                    label="Copies around the centre"
                    min={SYMMETRY_COUNT.min}
                    max={SYMMETRY_COUNT.max}
                    value={symmetryCount}
                    defaultValue={6}
                    onChange={(v) => updateBrush({ symmetryCount: v })}
                />
            )}
            {symmetry !== 'none' && (
                <Button
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => recenterSymmetry()}
                >
                    Center on the view
                </Button>
            )}
        </div>
    );
}
