import type { GifSettings } from '@/animation/gif/gifSettings';
import LabeledToggle from '../../molecules/LabeledToggle';

/** GIF-only switches of the Export pane. */
export function GifFields({
    value,
    onChange,
    disabled,
}: {
    value: GifSettings;
    /** gets only what changed */
    onChange: (patch: Partial<GifSettings>) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex flex-col gap-2">
            <LabeledToggle
                label="Loop forever"
                hint="Off: plays once and stops on the last frame."
                checked={value.loop}
                onChange={(loop) => onChange({ loop })}
                disabled={disabled}
            />
            <LabeledToggle
                label="Dither"
                hint="Smoother gradients and photos; a larger file."
                checked={value.dither}
                onChange={(dither) => onChange({ dither })}
                disabled={disabled}
            />
            <LabeledToggle
                label="Transparent background"
                hint="Only what is on the page; GIF edges cannot be half transparent."
                checked={value.transparent}
                onChange={(transparent) => onChange({ transparent })}
                disabled={disabled}
            />
        </div>
    );
}

export default GifFields;
