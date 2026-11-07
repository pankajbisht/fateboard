/**
 * Store integrity. Slices are object-spread into one store, so a key defined by two slices is silently
 * overwritten by the later one (docs/STATE.md#key-collisions, BUG-002).
 *
 * `KNOWN_COLLISIONS` freezes today's list: adding a NEW collision fails this test. When a collision is
 * fixed, remove it from the list (the test also fails if a listed collision no longer exists).
 */
import { describe, expect, it } from 'vitest';
import { createCanvasSlice } from '../slices/createCanvasSlice';
import { createBrushSlice } from '../slices/createBrushSlice';
import { createUISlice } from '../slices/createUiSlice';
import { createLayersSlice } from '../slices/createLayersSlice';
import { createPageSlice } from '../slices/createPageSlice';
import { createPagesSlice } from '../slices/createPagesSlice';
import { createBackgroundSlice } from '../slices/createBackgroundSlice';
import { createCommandSlice } from '../slices/createCommandSlice';
import { createShapeStyleSlice } from '../slices/createShapeStyleSlice';
import { createUndoRedoSlice } from '../slices/createUndoRedoSlice';
import { createTransformSlice } from '../slices/createTransformSlice';
import { createShapeSlice } from '../slices/createShapeSlice';
import { createTextSlice } from '../slices/createTextSlice';
import { createBackgroundColor } from '../slices/createBackgroundColor';
import { createContextMenu } from '../slices/createContextMenu';
import { createSettingSlice } from '../slices/createSettingSlice';
import { advanceOperationSlice } from '../slices/advanceOperationSlice';
import { geometryEngineSlice } from '../slices/geometryEngineSlice';
import { createNodeEditorSlice } from '../slices/createNodeEditorSlice';
import { createFilterSlice } from '../slices/createFilterSlice';
import { createTemplateSlice } from '../slices/templateSlice';
import { createNotebookSlice } from '../slices/createNotebookSlice';
import { createDialogSlice } from '../slices/createDialogSlice';
import { createAnimationSlice } from '../slices/createAnimationSlice';
import { useStore } from '../index';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Same order as combinedSlice in src/store/index.ts (each slice spread once, BUG-002).
const SLICES: [string, (...args: any[]) => Record<string, unknown>][] = [
    ['Canvas', createCanvasSlice as any],
    ['Brush', createBrushSlice as any],
    ['UI', createUISlice as any],
    ['Layers', createLayersSlice as any],
    ['Page', createPageSlice as any],
    ['Pages', createPagesSlice as any],
    ['Background', createBackgroundSlice as any],
    ['Command', createCommandSlice as any],
    ['ShapeStyle', createShapeStyleSlice as any],
    ['UndoRedo', createUndoRedoSlice as any],
    ['Transform', createTransformSlice as any],
    ['Shape', createShapeSlice as any],
    ['Text', createTextSlice as any],
    ['BackgroundColor', createBackgroundColor as any],
    ['ContextMenu', createContextMenu as any],
    ['Setting', createSettingSlice as any],
    ['advanceOperation', advanceOperationSlice as any],
    ['geometryEngine', geometryEngineSlice as any],
    ['NodeEditor', createNodeEditorSlice as any],
    ['Filter', createFilterSlice as any],
    ['Template', createTemplateSlice as any],
    ['Notebook', createNotebookSlice as any],
    ['Dialog', createDialogSlice as any],
    ['Animation', createAnimationSlice as any],
];

/** Keys defined by more than one slice today (sorted). Shrink this list as collisions are fixed. */
const KNOWN_COLLISIONS: string[] = []; // BUG-002 fixed: no key is shared any more

function sliceKeys() {
    const stubStore = {
        subscribe: () => () => undefined,
        getState: () => ({}),
        setState: () => undefined,
    };
    return SLICES.map(
        ([name, create]) =>
            [
                name,
                Object.keys(
                    create(
                        () => undefined,
                        () => ({}),
                        stubStore,
                    ),
                ),
            ] as const,
    );
}

describe('store composition', () => {
    it('has exactly the known key collisions (no new ones)', () => {
        const owners = new Map<string, Set<string>>();
        for (const [name, keys] of sliceKeys()) {
            for (const key of keys) {
                if (!owners.has(key)) owners.set(key, new Set());
                owners.get(key)!.add(name);
            }
        }
        const collisions = [...owners.entries()]
            .filter(([, names]) => names.size > 1)
            .map(([key]) => key)
            .sort();
        expect(collisions).toEqual(KNOWN_COLLISIONS);
    });

    it('the real store exposes every slice action', () => {
        const state: any = useStore.getState();
        for (const key of [
            'init',
            'dispose',
            'addPage',
            'syncLayers',
            'saveState',
            'addShape',
            'addKeyframe',
            'runCommand',
        ]) {
            expect(typeof state[key]).toBe('function');
        }
    });

    // BUG-001 (fixed): the animation history is `animUndo` / `animRedo`; `undo` is the canvas one.
    it('BUG-001: store.undo is the canvas history action', () => {
        expect(useStore.getState().undo.toString()).toContain('runUndo'); // behaviour: undoSystem.test.ts
    });

    // BUG-017 (fixed): keyframes copy to `keyframeClipboard`; `clipboard` is the layers one.
    it('BUG-017: a fresh store has nothing to paste', () => {
        expect(useStore.getState().canPaste()).toBe(false);
    });
});
