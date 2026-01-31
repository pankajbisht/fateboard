import React, { useState } from 'react';
import { Dropdown } from '../atoms/Dropdown';
import { useStore } from '../../store';
import { booleanOperationConfig } from '../config/booleanoperation.config';

export const BooleanOperationsDropdown = () => {
    const [value, setValue] = useState(''); // default operation
    const unionSelected = useStore((s) => s.unionSelected);
    const intersectSelected = useStore((s) => s.intersectSelected);
    const subtractSelected = useStore((s) => s.subtractSelected);
    const excludeSelected = useStore((s) => s.excludeSelected);
    const divideSelected = useStore((s) => s.divideSelected);
    const cutSelected = useStore((s) => s.cutSelected);
    const punchSelected = useStore((s) => s.punchSelected);
    const cropSelected = useStore((s) => s.cropSelected);
    const smartUnionSelected = useStore((s) => s.smartUnionSelected);
    const xorSplitSelected = useStore((s) => s.xorSplitSelected);
    const clipSelectedObject = useStore((s) => s.clipSelectedObject);

    const handleApply = (operation) => {
        switch (operation) {
            case 'union':
                unionSelected({ fill: 'green' });
                break;
            case 'intersect':
                intersectSelected({ fill: 'orange' });
                break;
            case 'subtract':
                subtractSelected({ fill: 'pink' });
                break;
            case 'exclude':
                excludeSelected({ fill: 'purple' });
                break;
            case 'divide':
                divideSelected({ fill: 'purple' });
                break;
            case 'cut':
                cutSelected({ fill: 'purple' });
                break;
            case 'punch':
                punchSelected({ fill: 'purple' });
                break;
            case 'crop':
                cropSelected({ fill: 'purple' });
                break;
            case 'smartUnion':
                smartUnionSelected({ fill: 'purple' });
                break;
            case 'xorSplit':
                xorSplitSelected({ fill: 'purple' });
                break;
            case 'clip':
                clipSelectedObject({ fill: 'purple' });
                break;
            default:
                break;
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <Dropdown
                value={value}
                options={booleanOperationConfig}
                onChange={(selected) => {
                    setValue(selected);
                    handleApply(selected);
                }}
            />
        </div>
    );
};
