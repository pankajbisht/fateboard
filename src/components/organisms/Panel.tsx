import clsx from 'clsx';
import { createPortal } from 'react-dom';

export function Panel({ isOpen, position, from = 'left', children }) {
    if (!position) return null;

    return createPortal(
        <aside
            style={{
                position: 'fixed',
                top: '50%', // vertically center
                left: `${position.left}px`,
            }}
            className={clsx(
                'bg-stone-100 border border-stone-200 rounded-md shadow-lg w-70 p-4 z-50 transform -translate-y-1/2 transition-all duration-300 ease-out',
                isOpen
                    ? 'opacity-100 translate-x-0 pointer-events-auto'
                    : from === 'left'
                      ? '-translate-x-4 opacity-0 pointer-events-none'
                      : 'translate-x-4 opacity-0 pointer-events-none',
            )}
        >
            {children}
        </aside>,
        document.body,
    );
}
