import { Icon } from '@/components/atoms/Icon';
import { useStore } from '@/store';

export const FlipBarConfig = [
    {
        id: 'flipx',
        label: 'Flip horizontal',
        name: 'Flip horizontal',
        description: 'Mirror left / right (the anchor point stays put)',
        icon: <Icon name="flip-horizontal" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().flipX(),
    },
    {
        id: 'flipy',
        label: 'Flip vertical',
        name: 'Flip vertical',
        description: 'Mirror top / bottom (the anchor point stays put)',
        icon: <Icon name="flip-vertical" />,
        when: () => useStore.getState().hasSelection,
        onClick: () => useStore.getState().flipY(),
    },
];
