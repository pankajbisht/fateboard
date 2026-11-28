import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { SYMMETRY_COUNT } from '@/lib/canvas/symmetry';
import type { WallpaperGroup } from '@/lib/canvas/symmetryGroups';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { SelectField } from '../../molecules/SelectField';
import { SliderField } from '../../molecules/LabeledSlider';
import { SymmetryChainEditor } from './SymmetryChainEditor';

export const WALLPAPER_CHOICES: { value: WallpaperGroup; label: string }[] = [
    { value: 'p1', label: 'Grid (p1)' },
    { value: 'p2', label: 'Half-turn grid (p2)' },
    { value: 'pm', label: 'Mirrored columns (pm)' },
    { value: 'p4', label: 'Square pinwheel (p4)' },
    { value: 'p4m', label: 'Square tiles (p4m)' },
    { value: 'p3', label: 'Triangle pinwheel (p3)' },
    { value: 'p6', label: 'Hex pinwheel (p6)' },
    { value: 'p6m', label: 'Hex star (p6m)' },
];

/**
 * Settings of the chosen symmetry mode: axis angle, copies, glide step, spiral turn / size, wallpaper tile,
 * and the Mirror Chain editor (in the Symmetry dock; `compact` in the Brush panel points there instead).
 */
export function SymmetryModeSettings({ compact = false }: { compact?: boolean }) {
    const { symmetry, angle, count, options, updateBrush, setOptions, pickCurve, curveId } =
        useStore(
            useShallow((s) => ({
                pickCurve: s.useSelectionAsSymmetryCurve,
                curveId: s.symmetryCurveId,
                symmetry: s.symmetry,
                angle: s.symmetryAngle,
                count: s.symmetryCount,
                options: s.symmetryOptions,
                updateBrush: s.updateBrush,
                setOptions: s.setSymmetryOptions,
            })),
        );
    const usesAngle = symmetry === 'angle' || symmetry === 'kaleido' || symmetry === 'glide';
    const usesCount = ['radial', 'kaleido', 'glide', 'spiral'].includes(symmetry);
    return (
        <div className="flex flex-col gap-2">
            {usesAngle && (
                <SliderField
                    label={symmetry === 'glide' ? 'Footprint direction' : 'Mirror axis angle'}
                    min={0}
                    max={180}
                    unit="°"
                    value={angle}
                    defaultValue={90}
                    onChange={(v) => updateBrush({ symmetryAngle: v })}
                />
            )}
            {usesCount && (
                <SliderField
                    label={
                        symmetry === 'glide'
                            ? 'Footprints'
                            : symmetry === 'spiral'
                              ? 'Copies along the spiral'
                              : 'Copies around the centre'
                    }
                    hint="Shift + [ and Shift + ] change it while drawing"
                    min={SYMMETRY_COUNT.min}
                    max={SYMMETRY_COUNT.max}
                    value={count}
                    defaultValue={6}
                    onChange={(v) => updateBrush({ symmetryCount: v })}
                />
            )}
            {symmetry === 'glide' && (
                <SliderField
                    label="Step length"
                    min={-400}
                    max={400}
                    unit="px"
                    value={options.glideShift}
                    defaultValue={80}
                    onChange={(v) => setOptions({ glideShift: v })}
                />
            )}
            {symmetry === 'spiral' && (
                <>
                    <SliderField
                        label="Turn per copy"
                        min={-180}
                        max={180}
                        unit="°"
                        value={options.spiralTurn}
                        defaultValue={30}
                        onChange={(v) => setOptions({ spiralTurn: v })}
                    />
                    <SliderField
                        label="Size per copy"
                        min={50}
                        max={150}
                        unit="%"
                        value={Math.round(options.spiralScale * 100)}
                        defaultValue={90}
                        onChange={(v) => setOptions({ spiralScale: v / 100 })}
                    />
                </>
            )}
            {symmetry === 'wallpaper' && (
                <>
                    <SelectField<WallpaperGroup>
                        label="Pattern"
                        options={WALLPAPER_CHOICES}
                        value={options.wallpaper}
                        onChange={(v) => setOptions({ wallpaper: v })}
                    />
                    <SliderField
                        label="Tile size"
                        min={20}
                        max={800}
                        unit="px"
                        value={options.tileSize}
                        defaultValue={200}
                        onChange={(v) => setOptions({ tileSize: v })}
                    />
                    <SliderField
                        label="Tiles each way"
                        min={1}
                        max={8}
                        value={options.tileReach}
                        defaultValue={2}
                        onChange={(v) => setOptions({ tileReach: v })}
                    />
                </>
            )}
            {symmetry === 'curve' && (
                <div className="flex flex-col gap-1">
                    <Button
                        size="sm"
                        variant="secondary"
                        className="self-start"
                        onClick={() => pickCurve()}
                    >
                        <Icon name="waves" />
                        Use the selected path as the curve
                    </Button>
                    <p className="text-xs text-ink-muted">
                        {curveId
                            ? 'Strokes mirror across the curve, flowing along it.'
                            : 'Draw or select a path first, then press the button.'}
                    </p>
                </div>
            )}
            {symmetry === 'chain' &&
                (compact ? (
                    <p className="text-xs text-ink-muted">
                        Build the chain in the Symmetry panel (right dock).
                    </p>
                ) : (
                    <SymmetryChainEditor />
                ))}
        </div>
    );
}
