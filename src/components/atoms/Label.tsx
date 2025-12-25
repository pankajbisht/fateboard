import React from 'react';

type LabelProps = { text?: React.ReactNode; className?: string };

export const Label: React.FC<LabelProps> = ({ text, className = '' }) => {
    return <h1 className={className + ' py-2'}>{text}</h1>;
};

export default Label;
