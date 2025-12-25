import React from 'react';

export const Icon: React.FC<{ className?: string }> = ({ className = '' }) => (
    <i className={'fa-solid fa-list-check ' + className} />
);

export default Icon;
