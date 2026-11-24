import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { SHOT_LABELS } from '@/character/render/camera';
import type { ShotId } from '@/character/schema/types';
import { Button } from '../../atoms/Button';
import { Select } from '../../atoms/Select';
import { SliderField } from '../../molecules/LabeledSlider';
import { options } from './studioLabels';

const VIEWS = [
    { label: 'Front', yaw: 0 },
    { label: '¾', yaw: 35 },
    { label: 'Side', yaw: 90 },
    { label: 'Back', yaw: 180 },
];

/** Turn and tilt the studio camera; pick a shot. What the camera sees is what goes on the page. */
export function StudioCameraBar() {
    const camera = useStore(useShallow((s) => s.studioCamera));
    const setCamera = useStore((s) => s.setStudioCamera);
    return (
        <div
            role="group"
            aria-label="Camera"
            className="flex flex-wrap items-end gap-x-4 gap-y-2 border-t border-line bg-surface px-3 py-2"
        >
            <SliderField
                label="Turn"
                min={0}
                max={359}
                step={1}
                unit="°"
                value={Math.round(camera.yaw)}
                onChange={(yaw) => setCamera({ yaw })}
                className="w-44"
            />
            <div className="flex gap-1" role="group" aria-label="Views">
                {VIEWS.map((v) => (
                    <Button
                        key={v.label}
                        variant="secondary"
                        size="sm"
                        aria-pressed={Math.round(camera.yaw) === v.yaw}
                        onClick={() => setCamera({ yaw: v.yaw })}
                    >
                        {v.label}
                    </Button>
                ))}
            </div>
            <SliderField
                label="Tilt"
                min={-60}
                max={60}
                step={1}
                unit="°"
                value={Math.round(camera.pitch)}
                onChange={(pitch) => setCamera({ pitch })}
                className="w-36"
            />
            <Select<ShotId>
                aria-label="Shot"
                size="sm"
                block={false}
                value={camera.shot}
                onChange={(shot) => setCamera({ shot })}
                options={options(SHOT_LABELS)}
            />
        </div>
    );
}

export default StudioCameraBar;
