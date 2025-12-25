import clsx from 'clsx';
import { useStore } from '../../store';
import { Dropdown } from '../atoms/Dropdown';
import { STilte, Tile, WTilte } from '../molecules/Tile';
import { OpacityControl } from '../molecules/OpacityControl';
import { TransformInput } from '../molecules/TransformInput';
import { useState } from 'react';
import { SingleToggleButton } from '../molecules/SingleToggleButton';
import FlipIcon from '../../assets/icons/flip';
import { LinearGradientIcon } from '../../assets/icons/LinearGradientIcon';
import { RadialGradientIcon } from '../../assets/icons/RadialGradientIcon';
import { GradientToolIcon } from '../../assets/icons/GradientToolIcon';
import { BooleanOperationsDropdown } from './BooleanOperationsDropdown';

const SHADOW_PRESETS = {
    soft: { blur: 12, offsetX: 0, offsetY: 6, color: 'rgba(0,0,0,0.2)' },
    medium: { blur: 20, offsetX: 0, offsetY: 10, color: 'rgba(0,0,0,0.25)' },
    strong: { blur: 40, offsetX: 0, offsetY: 20, color: 'rgba(0,0,0,0.3)' },
};

const ShadowDropdown = ({ disabled }) => {
    const activeShadow = useStore((s) => s.activeObjectShadow);
    const applyShadowPreset = useStore((s) => s.applyShadowPreset);
    const removeShadow = useStore((s) => s.removeShadow);

    const value = activeShadow
        ? (Object.entries(SHADOW_PRESETS).find(
              ([, preset]) =>
                  preset.blur === activeShadow.blur &&
                  preset.offsetX === activeShadow.offsetX &&
                  preset.offsetY === activeShadow.offsetY &&
                  preset.color === activeShadow.color,
          )?.[0] ?? 'custom')
        : 'none';

    return (
        <Dropdown
            value={value}
            disabled={disabled}
            options={[
                { label: 'None', value: 'none' },
                ...Object.keys(SHADOW_PRESETS).map((key) => ({
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    value: key,
                })),
            ]}
            onChange={(val) => {
                if (val === 'none') return removeShadow();
                applyShadowPreset(val);
            }}
        />
    );
};

export function StrokeControls() {
    const {
        fill,
        stroke,
        strokeWidth,
        activePaint,
        setActivePaint,
        setStroke,
        setStrokeWidthN,
        opacity,
        setOpacity,
        hasActiveShape,
        strokeStyleList,
        strokeStyle,
        setStrokeStyle,
        addShadow,
        applyShadowPreset,
        geditor,
    } = useStore();

    const [active, setActive] = useState(false);

    const canvas = useStore((s) => s.canvas);

    const activeObject = canvas?.getActiveObject();
    const activeBlur = activeObject?.shadow?.blur;

    const isFillActive = activePaint === 'fill';
    const isStrokeActive = activePaint === 'stroke';

    const handleStrokeWidthChange = (val: number) => {
        const value = Math.max(0, Number(val) || 0);
        setStrokeWidthN(value);
    };

    const handleShadow = () => {
        addShadow({
            color: 'rgba(0,0,0,0.25)',
            blur: 18,
            offsetX: 6,
            offsetY: 6,
        });
    };

    const shadowOptions = [
        { label: 'None', value: 'none' },
        ...Object.keys(SHADOW_PRESETS).map((key) => ({
            label: key.charAt(0).toUpperCase() + key.slice(1),
            value: key,
        })),
    ];

    const value =
        Object.entries(SHADOW_PRESETS).find(([, v]) => v.blur === activeBlur)?.[0] ?? 'none';

    return (
        <div className="flex flex-row justify-center items-center gap-5 bg-white">
            {/* Fill / Stroke Tiles */}
            <div className="flex flex-col gap-2">
                <Tile
                    label="Fill"
                    hasActiveShape={hasActiveShape}
                    isTileActive={isFillActive}
                    setActiveTile={() => setActivePaint('fill')}
                    color={fill}
                />

                <Tile
                    label="Stroke"
                    hasActiveShape={hasActiveShape}
                    isTileActive={isStrokeActive}
                    setActiveTile={() => setActivePaint('stroke')}
                    color={stroke}
                />
            </div>

            {/* Border Width / Style */}
            <div className="flex gap-2 items-center">
                <TransformInput
                    disabled={!hasActiveShape}
                    label="Width"
                    value={strokeWidth}
                    onChange={handleStrokeWidthChange}
                    max="16"
                />

                <STilte
                    label="Style"
                    strokeStyleList={strokeStyleList}
                    strokeStyle={strokeStyle}
                    setStrokeStyle={setStrokeStyle}
                    disabled={!hasActiveShape}
                />
            </div>

            {/* Opacity */}
            <div className="flex gap-2 items-center">
                <OpacityControl value={opacity} onChange={setOpacity} disabled={!hasActiveShape} />
            </div>

            <div className="flex">
                <ShadowDropdown disabled={!hasActiveShape} />
            </div>

            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                <SingleToggleButton
                    action="gradient"
                    toggleType="switch"
                    iconOn={<GradientToolIcon />}
                    iconOff={<GradientToolIcon />}
                    tooltipOn="Gradient"
                    tooltipOff="Normal"
                    initial={false}
                    onChange={(formats) => {
                        if (formats.value) {
                            geditor.enable();
                        } else {
                            geditor.disable();
                        }
                    }}
                />

                <SingleToggleButton
                    action="gradienttype"
                    toggleType="switch"
                    iconOn={<LinearGradientIcon />}
                    iconOff={<RadialGradientIcon />}
                    tooltipOn="Linear Gradient"
                    tooltipOff="Radial Graient"
                    initial={false}
                    onChange={(formats) => {
                        geditor.toggleGradientType();
                    }}
                />
            </div>

            <div className="flex">
                <BooleanOperationsDropdown />
            </div>
        </div>
    );
}
