import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { Button } from '../../atoms/Button';
import { SwitchField } from '../../molecules/LabeledToggle';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { SliderField } from '../../molecules/LabeledSlider';

/**
 * How the copies look: per-copy variation (colour shift, fading, shrinking, seeded wobble), mirrored text
 * readable or truly flipped, and the live ghosts while drawing.
 */
export function SymmetryLook() {
    const { v, setV, options, setOptions } = useStore(
        useShallow((s) => ({
            v: s.symmetryVariation,
            setV: s.setSymmetryVariation,
            options: s.symmetryOptions,
            setOptions: s.setSymmetryOptions,
        })),
    );
    return (
        <div className="flex flex-col gap-2">
            <SliderField
                label="Colour shift per copy"
                min={-60}
                max={60}
                unit="°"
                value={v.hue}
                defaultValue={0}
                onChange={(hue) => setV({ hue })}
            />
            <SliderField
                label="Fade towards the last copy"
                min={0}
                max={95}
                unit="%"
                value={Math.round(v.fade * 100)}
                defaultValue={0}
                onChange={(f) => setV({ fade: f / 100 })}
            />
            <SliderField
                label="Shrink towards the last copy"
                min={0}
                max={95}
                unit="%"
                value={Math.round(v.shrink * 100)}
                defaultValue={0}
                onChange={(s) => setV({ shrink: s / 100 })}
            />
            <SliderField
                label="Hand-made wobble"
                hint="Small random moves, the same every time for the same seed"
                min={0}
                max={60}
                unit="px"
                value={v.wobble}
                defaultValue={0}
                onChange={(wobble) => setV({ wobble })}
            />
            {v.wobble > 0 && (
                <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onClick={() => setV({ seed: v.seed + 1 })}
                >
                    New wobble (seed {v.seed})
                </Button>
            )}
            <SegmentedControl<'readable' | 'mirror'>
                aria-label="Mirrored text"
                value={options.textMode}
                onChange={(textMode) => setOptions({ textMode })}
                options={[
                    { value: 'readable', label: 'Readable text' },
                    { value: 'mirror', label: 'Flipped text' },
                ]}
            />
            <SwitchField
                label="Show ghost copies while drawing"
                checked={options.preview}
                onChange={(preview) => setOptions({ preview })}
            />
        </div>
    );
}
