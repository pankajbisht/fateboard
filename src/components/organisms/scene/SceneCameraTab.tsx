import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { VIEWS } from '@/scene/camera/views';
import { Button } from '../../atoms/Button';
import LabeledToggle from '../../molecules/LabeledToggle';
import { SliderField } from '../../molecules/LabeledSlider';
import { PanelSection } from '../../molecules/PanelSection';
import { SegmentedControl } from '../../molecules/SegmentedControl';

/** Where the camera stands and what lens it has; named views frame everyone in one click. Guides help compose. */
export function SceneCameraTab() {
    const cam = useStore((s) => s.studioScene?.camera);
    const selected = useStore((s) => s.sceneSelectedActor);
    const guides = useStore(useShallow((s) => s.sceneGuides));
    const edit = useStore((s) => s.editStudioScene);
    const toggle = useStore((s) => s.toggleSceneGuide);
    if (!cam) return null;
    const perspective = cam.lens.kind === 'perspective';
    const patch = (p: Partial<typeof cam>, key: string) => edit({ kind: 'camera', patch: p }, key);
    return (
        <div className="flex flex-col gap-4">
            <PanelSection
                title="Views"
                description="Frames everyone; over the shoulder and point of view use the selected character."
            >
                <div className="grid grid-cols-2 gap-1" role="group" aria-label="Camera views">
                    {VIEWS.all.map((v) => (
                        <Button
                            key={v.id}
                            variant="secondary"
                            size="sm"
                            onClick={() => edit({ kind: 'view', view: v.id, subject: selected })}
                        >
                            {v.name}
                        </Button>
                    ))}
                </div>
            </PanelSection>
            <PanelSection title="Camera">
                <SliderField
                    label="Turn"
                    min={0}
                    max={359}
                    step={1}
                    unit="°"
                    value={Math.round(cam.yaw)}
                    onChange={(yaw) => patch({ yaw }, 'cam-yaw')}
                />
                <SliderField
                    label="Tilt"
                    min={-60}
                    max={89}
                    step={1}
                    unit="°"
                    value={Math.round(cam.pitch)}
                    onChange={(pitch) => patch({ pitch }, 'cam-pitch')}
                />
                <SliderField
                    label="Roll"
                    min={-30}
                    max={30}
                    step={1}
                    unit="°"
                    value={Math.round(cam.roll)}
                    onChange={(roll) => patch({ roll }, 'cam-roll')}
                />
                <SliderField
                    label="Height"
                    min={5}
                    max={3000}
                    step={5}
                    unit=" cm"
                    value={Math.round(cam.position[1])}
                    onChange={(y) =>
                        patch({ position: [cam.position[0], y, cam.position[2]] }, 'cam-height')
                    }
                />
            </PanelSection>
            <PanelSection title="Lens">
                <SegmentedControl<'perspective' | 'orthographic'>
                    aria-label="Projection"
                    value={cam.lens.kind}
                    onChange={(kind) =>
                        patch(
                            {
                                lens:
                                    kind === 'perspective'
                                        ? { kind, focalMm: 35 }
                                        : { kind, heightCm: 500 },
                            },
                            'cam-lens-kind',
                        )
                    }
                    options={[
                        { value: 'perspective', label: 'Perspective' },
                        { value: 'orthographic', label: 'Flat (isometric)' },
                    ]}
                />
                {perspective ? (
                    <SliderField
                        label="Focal length"
                        hint="Short = wide and dramatic, long = flat and close"
                        min={12}
                        max={135}
                        step={1}
                        unit=" mm"
                        value={cam.lens.kind === 'perspective' ? Math.round(cam.lens.focalMm) : 35}
                        onChange={(focalMm) =>
                            patch({ lens: { kind: 'perspective', focalMm } }, 'cam-focal')
                        }
                    />
                ) : (
                    <SliderField
                        label="Frame height"
                        min={100}
                        max={5000}
                        step={10}
                        unit=" cm"
                        value={
                            cam.lens.kind === 'orthographic' ? Math.round(cam.lens.heightCm) : 500
                        }
                        onChange={(heightCm) =>
                            patch({ lens: { kind: 'orthographic', heightCm } }, 'cam-ortho')
                        }
                    />
                )}
            </PanelSection>
            <PanelSection
                title="Guides"
                description="Only in the studio; never placed on the page."
            >
                <LabeledToggle
                    label="Rule of thirds"
                    checked={guides.includes('thirds')}
                    onChange={() => toggle('thirds')}
                />
                <LabeledToggle
                    label="Horizon"
                    checked={guides.includes('horizon')}
                    onChange={() => toggle('horizon')}
                />
                <LabeledToggle
                    label="Ground grid (1 m)"
                    checked={guides.includes('grid')}
                    onChange={() => toggle('grid')}
                />
            </PanelSection>
        </div>
    );
}

export default SceneCameraTab;
