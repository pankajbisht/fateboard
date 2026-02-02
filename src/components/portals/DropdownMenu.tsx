import { useEffect, useRef, useState } from 'react';
import { IconButton } from '../atoms/IconButton';
import { useStore } from '@/store';

export const DropdownMenuItem = ({
    children,
    onClick,
    position = 'middle', // "top" | "middle" | "bottom"
}) => {
    const roundedClass =
        position === 'top'
            ? 'hover:rounded-t-lg'
            : position === 'bottom'
              ? 'hover:rounded-b-lg'
              : '';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-stone-200 hover:text-stone-900
        ${roundedClass}`}
        >
            {children}
        </button>
    );
};

const DropdownMenu = ({ trigger, children }) => {
    const iconSize = useStore((state) => state.iconSize);

    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block" ref={ref}>
            {/*<button onClick={() => setOpen(!open)}>{trigger}</button>*/}

            <IconButton
                icon={trigger}
                onClick={() => setOpen(!open)}
                title="Menu"
                size={iconSize}
            />

            {open && (
                <div className="z-1000 absolute right-0 mt-2 w-40 rounded-lg bg-white shadow-lg ring-1 ring-black/10 bg-white text-gray-500">
                    {children}
                </div>
            )}
        </div>
    );
};

export default DropdownMenu;
