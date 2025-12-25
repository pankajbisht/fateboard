import React, { useState } from 'react';
import { Dropdown } from '../atoms/Dropdown';
import { useStore } from '../../store';

const options = [
    { label: 'Select Operation', value: '' },
    { label: 'Union', value: 'union' },
    { label: 'Intersect', value: 'intersect' },
    { label: 'Subtract', value: 'subtract' },
    { label: 'Exclude', value: 'exclude' },
];

export const BooleanOperationsDropdown = () => {
    const [value, setValue] = useState(''); // default operation
    const store = useStore();

    const handleApply = (operation) => {
        switch (operation) {
            case 'union':
                store.unionSelected({ fill: 'green' });
                break;
            case 'intersect':
                store.intersectSelected({ fill: 'orange' });
                break;
            case 'subtract':
                store.subtractSelected({ fill: 'pink' });
                break;
            case 'exclude':
                store.excludeSelected({ fill: 'purple' });
                break;
            default:
                break;
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <Dropdown
                value={value}
                options={options}
                onChange={(selected) => {
                    setValue(selected);
                    handleApply(selected);
                }}
            />
        </div>
    );
};
