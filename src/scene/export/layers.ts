import { renderScene } from '../render/renderScene';
import { sceneSvg } from '../render/toSvg';
import type { SceneModel } from '../render/types';
import type { Scene } from '../schema/types';

/**
 * Layered export of a scene (docs/CHARACTER_STUDIO.md phase 10): the picture as one SVG, and as aligned layers (the
 * background and set, every character on its own, the frame), all with the same view box so any editor stacks them
 * exactly. Pure: it returns file names and contents; the UI zips and downloads them.
 */
export interface ExportFile {
    name: string;
    data: string;
}

/** A name safe for a file: lower case letters, digits and dashes. */
export const slug = (text: string, fallback = 'scene'): string =>
    text
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || fallback;

const FRAME_KEYS = new Set(['mat', 'border']);

const layer = (
    model: SceneModel,
    keep: (i: SceneModel['items'][number]) => boolean,
    width: number,
) => sceneSvg({ ...model, items: model.items.filter(keep) }, width);

/**
 * Every file of the export: `composite.svg`, the layers in stacking order (bottom first) in `layers/`, `scene.json`
 * (the scene, to open again) and `layers.json` (what is what).
 */
export function sceneExportFiles(scene: Scene, pixelWidth = 1920): ExportFile[] {
    const model = renderScene(scene);
    const files: ExportFile[] = [{ name: 'composite.svg', data: sceneSvg(model, pixelWidth) }];
    const manifest: {
        file: string;
        kind: 'background' | 'actor' | 'frame';
        name: string;
        actor?: string;
    }[] = [];
    const add = (
        name: string,
        kind: 'background' | 'actor' | 'frame',
        label: string,
        svg: string,
        actor?: string,
    ) => {
        files.push({ name: `layers/${name}`, data: svg });
        manifest.push({ file: `layers/${name}`, kind, name: label, ...(actor ? { actor } : {}) });
    };
    add(
        '00-background.svg',
        'background',
        'Place, sky and weather',
        layer(model, (d) => !d.actor && !FRAME_KEYS.has(d.key), pixelWidth),
    );
    const used = new Set<string>();
    scene.actors.forEach((a, i) => {
        // actors that are out of the picture have no shapes: no empty layer
        if (!model.items.some((d) => d.actor === a.id)) return;
        let base = slug(a.character.name, 'character');
        while (used.has(base)) base += '-2';
        used.add(base);
        add(
            `${String(i + 1).padStart(2, '0')}-${base}.svg`,
            'actor',
            a.character.name,
            layer(model, (d) => d.actor === a.id, pixelWidth),
            a.id,
        );
    });
    if (model.items.some((d) => FRAME_KEYS.has(d.key)))
        add(
            '99-frame.svg',
            'frame',
            'Frame',
            layer(model, (d) => FRAME_KEYS.has(d.key), pixelWidth),
        );
    files.push({ name: 'scene.json', data: JSON.stringify(scene, null, 2) });
    files.push({
        name: 'layers.json',
        data: JSON.stringify(
            {
                scene: scene.name,
                width: model.width,
                height: model.height,
                note: 'Stack the layers bottom (first) to top. All share one view box. Things in the place that stand in front of a character are in the background layer.',
                layers: manifest,
            },
            null,
            2,
        ),
    });
    return files;
}
