import type { ReactNode, ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: ReactNode;
    active?: boolean;
    className?: string;
}

const buttonSizeMap = {
    sm: 'h-7 w-7 p-1',
    md: 'h-8 w-8 p-2',
    lg: 'h-8 w-8 p-2.5',
};

const iconSizeMap = {
    sm: 'text-[12px] [&>svg]:h-3 [&>svg]:w-3 [&>img]:h-3 [&>img]:w-3',
    md: 'text-[14px] [&>svg]:h-4 [&>svg]:w-4 [&>img]:h-4 [&>img]:w-4',
    lg: 'text-[16px] [&>svg]:h-5 [&>svg]:w-5 [&>img]:h-5 [&>img]:w-5',
};

export function IconButton({
    icon,
    active,
    size = 'md',
    className,
    ...rest
}: IconButtonProps & { size?: IconButtonSize }) {
    console.log(active);
    return (
        <button
            {...rest}
            className={clsx(
                'border border-stone-200 flex items-center justify-center cursor-pointer transition rounded-sm',
                buttonSizeMap[size],
                iconSizeMap[size],
                active ? 'bg-blue-500 text-white hover:bg-blue-600' : 'hover:bg-stone-200',
                className,
            )}
        >
            {icon}
        </button>
    );
}

export default IconButton;
