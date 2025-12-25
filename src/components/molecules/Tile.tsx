import clsx from 'clsx';
import { Dropdown } from '../atoms/Dropdown';

export const Tile = ({ label, hasActiveShape, isTileActive, setActiveTile, color }) => {
    return (
        <div className="flex items-center h-4">
            <label className="text-[11px] font-medium text-gray-500 w-10 leading-none select-none">
                {label}
            </label>

            {hasActiveShape ? (
                <div
                    onClick={() => setActiveTile('fill')}
                    title="Edit fill color"
                    className={clsx(
                        'ml-2 h-4 w-10 rounded border cursor-pointer',
                        isTileActive
                            ? 'ring-1 ring-blue-500 border-blue-500'
                            : 'border-gray-300 hover:border-gray-400',
                    )}
                    style={{ backgroundColor: color }}
                />
            ) : (
                <span className="ml-2 w-8 text-center text-[10px] text-gray-400">N/A</span>
            )}
        </div>
    );
};

export const WTilte = ({ label, strokeWidth, handleStrokeWidthChange, disabled }) => {
    return (
        <div className="flex items-center h-8 gap-2">
            <span className="text-[11px] font-medium text-gray-500 leading-none select-none">
                Width
            </span>
            <input
                type="number"
                min="0"
                step="1"
                value={strokeWidth}
                onChange={handleStrokeWidthChange}
                disabled={disabled}
                className="h-6 w-14 px-1 text-[11px] text-gray-700
                   border border-gray-300 rounded-sm
                   focus:outline-none focus:ring-1 focus:ring-blue-500
                   hover:border-gray-400"
            />
        </div>
    );
};

export const STilte = ({ label, strokeStyleList, strokeStyle, setStrokeStyle, disabled }) => {
    return (
        <div className="flex items-center justify-center h-8 gap-2">
            <span className="text-[11px] font-medium text-gray-500 leading-none select-none">
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
