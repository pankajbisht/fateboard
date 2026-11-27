/**
 * THE list of custom object properties that must survive `toObject()` / `loadFromJSON()`
 * (BUG-003). Fabric drops anything not listed. Used by undo / redo, autosave, save / export of the
 * board, page switching and the mode-switch snapshot, so all of them keep the same data.
 *
 * Add a prop here when a feature stores something on canvas objects. Runtime-only references
 * (`__text`, `__box`, `__group`, `__instances`, `__master`...) are NOT serialized: they are rebuilt
 * after every load (text shapes: `rehydrateTextShape`).
 */
export const CUSTOM_PROPS = [
    // identity / layers
    'id',
    'name',
    'data',
    'customId',
    'customType',
    // locks (Fabric does not serialize these by default)
    '_locked',
    'locked',
    'selectable',
    'evented',
    'lockMovementX',
    'lockMovementY',
    'lockScalingX',
    'lockScalingY',
    'lockRotation',
    // shapes, text shapes, connectors
    'shapeId',
    'isTextShape',
    'textInset',
    'connectorData',
    // features
    'linkId', // linked clones (lib/linkedClones)
    'filterState', // image filters panel
    'animId', // animation tracks
    'isFreehand', // brush strokes
    'layerBlur', // layer blur radius (lib/canvas/layerBlur)
    'layerId', // the page layer an object sits on (lib/canvas/docLayers)
    'docLayers', // canvas-level: the page's layers + folders (Fabric's toObject picks canvas props too)
    'pageSetup', // canvas-level: margins, columns, bleed, facing pages, guides (lib/document/pageSetup)
    'pageRole', // canvas-level: 'master' on a master page
    'masterId', // canvas-level: the master page drawn under this page
    'pageNotes', // canvas-level: the page's note pins (lib/notes/pageNotes)
    'pageNumberField', // a text that shows the page number
    'toneParams', // screentone settings of a tone fill (lib/comic/screentone)
    'fillBeforeTone', // the fill a tone replaced (Remove tone puts it back)
    'comicPanel', // comic panel frame (border) …
    'comicPanelArea', // … and its fill twin on the clip base layer
    'panelId', // links a frame to its twin
    'characterData', // a Character Studio character on the page: { character, camera } (src/character)
    'sceneData', // a Character Studio scene on the page: { scene } (src/scene)
    'propData', // a Scene Object (props library) on the page: { propId, variant, colors, outline } (src/props)
    'fightClip', // a fight clip on the page: timing + recipe, saved as a poster (scene/board.ts, animation/clips.ts)
    'backgroundColor',
] as const;

/** Props Fabric changes on a text box while you type in it (it keeps the real ones in `_savedProps`). */
const EDITING_PROPS = [
    'selectable',
    'lockMovementX',
    'lockMovementY',
    'hasControls',
    'hoverCursor',
];

type Swap = { obj: Record<string, unknown>; live: Record<string, unknown> };

/**
 * A fight clip that carries its recipe (`scene/board.ts`) is saved as a poster: the place, the first drawing and
 * the over layer, with the other drawings as empty hidden slots (rebuilt from the recipe after a load). One clip
 * held every drawing (12k shapes, 16 MB) in each undo step and autosave. Clips without a recipe keep everything.
 */
function posterSwaps(group: Record<string, unknown>, swapped: Swap[]) {
    const clip = group.fightClip as
        { first?: unknown; count?: unknown; over?: unknown; recipe?: unknown } | undefined;
    if (!clip?.recipe || typeof clip.first !== 'number' || typeof clip.count !== 'number') return;
    const kids = group._objects as Record<string, unknown>[];
    const swap = (kid: Record<string, unknown> | undefined, to: Record<string, unknown>) => {
        if (!kid) return;
        const live: Record<string, unknown> = {};
        for (const k of Object.keys(to)) live[k] = kid[k];
        Object.assign(kid, to);
        swapped.push({ obj: kid, live });
    };
    for (let i = 0; i < clip.count; i++)
        swap(kids[clip.first + i], i === 0 ? { visible: true } : { visible: false, _objects: [] });
    if (typeof clip.over === 'number' && clip.over >= 0) swap(kids[clip.over], { visible: true });
}

type Serializable = {
    toObject: (props?: string[]) => Record<string, unknown>;
    getObjects: () => unknown[];
};

/**
 * `canvas.toObject(CUSTOM_PROPS)`, except that
 * - a text box in typing mode is written with its real props: Fabric locks it (selectable false,
 *   movement locked) while editing, and saving that would bring the text back locked after an
 *   undo, a page switch or a reload;
 * - an object shown mid-animation is written with its rest values (`__animRest`, set by the
 *   animation engine), never the animated ones (BUG-011: e.g. a typewriter text saved cut short).
 */
export function serializeCanvas(
    canvas: Serializable,
    props: readonly string[] = CUSTOM_PROPS,
): Record<string, unknown> {
    const swapped: Swap[] = [];
    const visit = (list: unknown[]) => {
        for (const item of list) {
            const obj = item as Record<string, unknown> & {
                isEditing?: boolean;
                _savedProps?: Record<string, unknown>;
                _objects?: unknown[];
                __animRest?: Record<string, unknown>;
            };
            const saved = obj?._savedProps;
            if (obj?.isEditing && saved) {
                const live: Record<string, unknown> = {};
                for (const k of EDITING_PROPS) {
                    if (!(k in saved)) continue;
                    live[k] = obj[k];
                    obj[k] = saved[k];
                }
                swapped.push({ obj, live });
            }
            const rest = obj?.__animRest;
            if (rest && typeof rest === 'object') {
                const live: Record<string, unknown> = {};
                for (const k of Object.keys(rest)) {
                    live[k] = obj[k];
                    obj[k] = rest[k];
                }
                swapped.push({ obj, live });
            }
            if (Array.isArray(obj?._objects)) {
                posterSwaps(obj, swapped);
                visit(obj._objects);
            }
        }
    };
    visit(canvas.getObjects());
    try {
        const json = canvas.toObject([...props]);
        // `backgroundColor` in the props list is meant for OBJECTS; on the canvas it duplicates
        // Fabric's own `background` key (the one loadFromJSON reads) and is null on design pages,
        // which a reload drops: the same canvas then serialized differently and every undo /
        // selection after a restore recorded a phantom step (and wiped redo).
        delete json.backgroundColor;
        return json;
    } finally {
        // last swap first, so an object swapped twice gets its live values back
        for (const { obj, live } of swapped.reverse()) Object.assign(obj, live);
    }
}
