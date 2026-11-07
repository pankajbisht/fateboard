import type { IconName } from '@/components/atoms/Icon';
export type PresetCategory = 'Video' | 'Social Media' | 'Print' | 'Presentation';

export type CanvasPreset = {
    id: string;
    label: string;
    category: PresetCategory | 'Custom';
    width: number;
    height: number;
    icon: IconName;
};

export type CanvasSizePanelProps = {
    selectedPreset: CanvasPreset;
    onSelectPreset: (preset: CanvasPreset) => void;
};
