import * as fabric from 'fabric';
import {
    DEFAULT_TONE,
    normalizeTone,
    tonePatternMatrix,
    toneTile,
    type ToneParams,
} from '@/lib/comic/screentone';
import { frameGroup, swapFrameDrawing } from '@/lib/canvas/frameGroup';
import { drawables } from './render/parts';
import { renderCharacter } from './render/renderCharacter';
import { characterSvg } from './render/toSvg';
import { parseCamera, parseCharacter } from './schema/parse';
import type { Character, CharacterCamera } from './schema/types';

/**
 * A character on a page (docs/CHARACTER_STUDIO.md §4 "Board contract"): a Fabric group built from the
 * rendered SVG, carrying `characterData` (in CUSTOM_PROPS) so it saves with the page, survives undo and can
 * be opened in the studio again. No store import (slices import this module statically).
 */
export interface CharacterData {
    character: Character;
    camera: CharacterCamera;
}

type WithData = fabric.FabricObject & { characterData?: unknown };

/**
 * Drawing scale: px per cm of the character, before the page / zoom creation scale (lib/canvas/creationScale).
 * A fixed scale keeps sizes true: a child is smaller than an adult, and a changed body changes size on Update.
 */
export const PX_PER_CM = 2.2;

export async function buildCharacterObject(data: CharacterData): Promise<fabric.Group | null> {
    const model = renderCharacter(data.character, data.camera);
    const h = Math.max(1, Math.round(model.viewBox[3] * PX_PER_CM));
    const svg = characterSvg(model, h);
    const loaded = await fabric.loadSVGFromString(svg);
    const objects = (loaded?.objects ?? []).filter(Boolean) as fabric.FabricObject[];
    if (!objects.length) return null;
    // manga: screentone parts get the Comic tone fill (Fabric's SVG loader drops patterns); the shapes come in
    // the order they were written, one per drawable
    const items = drawables(model.parts);
    if (items.some((d) => d.tone)) {
        if (objects.length === items.length) {
            const tone = tonePatterns();
            items.forEach((d, i) => {
                if (d.tone) applyTone(objects[i], tone(d.tone));
            });
        } else
            console.warn(
                '[character] screentone left grey: the drawing did not load shape for shape',
            );
    }
    // the shot's frame (lib/canvas/frameGroup): fitted to its shapes, a close-up put the whole figure on the page
    const w = Math.round((h * model.viewBox[2]) / model.viewBox[3]);
    const group = frameGroup(objects, w, h);
    // a plain JSON copy: the page stores it as it is
    (group as WithData).characterData = JSON.parse(JSON.stringify(data));
    group.set({ name: data.character.name } as Partial<fabric.FabricObject>);
    return group;
}

type Toned = fabric.FabricObject & { toneParams?: unknown; fillBeforeTone?: string };

/** One dot screentone per density for this drawing (a tone on white paper, like a manga page); the scene board uses it too. */
export function tonePatterns() {
    const made = new Map<number, { pattern: fabric.Pattern; params: ToneParams } | null>();
    return (density: number) => {
        if (!made.has(density)) {
            const params = normalizeTone({ ...DEFAULT_TONE, spacing: 6, density });
            const tile =
                typeof document !== 'undefined' ? toneTile(document, params, '#ffffff') : null;
            made.set(
                density,
                tile
                    ? {
                          params,
                          pattern: new fabric.Pattern({
                              source: tile,
                              repeat: 'repeat',
                              patternTransform: tonePatternMatrix(params.angle),
                          }),
                      }
                    : null,
            );
        }
        return made.get(density) ?? null;
    };
}

/** The Comic panel can change or remove it like any tone. */
export function applyTone(
    obj: fabric.FabricObject,
    tone: { pattern: fabric.Pattern; params: ToneParams } | null,
) {
    if (!tone) return;
    obj.set({ fill: tone.pattern });
    (obj as Toned).toneParams = tone.params;
    (obj as Toned).fillBeforeTone = '#ffffff';
}

/**
 * "Update on page": puts a freshly built drawing into the SAME group, so the object keeps its identity (id,
 * animation track, pinned notes, connectors, locks, layer, shadow); it takes the fresh shot's frame
 * (lib/canvas/frameGroup `swapFrameDrawing`).
 */
export function swapCharacterDrawing(
    target: fabric.Group,
    fresh: fabric.Group,
    data: CharacterData,
) {
    swapFrameDrawing(target, fresh);
    (target as WithData).characterData = JSON.parse(JSON.stringify(data));
    target.set({ name: data.character.name, dirty: true } as Partial<fabric.Group>);
    target.setCoords();
}

export const isCharacterGroup = (o: unknown): o is fabric.Group =>
    o instanceof fabric.Group && !!(o as WithData).characterData;

/** The character on a page object, validated, or null for any other object. */
export function readCharacterData(obj: unknown): CharacterData | null {
    const raw = (obj as WithData | null | undefined)?.characterData as
        { character?: unknown; camera?: unknown } | undefined;
    if (!raw || typeof raw !== 'object') return null;
    const character = parseCharacter(raw.character);
    return character ? { character, camera: parseCamera(raw.camera) } : null;
}
