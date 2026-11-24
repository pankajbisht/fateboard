/**
 * Landing page gallery: pieces made from what the editor draws (shapes, pen paths, gradients,
 * text, connectors). Each artwork is a static SVG in `public/gallery/<id>.svg` (480 × 360) that
 * uses only elements Fabric imports, so `mod+O` can load it as editable objects
 * (`galleryData.test.ts` parses every file with Fabric). Its `<g id="step-N">` groups are the build
 * steps the tutorial page (`/gallery/<id>`) replays. Pure data, no imports: the SEO route list
 * (Node, build time) reads it too.
 */

export type GalleryCategory = 'cartoon' | 'manga' | 'scenery' | 'flow' | 'design';

export interface GalleryItem {
    id: string;
    title: string;
    category: GalleryCategory;
    description: string;
    /** Editor tools the piece is built with (shown as tags). */
    tools: string[];
}

export const GALLERY_CATEGORIES: { id: GalleryCategory; label: string }[] = [
    { id: 'cartoon', label: 'Cartoon' },
    { id: 'manga', label: 'Manga' },
    { id: 'scenery', label: 'Scenery' },
    { id: 'flow', label: 'Flow diagrams' },
    { id: 'design', label: 'Design' },
];

export const CATEGORY_LABEL = Object.fromEntries(
    GALLERY_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<GalleryCategory, string>;

export const galleryImage = (item: GalleryItem) => `/gallery/${item.id}.svg`;
/** The piece's tutorial page (one prerendered route per piece, `src/app/seo/routes.ts`). */
export const galleryPath = (item: GalleryItem) => `/gallery/${item.id}`;

export const GALLERY_ITEMS: GalleryItem[] = [
    {
        id: 'cartoon-astronaut',
        title: 'Rookie Astronaut',
        category: 'cartoon',
        description: 'A first moonwalk, planted flag and all. Rounded shapes, a gradient visor.',
        tools: ['Shapes', 'Pen', 'Gradients'],
    },
    {
        id: 'cartoon-barista-cat',
        title: 'Grumpy Barista',
        category: 'cartoon',
        description: 'Mochi pours a perfect latte and refuses to smile about it.',
        tools: ['Pen', 'Shapes', 'Text'],
    },
    {
        id: 'cartoon-robo-courier',
        title: 'Robo Courier',
        category: 'cartoon',
        description: 'A one-wheeled delivery bot racing a parcel across town.',
        tools: ['Shapes', 'Pen', 'Layers'],
    },
    {
        id: 'cartoon-fox-detective',
        title: 'Fox Detective',
        category: 'cartoon',
        description: 'Noir under a street lamp: trench coat, fedora and a trail of paw prints.',
        tools: ['Pen', 'Gradients', 'Opacity'],
    },
    {
        id: 'manga-ronin',
        title: 'Ronin at Dusk',
        category: 'manga',
        description: 'A wandering swordsman against a setting sun, sharp line art and petals.',
        tools: ['Pen', 'Node tool', 'Gradients'],
    },
    {
        id: 'manga-ace-pilot',
        title: 'Sky Ace',
        category: 'manga',
        description: 'A cocky pilot with goggles up, a wink and speed lines behind.',
        tools: ['Pen', 'Gradients', 'Text'],
    },
    {
        id: 'manga-shrine-maiden',
        title: 'Shrine Maiden',
        category: 'manga',
        description: 'Moonlit torii, paper charms and fireflies around a calm shrine keeper.',
        tools: ['Pen', 'Shapes', 'Opacity'],
    },
    {
        id: 'manga-cyber-runner',
        title: 'Neon Runner',
        category: 'manga',
        description: 'Silver hair, a glowing visor and a rainy neon street.',
        tools: ['Pen', 'Gradients', 'Layers'],
    },
    {
        id: 'scenery-alpine',
        title: 'Alpine Sunrise',
        category: 'scenery',
        description: 'Layered peaks with atmospheric depth, mirrored in a still lake.',
        tools: ['Pen', 'Gradients', 'Opacity'],
    },
    {
        id: 'scenery-neon-city',
        title: 'Night Skyline',
        category: 'scenery',
        description: 'A city after dark, lit windows and a harbour that reflects them.',
        tools: ['Shapes', 'Gradients', 'Layers'],
    },
    {
        id: 'scenery-desert',
        title: 'Desert Highway',
        category: 'scenery',
        description: 'Mesas at golden hour and a road that runs to the horizon.',
        tools: ['Pen', 'Gradients', 'Shapes'],
    },
    {
        id: 'scenery-lighthouse',
        title: 'Lighthouse Coast',
        category: 'scenery',
        description: 'Blue hour on the cliffs, a sweeping beam over the waves.',
        tools: ['Pen', 'Gradients', 'Opacity'],
    },
    {
        id: 'flow-signup',
        title: 'Sign-up Flow',
        category: 'flow',
        description: 'Validation, email verification and the retry loops a real flow needs.',
        tools: ['Shapes', 'Connectors', 'Text'],
    },
    {
        id: 'flow-cicd',
        title: 'CI/CD Pipeline',
        category: 'flow',
        description: 'Parallel checks fan out, meet at a quality gate, then ship in stages.',
        tools: ['Shapes', 'Connectors', 'Text'],
    },
    {
        id: 'flow-swimlane',
        title: 'Order Fulfilment',
        category: 'flow',
        description: 'Customer, warehouse and courier lanes, with the out-of-stock branch.',
        tools: ['Shapes', 'Connectors', 'Layers'],
    },
    {
        id: 'design-poster',
        title: 'Jazz Night Poster',
        category: 'design',
        description: 'Swiss-style geometry and bold type for a gig poster.',
        tools: ['Shapes', 'Text', 'Layers'],
    },
    {
        id: 'design-wireframe',
        title: 'App Wireframe',
        category: 'design',
        description: 'Three phone screens and the taps that connect them.',
        tools: ['Shapes', 'Connectors', 'Text'],
    },
    {
        id: 'design-mindmap',
        title: 'Launch Mind Map',
        category: 'design',
        description: 'A product launch, broken down into teams and tasks.',
        tools: ['Pen', 'Shapes', 'Text'],
    },
];

export const findGalleryItem = (id: string | undefined) =>
    GALLERY_ITEMS.find((item) => item.id === id);
