import clsx from 'clsx';
import { useStore } from '../../store';
import { STilte, Tile } from '../molecules/Tile';
import { OpacityControl } from '../molecules/OpacityControl';
import { TransformInput } from '../molecules/TransformInput';
import { SingleToggleButton } from '../molecules/SingleToggleButton';
import { LinearGradientIcon } from '../../assets/icons/LinearGradientIcon';
import { RadialGradientIcon } from '../../assets/icons/RadialGradientIcon';
import { GradientToolIcon } from '../../assets/icons/GradientToolIcon';
import { BooleanOperationsDropdown } from './BooleanOperationsDropdown';
import ShadowDropdown from '../molecules/ShadowDropdown';

export function StrokeControls() {
    const activePaint = useStore((s) => s.activePaint);
    const setStrokeWidthN = useStore((s) => s.setStrokeWidthN);
    const hasActiveShape = useStore((s) => s.hasActiveShape);
    const setActivePaint = useStore((s) => s.setActivePaint);
    const fill = useStore((s) => s.fill);
    const stroke = useStore((s) => s.stroke);
    const strokeWidth = useStore((s) => s.strokeWidth);
    const strokeStyleList = useStore((s) => s.strokeStyleList);
    const strokeStyle = useStore((s) => s.strokeStyle);
    const setStrokeStyle = useStore((s) => s.setStrokeStyle);
    const opacity = useStore((s) => s.opacity);
    const setOpacity = useStore((s) => s.setOpacity);
    const geditor = useStore((s) => s.geditor);
    const canvas = useStore((s) => s.canvas);

    const activeObject = canvas?.getActiveObject();
    const isFillActive = activePaint === 'fill';
    const isStrokeActive = activePaint === 'stroke';

    const handleStrokeWidthChange = (val: number) => {
        const value = Math.max(0, Number(val) || 0);
        setStrokeWidthN(value);
    };

    return (
        <div
            className={clsx(
                'flex flex-row justify-center items-center gap-5 bg-white',
                !activeObject && 'pointer-events-none opacity-50',
            )}
        >
            {/* Fill / Stroke Tiles */}
            <div className="flex flex-col gap-x-2 gap-y-1">
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
