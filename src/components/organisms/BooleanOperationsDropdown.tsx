import React, { useState } from 'react';
import { Dropdown } from '../atoms/Dropdown';
import { useStore } from '../../store';

const options = [
    { label: 'Select Operation', value: '' },
    { label: 'Union', value: 'union' },
    { label: 'Intersect', value: 'intersect' },
    { label: 'Subtract', value: 'subtract' },
    { label: 'Exclude', value: 'exclude' },
    { label: 'Divide', value: 'divide' },
    { label: 'Cut', value: 'cut' },
    { label: 'Punch', value: 'punch' },
    { label: 'Crop', value: 'crop' },
    { label: 'Smart Union', value: 'smartUnion' },
    { label: 'Xor Split', value: 'xorSplit' },
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
            case 'divide':
                store.divideSelected({ fill: 'purple' });
                break;
            case 'cut':
                store.cutSelected({ fill: 'purple' });
                break;
            case 'punch':
                store.punchSelected({ fill: 'purple' });
                break;
            case 'crop':
                store.cropSelected({ fill: 'purple' });
                break;
            case 'smartUnion':
                store.smartUnionSelected({ fill: 'purple' });
                break;
            case 'xorSplit':
                store.xorSplitSelected({ fill: 'purple' });
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
