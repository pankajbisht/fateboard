import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { ONION_LIMITS } from '@/store/slices/createTimelineSlice';
import { SliderField } from '../../molecules/LabeledSlider';
import LabeledToggle from '../../molecules/LabeledToggle';
import { PanelSection } from '../../molecules/PanelSection';

/**
 * What the board shows to help you animate: onion skin (the frames around the playhead, red before and
 * green after, while paused) and motion paths. Board-only: never in exports.
 */
export function ViewSettings() {
    const { onion, motionPath } = useStore(
        useShallow((s) => ({ onion: s.onionSkin, motionPath: s.motionPath })),
    );
    const setOnionSkin = useStore((s) => s.setOnionSkin);
    const setMotionPath = useStore((s) => s.setMotionPath);

    return (
        <>
            <PanelSection
                title="Onion skin"
                description="Faint copies of the frames before (red) and after (green) the playhead, while paused."
            >
                <LabeledToggle
                    label="Show onion skin"
                    checked={onion.on}
                    onChange={(on) => setOnionSkin({ on })}
                />
                <SliderField
                    label="Frames each side"
                    min={ONION_LIMITS.count[0]}
                    max={ONION_LIMITS.count[1]}
                    step={1}
                    value={onion.count}
                    onChange={(count) => setOnionSkin({ count })}
                    disabled={!onion.on}
                />
                <SliderField
                    label="Frames apart"
                    min={ONION_LIMITS.step[0]}
                    max={ONION_LIMITS.step[1]}
                    step={1}
                    value={onion.step}
                    onChange={(step) => setOnionSkin({ step })}
                    disabled={!onion.on}
                />
                <SliderField
                    label="Opacity"
                    min={Math.round(ONION_LIMITS.opacity[0] * 100)}
                    max={Math.round(ONION_LIMITS.opacity[1] * 100)}
                    step={5}
                    unit="%"
                    value={Math.round(onion.opacity * 100)}
                    onChange={(v) => setOnionSkin({ opacity: v / 100 })}
                    disabled={!onion.on}
                />
            </PanelSection>
            <PanelSection
                title="Motion path"
                description="Where animated objects travel: a dot per frame (closer dots = slower), a diamond per keyframe."
            >
                <LabeledToggle
                    label="Show motion paths"
                    checked={motionPath}
                    onChange={setMotionPath}
                />
            </PanelSection>
        </>
    );
}

export default ViewSettings;
