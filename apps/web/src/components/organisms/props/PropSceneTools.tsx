import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { PROP_SCENES } from '@/props/scenes';
import type { PropLight } from '@/props/types';
import Button from '../../atoms/Button';
import LabeledToggle from '../../molecules/LabeledToggle';
import { SliderField } from '../../molecules/LabeledSlider';
import { PanelSection } from '../../molecules/PanelSection';
import { SegmentedControl } from '../../molecules/SegmentedControl';

type Listener = {
    on: (e: string, h: () => void) => () => void;
    getObjects: () => { propData?: { light?: unknown } }[];
};

const LIGHTS: { value: PropLight; label: string }[] = [
    { value: 'day', label: 'Day' },
    { value: 'sunset', label: 'Sunset' },
    { value: 'night', label: 'Night' },
];

/** The page's time of day, as its props show it (follows adds, removals, edits and page switches). */
function usePageLight(): PropLight {
    const canvas = useStore((s) => s.canvas) as unknown as Listener | null;
    const [light, setLight] = useState<PropLight>('day');
    useEffect(() => {
        if (!canvas) return;
        const read = () => {
            const lit = canvas.getObjects().find((o) => o.propData)?.propData?.light;
            setLight(lit === 'sunset' || lit === 'night' ? lit : 'day');
        };
        read();
        const events = ['object:added', 'object:removed', 'object:modified', 'canvas:cleared'];
        const offs = events.map((e) => canvas.on(e, read));
        return () => offs.forEach((off) => off());
    }, [canvas]);
    return light;
}

/** Scene presets, time of day and the ground line (docs/PROPS.md phase 4). */
export function PropSceneTools() {
    const s = useStore(
        useShallow((st) => ({
            applyScene: st.applyPropScene,
            setTime: st.setPropTimeOfDay,
            snap: st.propGroundSnap,
            line: st.propGroundLine,
            setSnap: st.setPropGroundSnap,
            setLine: st.setPropGroundLine,
        })),
    );
    const light = usePageLight();
    const [line, setLine] = useState<number | null>(null);
    return (
        <PanelSection
            title="Scenes"
            description="One click places a whole scene on Background, Midground and Foreground layers."
        >
            <div className="grid grid-cols-2 gap-1.5">
                {PROP_SCENES.map((scene) => (
                    <Button
                        key={scene.id}
                        variant="secondary"
                        size="sm"
                        aria-label={`${scene.label} scene`}
                        onClick={() => void s.applyScene(scene.id)}
                    >
                        {scene.label}
                    </Button>
                ))}
            </div>
            <SegmentedControl
                aria-label="Time of day"
                value={light}
                onChange={(v) => void s.setTime(v)}
                options={LIGHTS}
            />
            <LabeledToggle
                label="Snap to ground line"
                checked={s.snap}
                onChange={s.setSnap}
                hint="Props dragged near the line stand on it."
            />
            {s.snap && (
                <SliderField
                    label="Ground line"
                    min={50}
                    max={100}
                    step={1}
                    unit="%"
                    value={Math.round((line ?? s.line) * 100)}
                    onChange={(v) => setLine(v / 100)}
                    onCommit={(v) => {
                        setLine(null);
                        s.setLine(v / 100);
                    }}
                />
            )}
        </PanelSection>
    );
}
