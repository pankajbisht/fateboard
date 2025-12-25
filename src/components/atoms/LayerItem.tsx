import React from 'react';
import clsx from 'clsx';

type LayerItemProps = {
    layer: any;
    onToggleVisibility: (l: any) => void;
    onToggleLock: (l: any) => void;
    onBringForward: (l: any) => void;
    onSendBackward: (l: any) => void;
    className?: string;
};

const LayerItem: React.FC<LayerItemProps> = ({
    layer,
    onToggleVisibility,
    onToggleLock,
    onBringForward,
    onSendBackward,
    className = '',
}) => {
    return (
        <div className={clsx('flex justify-between items-center p-1 border-b', className)}>
            <span className="text-sm">
                {layer.type} {typeof layer.id === 'number' ? layer.id + 1 : ''}
            </span>
            <div className="flex gap-2">
                <button onClick={() => onToggleVisibility(layer)} aria-label="toggle visibility">
                    {layer.visible ? '👁️' : '🚫'}
                </button>
                <button onClick={() => onToggleLock(layer)} aria-label="toggle lock">
                    {layer.locked ? '🔒' : '🔓'}
                </button>
                <button onClick={() => onBringForward(layer)} aria-label="bring forward">
                    ⬆️
                </button>
                <button onClick={() => onSendBackward(layer)} aria-label="send backward">
                    ⬇️
                </button>
            </div>
        </div>
    );
};

export default LayerItem;
