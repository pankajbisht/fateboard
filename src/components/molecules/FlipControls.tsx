import React, { useState } from 'react';
import ToolToggle from './NewTog';

const flipOptions = [
    {
        key: 'flipX',
        icon: 'fa-solid fa-arrows-left-right',
        tooltip: 'Flip horizontally',
    },
    {
        key: 'flipY',
        icon: 'fa-solid fa-arrows-up-down',
        tooltip: 'Flip vertically',
    },
];

function FlipControls({ canvas }) {
    const [flipState, setFlipState] = useState({
        flipX: false,
        flipY: false,
    });

    const handleChange = (state) => {
        const obj = canvas.getActiveObject();
        if (!obj) return;

        setFlipState(state);

        obj.set({
            flipX: !!state.flipX,
            flipY: !!state.flipY,
        });

        canvas.requestRenderAll();
    };

    return (
        <div style={{ display: 'flex', gap: 6 }}>
            <ToolToggle options={flipOptions} size={24} onChange={handleChange} />
        </div>
    );
}
