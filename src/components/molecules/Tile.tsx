import clsx from 'clsx';
import { Dropdown } from '../atoms/Dropdown';

/** Footer "Fill [toggle] [color]" row. `after` renders right after the label (the add / remove toggle). */
export const Tile = ({
    label,
    hasActiveShape,
    isTileActive,
    setActiveTile,
    color,
    after = null,
}) => {
    return (
        <div data-tile-row className="flex items-center h-4">
            <label className="text-[11px] font-medium text-ink-muted w-10 leading-none select-none">
                {label}
            </label>
            {after}

            {hasActiveShape ? (
                <div
                    onClick={() => setActiveTile('fill')}
                    title="Edit fill color"
                    className={clsx(
                        'ml-2 h-4 w-10 rounded border cursor-pointer',
                        isTileActive
                            ? 'ring-1 ring-primary-500 border-primary-500'
                            : 'border-line-strong hover:border-line-strong',
                    )}
                    style={{ backgroundColor: color }}
                />
            ) : (
                <span className="ml-2 w-8 text-center text-[10px] text-ink-subtle">N/A</span>
            )}
        </div>
    );
};

export const STilte = ({ label, strokeStyleList, strokeStyle, setStrokeStyle, disabled }) => {
    return (
        <div className="flex items-center justify-center h-8 gap-2">
            <span className="text-[11px] font-medium text-ink-muted leading-none select-none">
                {label}
            </span>
            <Dropdown
                disabled={disabled}
                options={strokeStyleList}
                value={strokeStyle}
                onChange={setStrokeStyle}
            />
        </div>
    );
};
