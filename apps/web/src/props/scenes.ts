/**
 * Scene presets (docs/PROPS.md phase 4): one click lays out a place on three depth planes, each its own page
 * layer (Background, Midground, Foreground). Positions are fractions of the page: `x` = the prop's centre,
 * `bottom` = where it stands, `h` = its height. A `cover` prop (a backdrop) fills the page.
 */
export type PropPlane = 'background' | 'midground' | 'foreground';

export interface PropSceneItem {
    plane: PropPlane;
    propId: string;
    x: number;
    bottom: number;
    h: number;
    variant?: number;
    flip?: boolean;
    cover?: boolean;
}

export interface PropScene {
    id: string;
    label: string;
    items: readonly PropSceneItem[];
}

const cover = (propId: string): PropSceneItem => ({
    plane: 'background',
    propId,
    x: 0.5,
    bottom: 1,
    h: 1,
    cover: true,
});

export const PROP_SCENES: readonly PropScene[] = [
    {
        id: 'classroom',
        label: 'Classroom',
        items: [
            cover('classroom-wall'),
            { plane: 'background', propId: 'wall-speaker', x: 0.69, bottom: 0.24, h: 0.1 },
            { plane: 'midground', propId: 'lectern', x: 0.42, bottom: 0.82, h: 0.3 },
            { plane: 'midground', propId: 'school-desk', x: 0.16, bottom: 0.84, h: 0.28 },
            { plane: 'midground', propId: 'school-desk', x: 0.72, bottom: 0.84, h: 0.28 },
            { plane: 'foreground', propId: 'school-desk', x: 0.3, bottom: 1.04, h: 0.48 },
            { plane: 'foreground', propId: 'school-bag', x: 0.84, bottom: 0.98, h: 0.16 },
        ],
    },
    {
        id: 'rooftop',
        label: 'Rooftop',
        items: [
            cover('rooftop'),
            { plane: 'background', propId: 'cloud-long', x: 0.7, bottom: 0.3, h: 0.12 },
            { plane: 'midground', propId: 'bench', x: 0.32, bottom: 0.86, h: 0.2 },
            { plane: 'midground', propId: 'vending-machine', x: 0.86, bottom: 0.86, h: 0.42 },
            { plane: 'foreground', propId: 'bento', x: 0.24, bottom: 0.98, h: 0.12 },
            { plane: 'foreground', propId: 'school-bag', x: 0.56, bottom: 1, h: 0.14 },
        ],
    },
    {
        id: 'forest',
        label: 'Forest',
        items: [
            cover('sky-day'),
            { plane: 'background', propId: 'mountain-range', x: 0.5, bottom: 0.7, h: 0.36 },
            { plane: 'midground', propId: 'tree-pine', x: 0.14, bottom: 0.86, h: 0.6 },
            { plane: 'midground', propId: 'tree-round', x: 0.44, bottom: 0.84, h: 0.5, variant: 1 },
            { plane: 'midground', propId: 'tree-pine', x: 0.8, bottom: 0.86, h: 0.56, variant: 1 },
            { plane: 'foreground', propId: 'tall-grass', x: 0.2, bottom: 1, h: 0.2 },
            { plane: 'foreground', propId: 'bush', x: 0.62, bottom: 1, h: 0.18 },
            { plane: 'foreground', propId: 'rock', x: 0.9, bottom: 1, h: 0.12 },
        ],
    },
    {
        id: 'street',
        label: 'Street',
        items: [
            cover('street-view'),
            { plane: 'midground', propId: 'street-lamp', x: 0.1, bottom: 0.92, h: 0.62 },
            { plane: 'midground', propId: 'vending-machine', x: 0.84, bottom: 0.88, h: 0.38 },
            { plane: 'midground', propId: 'post-box', x: 0.66, bottom: 0.88, h: 0.22 },
            { plane: 'foreground', propId: 'bicycle', x: 0.36, bottom: 1, h: 0.22 },
            { plane: 'foreground', propId: 'traffic-cone', x: 0.9, bottom: 1, h: 0.12 },
        ],
    },
];

export const getPropScene = (id: string) => PROP_SCENES.find((s) => s.id === id);
