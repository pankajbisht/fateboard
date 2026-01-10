import { TransformInput } from '@/components/molecules/TransformInput';
import { EffectSection } from './EffectSection';
import { useStore } from '@/store';
import { useState } from 'react';

export const RepeatRadially = () => {
    const { canvas, repeatRadially } = useStore();
    const activeObject = canvas?.getActiveObject();

    const [count, setCount] = useState(6);
    const [gap, setGap] = useState(0);
    const [mode, setMode] = useState<'ring' | 'spiral'>('ring');
    const [startAngle, setStartAngle] = useState(0);
    const [clockwise, setClockwise] = useState(true);
    const [scaleStep, setScaleStep] = useState(0);
    const [rotateAlongPath, setRotateAlongPath] = useState(false);
    const [opacityFade, setOpacityFade] = useState(false);
    const [jitter, setJitter] = useState(0);
    const [anchor, setAnchor] = useState('CC');

    const getPivotFromAnchor = (obj, anchor) => {
        const rect = obj.getBoundingRect(true, true);
        const map = {
            TL: { x: rect.left, y: rect.top },
            TC: { x: rect.left + rect.width / 2, y: rect.top },
            TR: { x: rect.left + rect.width, y: rect.top },
            CL: { x: rect.left, y: rect.top + rect.height / 2 },
            CC: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
            CR: { x: rect.left + rect.width, y: rect.top + rect.height / 2 },
            BL: { x: rect.left, y: rect.top + rect.height },
            BC: { x: rect.left + rect.width / 2, y: rect.top + rect.height },
            BR: { x: rect.left + rect.width, y: rect.top + rect.height },
        };
        return map[anchor] ?? map.CC;
    };

    if (!activeObject) return null;

    const pivot = getPivotFromAnchor(activeObject, anchor);

    return (
        <EffectSection
            title="Repeat Radially"
            disabled={!activeObject}
            onApply={() =>
                repeatRadially(activeObject, {
                    count,
                    pivotX: pivot.x,
                    pivotY: pivot.y,
                    gap,
                    mode,
                    startAngle,
                    clockwise,
                    scaleStep,
                    rotateAlongPath,
                    opacityFade,
                    jitter,
                })
            }
        >
            <TransformInput
                label="Count"
                value={count}
                onChange={(v) => setCount(parseInt(v) || 2)}
            />
            <TransformInput label="Gap" value={gap} onChange={(v) => setGap(parseInt(v) || 0)} />
            <TransformInput
                label="Start Angle"
                value={startAngle}
                onChange={(v) => setStartAngle(parseInt(v) || 0)}
            />
            <TransformInput
                label="Scale Step"
                value={scaleStep}
                onChange={(v) => setScaleStep(parseFloat(v) || 0)}
            />
            <TransformInput
                label="Jitter"
                value={jitter}
                onChange={(v) => setJitter(parseFloat(v) || 0)}
            />

            <div className="flex flex-col gap-2 mt-2">
                <label>
                    Mode:
                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as 'ring' | 'spiral')}
                    >
                        <option value="ring">Ring</option>
                        <option value="spiral">Spiral</option>
                    </select>
                </label>

                <label>
                    Clockwise:
                    <input
                        type="checkbox"
                        checked={clockwise}
                        onChange={(e) => setClockwise(e.target.checked)}
                    />
                </label>

                <label>
                    Rotate Along Path:
                    <input
                        type="checkbox"
                        checked={rotateAlongPath}
                        onChange={(e) => setRotateAlongPath(e.target.checked)}
                    />
                </label>

                <label>
                    Opacity Fade:
                    <input
                        type="checkbox"
                        checked={opacityFade}
                        onChange={(e) => setOpacityFade(e.target.checked)}
                    />
                </label>
            </div>

            <select
                value={anchor}
                onChange={(e) => setAnchor(e.target.value)}
                className="w-full mt-2"
            >
                {['TL', 'TC', 'TR', 'CL', 'CC', 'CR', 'BL', 'BC', 'BR'].map((p) => (
                    <option key={p} value={p}>
                        {p}
                    </option>
                ))}
            </select>
        </EffectSection>
    );
};
