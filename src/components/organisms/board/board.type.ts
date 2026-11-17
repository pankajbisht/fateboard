import type { IconName } from '@/components/atoms/Icon';
import type { PageMargins } from '@/lib/document/pageSetup';

export type PresetCategory =
    | 'Video'
    | 'Social Media'
    | 'Print'
    | 'Presentation'
    | 'Manga & comics'
    | 'Webtoon'
    | 'Digital art';

export type CanvasPreset = {
    id: string;
    label: string;
    category: PresetCategory | 'Custom';
    width: number;
    height: number;
    icon: IconName;
    /** Page setup a board at this size starts with (manga / comic: bleed + safe-area margins), page px. */
    pageSetup?: { bleed: number; margins: PageMargins };
};
