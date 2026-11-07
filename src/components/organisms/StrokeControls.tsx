import clsx from 'clsx';
import { useStore } from '../../store';
import { STilte, Tile } from '../molecules/Tile';
import { TransformInput } from '../molecules/TransformInput';
import { BooleanOperationsDropdown } from './BooleanOperationsDropdown';
import { PaintToggle } from './PaintToggle';
import { useState } from 'react';
// import { CanvasWorkspace } from './CanvasWorkspace';

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
    const canvas = useStore((s) => s.canvas);
    const setSelectedPreset = useStore((s) => s.setSelectedPreset);

    const activeObject = canvas?.getActiveObject();
    const isFillActive = activePaint === 'fill';
    const isStrokeActive = activePaint === 'stroke';

    const handleStrokeWidthChange = (val: number) => {
        const value = Math.max(0, Number(val) || 0);
        setStrokeWidthN(value);
    };

    return (
        <div className="flex w-full min-w-0 items-center justify-between gap-2">
            <div
                data-dimmed={!activeObject || undefined}
                className={clsx(
                    // wraps to a second line instead of being cut off (narrow window / large icons)
                    'flex min-w-0 flex-row flex-wrap items-center gap-x-5 gap-y-1 bg-surface',
                    !activeObject && 'pointer-events-none opacity-50 dark:opacity-65',
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
                        after={<PaintToggle paint="fill" />}
                    />

                    <Tile
                        label="Stroke"
                        hasActiveShape={hasActiveShape}
                        isTileActive={isStrokeActive}
                        setActiveTile={() => setActivePaint('stroke')}
                        color={stroke}
                        after={<PaintToggle paint="stroke" />}
                    />
                </div>

                {/* Border Width / Style */}
                <div className="flex gap-2 items-center">
                    <TransformInput
                        disabled={!hasActiveShape}
                        label="Width"
                        ariaLabel="Stroke width"
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

                <div className="flex">
                    <BooleanOperationsDropdown />
                </div>
            </div>
        </div>
    );
}
