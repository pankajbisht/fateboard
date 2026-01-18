import FlipIcon from '@/assets/icons/flip';
import { shortcut } from '@/lib/utils/isMac';
import { useStore } from '@/store';

{
    /*<SingleToggleButton
    action="flipX"
    toggleType="switch"
    iconOn={<FlipIcon className="cursor-pointer" />}
    iconOff={<FlipIcon className="cursor-pointer" />}

    // iconOff={<FlipIcon className="cursor-pointer" />}
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
/>*/
}

export const FlipBarConfig = [
    {
        id: 'flipx',
        label: 'flipX',
        name: 'flipX',
        description: 'flipX',
        // shortcut: shortcut('⌘L', 'Ctrl+L'),
        icon: <FlipIcon className="cursor-pointer" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => {
            const { flipX } = useStore.getState().transform;
            useStore.getState().setTransform('flipX', !flipX);
        },
    },
    {
        id: 'flipy',
        label: 'Flip Y',
        name: 'Flip Y',
        description: 'Flip Y',
        icon: <FlipIcon className="rotate-90 cursor-pointer" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => {
            const { flipY } = useStore.getState().transform;
            useStore.getState().setTransform('flipY', !flipY);
        },
    },
];
