/**
 * Layered scene export (docs/CHARACTER_STUDIO.md phase 10): the composite, the aligned layers, the scene file and
 * the manifest, packed in a ZIP that reads back.
 */
import { describe, expect, it } from 'vitest';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import { readZip } from '@/test/zipRead';
import { zip } from '@/lib/zip';
import { sceneExportFiles, slug } from '../export/layers';
import { renderScene } from '../render/renderScene';
import { newScene, parseScene } from '../schema/parse';
import type { Scene } from '../schema/types';

const scene = (patch: (s: Scene) => void = () => {}): Scene => {
    const s = newScene('Class Photo – Ünïcode!');
    s.set.environment = 'school';
    s.actors = [0, 3, 8].map((r, i) => ({
        id: `a${i}`,
        character: fromRecipe(RECIPES[r], `a${i}`),
        x: (i - 1) * 90,
        z: 0,
        facing: 0,
        lookAt: null,
    }));
    patch(s);
    return s;
};
const text = (files: { name: string; data: string }[], name: string) =>
    files.find((f) => f.name === name)!.data;
const paths = (svg: string) => svg.match(/<path /g)?.length ?? 0;
const viewBox = (svg: string) => /viewBox="([^"]+)"/.exec(svg)![1];

describe('slug', () => {
    it('makes safe file names', () => {
        expect(slug('Class Photo – Ünïcode!')).toBe('class-photo-unicode');
        expect(slug('   ')).toBe('scene');
        expect(slug('///', 'character')).toBe('character');
        expect(slug('x'.repeat(100)).length).toBe(40);
    });
});

describe('sceneExportFiles', () => {
    it('has the composite, a background, one layer per character, the frame, the scene file and a manifest', () => {
        const files = sceneExportFiles(scene((s) => (s.frame = { ...s.frame, border: 6 })));
        expect(files.map((f) => f.name)).toEqual([
            'composite.svg',
            'layers/00-background.svg',
            'layers/01-aarav.svg',
            'layers/02-ananya.svg',
            'layers/03-kenji.svg',
            'layers/99-frame.svg',
            'scene.json',
            'layers.json',
        ]);
        expect(new Set(files.map((f) => f.name)).size).toBe(files.length);
    });

    it('every layer has the same view box and size as the composite, so they stack exactly', () => {
        const files = sceneExportFiles(
            scene((s) => (s.frame = { ...s.frame, border: 6, shape: 'rounded' })),
        );
        const box = viewBox(text(files, 'composite.svg'));
        for (const f of files.filter((x) => x.name.endsWith('.svg')))
            expect(viewBox(f.data), f.name).toBe(box);
    });

    it('the layers add up to the composite: every shape is in exactly one layer', () => {
        const s = scene((x) => (x.frame = { ...x.frame, border: 6 }));
        const files = sceneExportFiles(s);
        const layers = files.filter((f) => f.name.startsWith('layers/') && f.name.endsWith('.svg'));
        expect(layers.reduce((n, f) => n + paths(f.data), 0)).toBe(
            paths(text(files, 'composite.svg')),
        );
        expect(paths(text(files, 'composite.svg'))).toBe(renderScene(s).items.length);
    });

    it('a character layer holds only that character; the background holds none', () => {
        const s = scene();
        const model = renderScene(s);
        const files = sceneExportFiles(s);
        const own = (id: string) => model.items.filter((d) => d.actor === id).length;
        expect(paths(text(files, 'layers/02-ananya.svg'))).toBe(own('a1'));
        expect(own('a1')).toBeGreaterThan(20);
        expect(paths(text(files, 'layers/00-background.svg'))).toBe(
            model.items.filter((d) => !d.actor).length,
        );
    });

    it('no frame, no frame layer; a character out of the picture has no empty layer; same names get numbers', () => {
        const s = scene((x) => {
            x.actors[2].z = x.camera.position[2] + 500; // behind the camera
            x.actors[1].character = { ...x.actors[1].character, name: x.actors[0].character.name };
        });
        const names = sceneExportFiles(s).map((f) => f.name);
        expect(names).not.toContain('layers/99-frame.svg');
        expect(names.filter((n) => /layers\/0[0-9]-/.test(n))).toHaveLength(3); // background + 2 characters
        const chars = names.filter((n) => /layers\/0[12]-/.test(n));
        expect(new Set(chars).size).toBe(2);
    });

    it('scene.json opens again as the same scene, and layers.json lists the layers bottom to top', () => {
        const s = scene((x) => (x.frame = { ...x.frame, border: 4 }));
        const files = sceneExportFiles(s);
        expect(parseScene(JSON.parse(text(files, 'scene.json')))).toEqual(s);
        const manifest = JSON.parse(text(files, 'layers.json'));
        expect(manifest.layers.map((l: { kind: string }) => l.kind)).toEqual([
            'background',
            'actor',
            'actor',
            'actor',
            'frame',
        ]);
        expect(manifest.layers[1]).toMatchObject({
            name: 'Aarav',
            actor: 'a0',
            file: 'layers/01-aarav.svg',
        });
        expect(manifest.width).toBe(1000);
    });

    it('packs into a ZIP that reads back file for file', () => {
        const files = sceneExportFiles(scene());
        const back = readZip(zip(files));
        expect([...back.keys()]).toEqual(files.map((f) => f.name));
        for (const f of files)
            expect(new TextDecoder().decode(back.get(f.name)), f.name).toBe(f.data);
    });

    it('is the same every time (seeded)', () => {
        const s = scene();
        expect(sceneExportFiles(s)).toEqual(sceneExportFiles(s));
    });
});
