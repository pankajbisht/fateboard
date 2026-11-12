import { Icon } from '@/components/atoms/Icon';
import { useStore } from '@/store';
import { arrangeWhen } from './arrangeWhen';

export const AlignmentBarConfig = [
    {
        id: 'align-left',
        label: 'Align Left',
        name: 'Align Left',
        description: 'Align Left',
        icon: <Icon name="align-objects-left" />,
        rule: 'align' as const,
        when: arrangeWhen('align'),
        onClick: () => useStore.getState().alignObjects('align-left'),
        handler: ({ get }) => {
            get().alignObjects('align-left');
        },
    },
    {
        id: 'align-center',
        label: 'Align Center',
        name: 'Align Center',
        description: 'Align Center',
        icon: <Icon name="align-objects-center" />,
        rule: 'align' as const,
        when: arrangeWhen('align'),
        onClick: () => useStore.getState().alignObjects('align-hcenter'),
        handler: ({ get }) => {
            get().alignObjects('align-hcenter');
        },
    },
    {
        id: 'align-right',
        label: 'Align Right',
        name: 'Align Right',
        description: 'Align Right',
        icon: <Icon name="align-objects-right" />,
        rule: 'align' as const,
        when: arrangeWhen('align'),
        onClick: () => useStore.getState().alignObjects('align-right'),
        handler: ({ get }) => {
            get().alignObjects('align-right');
        },
    },
    {
        id: 'align-top',
        label: 'Align Top',
        name: 'Align Top',
        description: 'Align Top',
        icon: <Icon name="align-objects-top" />,
        rule: 'align' as const,
        when: arrangeWhen('align'),
        onClick: () => useStore.getState().alignObjects('align-top'),
        handler: ({ get }) => {
            get().alignObjects('align-top');
        },
    },
    {
        id: 'align-middle',
        label: 'Align Middle',
        name: 'Align Middle',
        description: 'Align Middle',
        icon: <Icon name="align-objects-middle" />,
        rule: 'align' as const,
        when: arrangeWhen('align'),
        onClick: () => useStore.getState().alignObjects('align-vcenter'),
        handler: ({ get }) => {
            get().alignObjects('align-vcenter');
        },
    },
    {
        id: 'align-bottom',
        label: 'Align Bottom',
        name: 'Align Bottom',
        description: 'Align Bottom',
        icon: <Icon name="align-objects-bottom" />,
        rule: 'align' as const,
        when: arrangeWhen('align'),
        onClick: () => useStore.getState().alignObjects('align-bottom'),
        handler: ({ get }) => {
            get().alignObjects('align-bottom');
        },
    },
    {
        id: 'distribute-horizontal',
        label: 'Distribute Horizontally',
        name: 'Distribute Horizontally',
        description: 'Distribute Horizontally',
        icon: <Icon name="distribute-horizontal" />,
        rule: 'distribute' as const,
        when: arrangeWhen('distribute'),
        onClick: () => useStore.getState().alignObjects('distribute-h'),
        handler: ({ get }) => {
            get().alignObjects('distribute-h');
        },
    },
    {
        id: 'distribute-vertical',
        label: 'Distribute Vertically',
        name: 'Distribute Vertically',
        description: 'Distribute Vertically',
        icon: <Icon name="distribute-vertical" />,
        rule: 'distribute' as const,
        when: arrangeWhen('distribute'),
        onClick: () => useStore.getState().alignObjects('distribute-v'),
        handler: ({ get }) => {
            get().alignObjects('distribute-v');
        },
    },
];
