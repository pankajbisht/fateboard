import React from 'react';

type LabelProps = { label?: React.ReactNode; className?: string };

export const Label: React.FC<LabelProps> = ({ label, className = '' }) => {
    return <h1 className={className + ' py-2'}>{label}</h1>;
};

export default Label;
