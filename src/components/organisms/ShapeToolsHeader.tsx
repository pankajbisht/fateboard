import { useStore } from '@store';
import { ToggleGroup } from '../molecules/ToggleGroup.tsx';
import OriginSelector from '../molecules/OriginSelector.tsx';
import { useState } from 'react';
import FlipIcon from '../../assets/icons/flip.tsx';
import { SingleToggleButton } from '../molecules/SingleToggleButton.tsx';
import { TransformInput } from '../molecules/TransformInput.tsx';
import SendToBack from '@/assets/icons/sendbackward.tsx';
import SendBackward from '@/assets/icons/sendbackward.tsx';
import SendForward from '@/assets/icons/bringforward.tsx';
import BringForward from '@/assets/icons/bringforward.tsx';
import { TextToolsHeader } from './TextToolsHeader.tsx';
import { GlowDivider } from './toolbars/index.ts';
import { Tooltip } from '../molecules/Tooltip.tsx';
import IconButton from '../atoms/IconButton.tsx';
import { LayerControlBar } from './toolbars/ui/bars/LayerControlBar.tsx';

const round = (val) => Math.round(val);

const transformFields = [
    { key: 'x', label: 'X' },
    { key: 'y', label: 'Y' },
    { key: 'width', label: 'W' },
    { key: 'height', label: 'H' },
    { key: 'rotation', label: 'R' },
];

const flipButtons = [
    { title: 'Flip X', icon: 'arrows-left-right', key: 'flipX' },
    { title: 'Flip Y', icon: 'arrows-up-down', key: 'flipY' },
];

const layerButtons = [
    { title: 'Group', icon: 'object-group', key: 'group' },
    { title: 'Ungroup', icon: 'object-ungroup', key: 'ungroup' },
    { divider: true },
    { title: 'Lock', icon: 'lock', key: 'lock' },
    { title: 'Unlock', icon: 'unlock', key: 'unlock' },
    { divider: true },
    { title: 'Send to Back', icon: 'arrow-down', key: 'sendtoback' },
    { title: 'Bring to Front', icon: 'arrow-up', key: 'bringtofront' },
    { divider: true },
    { title: 'Delete', icon: 'trash', key: 'delete' },
];

const alignButtons = [
    // Horizontal alignment
    { title: 'Align Left', icon: 'align-left', key: 'align-left' },
    {
        title: 'Align Center (Horizontally)',
        icon: 'align-center',
        key: 'align-hcenter',
    },
    { title: 'Align Right', icon: 'align-right', key: 'align-right' },

    // Vertical alignment
    { title: 'Align Top', icon: 'align-up', key: 'align-top' },
    {
        title: 'Align Middle (Vertically)',
        icon: 'align-middle',
        key: 'align-vcenter',
    },
    { title: 'Align Bottom', icon: 'align-down', key: 'align-bottom' },

    // Distribute horizontally / vertically
    {
        title: 'Distribute Horizontally',
        icon: 'grip-lines-horizontal',
        key: 'distribute-h',
    },
    {
        title: 'Distribute Vertically',
        icon: 'grip-lines-vertical',
        key: 'distribute-v',
    },
];

export const ShapeToolsHeader = () => {
    const [show, setShow] = useState(false);

    const transform = useStore((s) => s.transform);
    const setTransform = useStore((s) => s.setTransform);
    const groupLayers = useStore((s) => s.groupLayers);
    const ungroupSelected = useStore((s) => s.ungroupSelected);
    const bringForward = useStore((s) => s.bringForward);
    const sendBackward = useStore((s) => s.sendBackward);
    const bringToFront = useStore((s) => s.bringToFront);
    const sendToBack = useStore((s) => s.sendToBack);
    const toggleActiveObjectLock = useStore((s) => s.toggleActiveObjectLock);
    const alignObjects = useStore((s) => s.alignObjects);
    const hasSelection = useStore((s) => s.hasSelection);
    const removeLayer = useStore((s) => s.removeLayer);
    const setOrigin = useStore((s) => s.setOrigin);
    const canvas = useStore((s) => s.canvas);
    const setRadius = useStore((s) => s.setRadius);
    const [snap, setSnap] = useState(false);
    const { selectedObject } = useStore();
    const toggleGrid = useStore((s) => s.toggleGrid);

    const active = canvas?.getActiveObject();

    // console.log({ selectedObject });

    const handleButton = (key, value) => {
        if (key === 'group') {
            groupLayers();
        } else if (key === 'ungroup') {
            ungroupSelected();
        } else if (key === 'bringforward') {
            bringForward();
        } else if (key === 'sendbackward') {
            sendBackward();
        } else if (key === 'sendtoback') {
            sendToBack();
        } else if (key === 'bringtofront') {
            bringToFront();
        } else if (key === 'lock') {
            toggleActiveObjectLock();
        } else if (key === 'unlock') {
            toggleActiveObjectLock();
        } else if (key === 'delete') {
            removeLayer();
        }
    };

    const handleAlginmentAndDistributeButton = (key, value) => {
        alignObjects(key);
    };

    return (
        // <div className="px-2 py-1 overflow-x-auto bg-white">
        <div
            className={`px-2 py-1 overflow-x-auto bg-white ${
                !active ? 'pointer-events-none opacity-50' : ''
            }`}
        >
            <div className="flex items-center justify-between whitespace-nowrap text-sm">
                <div className="flex items-center gap-4">
                    <SingleToggleButton
                        action="flipX"
                        toggleType="switch"
                        iconOn={<FlipIcon className="cursor-pointer" />}
                        iconOff={<FlipIcon className="cursor-pointer" />}
                        tooltipOn="Flipped horizontally"
                        tooltipOff="Flip horizontally"
                        initial={false}
                        onChange={(formats) => {
                            const { action, value } = formats;
                            console.log(action, value);
                            setTransform(action, value);
                        }}
                    />

                    <SingleToggleButton
                        action="flipY"
                        toggleType="switch"
                        iconOn={<FlipIcon className="rotate-90 cursor-pointer" />}
                        iconOff={<FlipIcon className="rotate-90 cursor-pointer" />}
                        tooltipOn="Flipped vertically"
                        tooltipOff="Flip vertically"
                        initial={false}
                        onChange={(formats) => {
                            console.log(formats);
                            const { action, value } = formats;
                            setTransform(action, value);
                        }}
                    />

                    <GlowDivider />

                    <LayerControlBar />

                    {/*<ToggleGroup
                        single
                        options={[
                            {
                                key: 'sendbackward',
                                icon: 'fa-solid fa-angle-down',
                                tooltip: 'Send backward',
                            },
                            {
                                key: 'bringforward',
                                icon: 'fa-solid fa-angle-up',
                                tooltip: 'Bring forward',
                            },
                        ]}
                        onChange={(formats) => {
                            const { sendtoback, bringtofront } = formats;

                            const active = Object.entries(formats).find(([_, value]) => value);
                            console.log('Back:', active);

                            if (active) {
                                const [key, value] = active;
                                handleButton(key, value);
                            }
                        }}
                    />

                    <ToggleGroup
                        single
                        options={[
                            {
                                key: 'sendtoback',
                                icon: 'fa-solid fa-angles-down',
                                tooltip: 'Send to back',
                            },
                            {
                                key: 'bringtofront',
                                icon: 'fa-solid fa-angles-up',
                                tooltip: 'Bring to front',
                            },
                        ]}
                        onChange={(formats) => {
                            const { sendtoback, bringtofront } = formats;

                            const active = Object.entries(formats).find(([_, value]) => value);
                            console.log('Back:', active);

                            if (active) {
                                const [key, value] = active;
                                handleButton(key, value);
                            }
                        }}
                    />*/}

                    <GlowDivider />

                    <div className="flex items-center gap-2">
                        {transformFields.map((field) => (
                            <TransformInput
                                key={field.key}
                                label={field.label}
                                value={transform[field.key]}
                                disabled={!hasSelection}
                                onChange={(val) => setTransform(field.key, val)}
                            />
                        ))}
                    </div>

                    {/* Divider */}
                    {/*<div className="border-l h-6 border-gray-300" />*/}
                </div>

                {/* --- Right: Layer & Align --- */}
                <div className="flex items-center gap-4">
                    {/*<ToggleGroup
                        single={true}
                        options={[
                            {
                                key: 'group',
                                icon: 'fa-solid fa-object-group',
                                tooltip: 'Group',
                            },
                            {
                                key: 'ungroup',
                                icon: 'fa-solid fa-object-ungroup',
                                tooltip: 'Ungroup',
                            },
                        ]}
                        onChange={(formats) => {
                            const { group, ungroup } = formats;

                            const active = Object.entries(formats).find(([_, value]) => value);
                            console.log('Group:', active);

                            if (active) {
                                const [key, value] = active;
                                handleButton(key, value);
                            }
                        }}
                    />*/}

                    {/*<div className="border-l h-6 border-gray-300" />*/}

                    {/*<SingleToggleButton
                        action="lock"
                        toggleType="switch"
                        iconOn="fa-solid fa-lock"
                        iconOff="fa-solid fa-unlock"
                        tooltipOn="Locked"
                        tooltipOff="Unlocked"
                        initial={false}
                        onChange={(formats) => {
                            const { action, value } = formats;
                            console.log(action, value);
                            handleButton(action, value);
                        }}
                    />*/}

                    {/*<ToggleGroup
                        single
                        options={[
                            {
                                key: 'left',
                                icon: 'fa-solid fa-align-left',
                                tooltip: 'Align Left',
                            },
                            {
                                key: 'center',
                                icon: 'fa-solid fa-align-center',
                                tooltip: 'Align Center',
                            },
                            {
                                key: 'right',
                                icon: 'fa-solid fa-align-right',
                                tooltip: 'Align Right',
                            },
                        ]}
                        onChange={(formats) => {
                            console.log('align:', formats);
                            const { left, center, right, justify } = formats;
                            let textAlign = 'align-left'; // default fallback

                            if (center) textAlign = 'align-hcenter';
                            else if (right) textAlign = 'align-right';

                            handleAlginmentAndDistributeButton(textAlign, formats);
                        }}
                    />

                    <div className="border-l h-6 border-gray-300" />

                    <ToggleGroup
                        single
                        options={[
                            {
                                key: 'top',
                                icon: 'fa-solid fa-align-left rotate-90',
                                tooltip: 'Align Top',
                            },
                            {
                                key: 'middle',
                                icon: 'fa-solid fa-align-center -rotate-90',
                                tooltip: 'Align Middle',
                            },
                            {
                                key: 'bottom',
                                icon: 'fa-solid fa-align-right rotate-90',
                                tooltip: 'Align Bottom',
                            },
                        ]}
                        onChange={(formats) => {
                            console.log('align:', formats);
                            const { top, middle, bottom } = formats;
                            let textAlign = 'align-left'; // default fallback

                            if (top) textAlign = 'align-top';
                            else if (middle) textAlign = 'align-vcenter';
                            else if (bottom) textAlign = 'align-bottom';

                            handleAlginmentAndDistributeButton(textAlign, formats);
                        }}
                    />

                    <ToggleGroup
                        single
                        options={[
                            {
                                key: 'distribute-h',
                                icon: 'fa-solid fa-align-left rotate-90',
                                tooltip: 'Distribute horizontally',
                            },
                            {
                                key: 'distribute-v',
                                icon: 'fa-solid fa-align-center -rotate-90',
                                tooltip: 'Distribute vertically',
                            },
                        ]}
                        onChange={(formats) => {
                            console.log('align:', formats);
                            const { 'distribute-v': distributeV, 'distribute-h': distributeH } =
                                formats;
                            let textAlign = 'align-left'; // default fallback

                            if (distributeH) textAlign = 'distribute-h';
                            else if (distributeV) textAlign = 'distribute-v';

                            handleAlginmentAndDistributeButton(textAlign, formats);
                        }}
                    />*/}

                    {/*<GlowDivider />

                    <OriginSelector
                        size={24}
                        value={transform.id}
                        onChange={(o) => {
                            console.log(o);
                            setOrigin(o);
                        }}
                    />*/}
                </div>

                {(active?.type === 'square' || active?.type === 'rect') && (
                    <div className="flex gap-4 px-4">
                        <GlowDivider />

                        <TransformInput
                            label="Rx"
                            value={transform.rx}
                            onChange={(val) => setRadius(val, transform.ry)}
                        />
                        <TransformInput
                            label="Ry"
                            value={transform.ry}
                            onChange={(val) => setRadius(transform.rx, val)}
                        />
                    </div>
                )}

                {selectedObject && selectedObject?.type === 'textbox' && (
                    <div className="flex px-4">
                        <GlowDivider />
                        <TextToolsHeader />
                    </div>
                )}
            </div>
        </div>
    );
};
