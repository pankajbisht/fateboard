import * as fabric from 'fabric';
import { describe, expect, it } from 'vitest';
import { PROP_CATEGORIES, PROPS, getProp, searchProps } from '../catalog';
import { defaultPropData } from '../schema/parse';
import { propSvg } from '../render/propSvg';

/**
 * Scene Objects catalogue contract (docs/PROPS.md): every prop is a clean, seeded SVG that Fabric's loader
 * reads shape for shape, so it can be placed, moved, scaled and restyled like any object.
 */
const parse = (svg: string) => new DOMParser().parseFromString(svg, 'image/svg+xml');

/** What Fabric's SVG loader reads (no <use>, <pattern>, <clipPath>, <mask>, <text>, <image>, filters). */
const ALLOWED = new Set([
    'svg',
    'g',
    'path',
    'circle',
    'ellipse',
    'rect',
    'polygon',
    'polyline',
    'line',
]);

describe('props catalogue', () => {
    it('has the six categories, in panel order', () => {
        expect(PROP_CATEGORIES.map((c) => c.label)).toEqual([
            'Nature',
            'Sky',
            'Vehicles',
            'Furniture',
            'Kitchen',
            'Street',
            'Buildings',
            'Classroom',
            'Effects',
            'Japan',
            'Animals',
            'Food',
            'Sports',
            'Fantasy',
            'Tech',
            'Seasons',
            'Travel',
            'Backdrops',
        ]);
    });

    it('holds the props the owner asked for', () => {
        for (const id of [
            'car',
            'motorbike',
            'bicycle',
            'table',
            'chair',
            'cup',
            'plate',
            'street-lamp',
        ])
            expect(getProp(id), id).toBeDefined();
    });

    it('ids are unique and kebab-case', () => {
        const ids = PROPS.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z0-9]+)*$/);
    });

    it.each(PROP_CATEGORIES.map((c) => [c.id, c] as const))(
        '%s holds 15 to 20 props, each in its category',
        (id) => {
            const list = PROPS.filter((p) => p.category === id);
            expect(list.length).toBeGreaterThanOrEqual(15);
            expect(list.length).toBeLessThanOrEqual(20);
        },
    );

    it('every prop has a label, a size and colour slots', () => {
        for (const p of PROPS) {
            expect(p.label.trim().length).toBeGreaterThan(1);
            expect(p.width).toBeGreaterThan(20);
            expect(p.height).toBeGreaterThan(20);
            expect(Object.keys(p.colors).length).toBeGreaterThan(0);
            for (const c of Object.values(p.colors)) expect(c).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it.each(PROPS.map((p) => [p.id] as const))('%s draws valid SVG Fabric can read', async (id) => {
        const def = getProp(id)!;
        const svg = propSvg(def, defaultPropData(def));
        const doc = parse(svg);
        expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
        const tags = [...doc.getElementsByTagName('*')].map((e) => e.tagName);
        expect(tags.filter((t) => !ALLOWED.has(t))).toEqual([]);
        expect(svg).not.toMatch(/NaN|undefined|Infinity/);
        // seeded: the same prop always draws the same picture
        expect(propSvg(def, defaultPropData(def))).toBe(svg);
        const loaded = await fabric.loadSVGFromString(svg);
        const drawn = (loaded.objects ?? []).filter(Boolean) as fabric.FabricObject[];
        expect(drawn.length).toBeGreaterThan(0);
        // stays in its box (outline and round caps may stick out a little): the object's frame is the drawing
        const box = new fabric.Group(drawn).getBoundingRect();
        const slack = 12;
        expect(box.left, `${id} left`).toBeGreaterThanOrEqual(-slack);
        expect(box.top, `${id} top`).toBeGreaterThanOrEqual(-slack);
        expect(box.left + box.width, `${id} right`).toBeLessThanOrEqual(def.width + slack);
        expect(box.top + box.height, `${id} bottom`).toBeLessThanOrEqual(def.height + slack);
    });

    it('colour slots are what the drawing paints with (recolour = new slot values)', () => {
        for (const p of PROPS) {
            const base = defaultPropData(p);
            const slot = Object.keys(p.colors)[0];
            const recoloured = propSvg(p, { ...base, colors: { [slot]: '#123456' } });
            expect(recoloured, p.id).toContain('#123456');
        }
    });

    it('outline colour and width reach the ink lines', () => {
        const tree = getProp('tree-round')!;
        const svg = propSvg(tree, {
            ...defaultPropData(tree),
            outline: '#ff0000',
            outlineWidth: 7,
        });
        expect(svg).toContain('stroke="#ff0000"');
        expect(svg).toContain('stroke-width="7"');
    });

    it('search finds props by label and tag, inside a category', () => {
        expect(searchProps('sakura').map((p) => p.id)).toContain('tree-sakura');
        expect(searchProps('cloud', 'sky').length).toBeGreaterThan(2);
        expect(searchProps('cloud', 'nature')).toEqual([]);
        expect(searchProps('', 'sky')).toHaveLength(
            PROPS.filter((p) => p.category === 'sky').length,
        );
    });

    it('props with variants draw each one, all different', () => {
        const withVariants = PROPS.filter((p) => (p.variants?.length ?? 0) > 1);
        expect(withVariants.map((p) => p.id)).toEqual(
            expect.arrayContaining(['tree-round', 'tree-pine', 'chair', 'cloud-puffy', 'rock']),
        );
        for (const p of withVariants) {
            const svgs = p.variants!.map((_, v) =>
                propSvg(p, { ...defaultPropData(p), variant: v }),
            );
            expect(new Set(svgs).size, p.id).toBe(svgs.length);
            for (const svg of svgs) expect(svg).not.toMatch(/NaN|undefined/);
        }
    });
});
