import React from 'react';
import clsx from 'clsx';

type ImgProps = {
    src: string;
    height?: number | string;
    alt?: string;
    className?: string;
};

export const Img: React.FC<ImgProps> = ({ src, height, alt = '', className = '' }) => {
    const hClass = typeof height === 'number' ? `h-${height}` : height || undefined;
    return <img src={src} alt={alt} className={clsx(hClass, className)} />;
};

export default Img;
