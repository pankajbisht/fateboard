import type { IconName } from '@/components/atoms/Icon';
export const EFFECTS = [
    {
        id: 'tiling',
        label: 'Tiling',
        icon: 'grip',
    },
    {
        id: 'rotate',
        label: 'Rotate',
        icon: 'rotate',
    },
    {
        id: 'along-path',
        label: 'Along Path',
        icon: 'bezier-curve',
    },
] as const satisfies readonly { id: string; label: string; icon: IconName }[];
