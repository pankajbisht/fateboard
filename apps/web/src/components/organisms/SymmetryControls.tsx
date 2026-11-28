import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import type { Symmetry } from '@/store/brushConfig';
import { MAX_COPIES } from '@/lib/canvas/symmetryGroups';
import { Button } from '../atoms/Button';
import { Chip } from '../atoms/Chip';
import { Icon, type IconName } from '../atoms/Icon';
import { SymmetryModeSettings } from './symmetry/SymmetryModeSettings';

export const SYMMETRY_CHOICES: { value: Symmetry; label: string; icon: IconName; hint: string }[] =
    [
        { value: 'none', label: 'Off', icon: 'xmark', hint: 'No symmetry (M)' },
        {
            value: 'x',
            label: 'Left-right',
            icon: 'flip-horizontal',
            hint: 'Mirror across a vertical axis',
        },
        {
            value: 'y',
            label: 'Top-bottom',
            icon: 'flip-vertical',
            hint: 'Mirror across a horizontal axis',
        },
        { value: 'both', label: '4-way', icon: 'symmetry', hint: 'Both mirrors and a half turn' },
        {
            value: 'angle',
            label: 'Any axis',
            icon: 'reflect',
            hint: 'Mirror across an axis at any angle',
        },
        {
            value: 'radial',
            label: 'Radial',
            icon: 'symmetry-radial',
            hint: 'Turned copies around the centre',
        },
        {
            value: 'point',
            label: 'Point',
            icon: 'symmetry-point',
            hint: 'A half turn around the centre',
        },
        {
            value: 'kaleido',
            label: 'Kaleidoscope',
            icon: 'kaleidoscope',
            hint: 'Turns plus a mirror in each slice (mandala)',
        },
        {
            value: 'glide',
            label: 'Glide',
            icon: 'repeat',
            hint: 'Mirror and slide, like footprints',
        },
        {
            value: 'spiral',
            label: 'Spiral',
            icon: 'symmetry-radial',
            hint: 'Each copy turns and shrinks (galaxy, seashell)',
        },
        {
            value: 'wallpaper',
            label: 'Wallpaper',
            icon: 'table-cells-large',
            hint: 'Tiles repeating across the board',
        },
        {
            value: 'chain',
            label: 'Mirror chain',
            icon: 'layer-group',
            hint: 'Stack mirrors and turns in order',
        },
        {
            value: 'curve',
            label: 'Curve',
            icon: 'waves',
            hint: 'Mirror across a bendy path so copies flow along it',
        },
    ];

export const usesAngle = (m: Symmetry) => m === 'angle' || m === 'kaleido' || m === 'glide';
export const usesCount = (m: Symmetry) =>
    m === 'radial' || m === 'kaleido' || m === 'glide' || m === 'spiral';

/** Copies per stroke, with a friendly warning when it gets heavy or was capped. */
export function SymmetryCopyCount() {
    const inputs = useStore(
        useShallow((s) => [
            s.symmetry,
            s.symmetryAngle,
            s.symmetryCount,
            s.symmetryCenter,
            s.symmetryOptions,
            s.symmetryChain,
            s.symmetrySource,
            s.symmetryEdge,
            s.symmetryPins,
            s.symmetryPinId,
            s.canvas,
        ]),
    );
    const copyStats = useStore((s) => s.symmetryCopyStats);
    // the plan only depends on these inputs: compute it once per change, not on every store update
    const stats = useMemo(
        () => (inputs[0] === 'none' ? null : copyStats()),
        [inputs, copyStats], // useShallow keeps `inputs` stable while every entry is unchanged
    );
    if (!stats) return null;
    const cut = stats.wanted > stats.count;
    return (
        <p
            role="status"
            className={`text-xs ${stats.heavy || cut ? 'text-danger' : 'text-ink-muted'}`}
        >
            {stats.count + 1} pieces per stroke
            {cut
                ? ` (capped at ${MAX_COPIES + 1}: lower the reach or count for the full pattern)`
                : stats.heavy
                  ? '. That is a lot: drawing may feel slower.'
                  : ''}
        </p>
    );
}

/**
 * Drawing symmetry (Brush panel and the Symmetry dock): the mode chips, the settings of the chosen mode and
 * the copy count. Every finished stroke is copied (ghosts show while drawing); the axes show on the board
 * while a drawing tool is active. M turns it on / off, Shift + [ / ] change the count.
 */
export function SymmetryControls({ compact = false }: { compact?: boolean }) {
    const { symmetry, setSymmetry, recenterSymmetry, symmetrySource } = useStore(
        useShallow((s) => ({
            symmetry: s.symmetry,
            setSymmetry: s.setSymmetry,
            recenterSymmetry: s.recenterSymmetry,
            symmetrySource: s.symmetrySource,
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
                        title={c.hint}
                    >
                        <Icon name={c.icon} />
                        {c.label}
                    </Chip>
                ))}
            </div>
            {symmetry !== 'none' && <SymmetryModeSettings compact={compact} />}
            <SymmetryCopyCount />
            {symmetry !== 'none' && symmetrySource === 'free' && (
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
