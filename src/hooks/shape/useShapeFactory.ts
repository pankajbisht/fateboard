import { useCallback, useMemo } from 'react';
import * as fabric from 'fabric';
import { useStore } from '@store';
import { SHAPES, getShapeDef, type ShapeDef } from './shapeCatalog';
import type { ConnectorMode } from '@/lib/utils/shapeConnectors';

/** Built-in shapes only (kept for old imports). The hook's `shapesList` also has custom ones. */
export { SHAPES as shapesList };

const EMPTY: ShapeDef[] = [];

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

/* -------------------------------------------------------------------------- */
/* Line drawing state                                                         */
/*                                                                            */
/* Lives at module level on purpose: handlers created inside the hook were     */
/* re-created every render, so canvas.off(...) never removed the old ones.     */
/* Module state also survives the panel closing right after enabling.          */
/* -------------------------------------------------------------------------- */

interface LineSession {
    canvas: fabric.Canvas;
    down: (opt: any) => void;
    move: (opt: any) => void;
    up: () => void;
    key: (e: KeyboardEvent) => void;
}

let session: LineSession | null = null;
let currentLine: fabric.Line | null = null;

export interface LineStyle {
    stroke?: string;
    strokeWidth?: number;
}

function disableLineDrawing() {
    if (!session) return;
    const { canvas, down, move, up, key } = session;

    canvas.off('mouse:down', down);
    canvas.off('mouse:move', move);
    canvas.off('mouse:up', up);
    window.removeEventListener('keydown', key);

    canvas.selection = true;
    canvas.defaultCursor = 'default';

    // a half-drawn line (Escape while dragging) must not stay on the canvas
    if (currentLine) canvas.remove(currentLine);

    session = null;
    currentLine = null;
}

function enableLineDrawing(canvas: fabric.Canvas | null, style: LineStyle = {}) {
    if (!canvas) return;
    disableLineDrawing(); // never stack two sessions

    canvas.discardActiveObject();
    canvas.isDrawingMode = false; // no fabric pencil
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';

    const pointOf = (opt: any) => opt.scenePoint ?? canvas.getScenePoint(opt.e);

    const down = (opt: any) => {
        // primary button only
        if (opt?.e?.button !== undefined && opt.e.button !== 0) return;

        const p = pointOf(opt);
        currentLine = new fabric.Line([p.x, p.y, p.x, p.y], {
            stroke: style.stroke ?? '#000000',
            strokeWidth: Math.max(style.strokeWidth ?? 2, 1),
            strokeLineCap: 'round',
            strokeUniform: true,
            customType: 'shape',
            objectCaching: false,
            selectable: true,
            evented: true,
        });
        (currentLine as any).shapeId = uid(); // lets connectors attach to the line
        canvas.add(currentLine);
    };

    const move = (opt: any) => {
        if (!currentLine) return;
        const p = pointOf(opt);
        currentLine.set({ x2: p.x, y2: p.y });
        currentLine.setCoords();
        canvas.requestRenderAll();
    };

    const up = () => {
        const line = currentLine;
        currentLine = null;
        if (!line) return;

        // a plain click (no drag) would leave an invisible zero-length line
        const length = Math.hypot((line.x2 ?? 0) - (line.x1 ?? 0), (line.y2 ?? 0) - (line.y1 ?? 0));
        if (length < 3) {
            canvas.remove(line);
            return;
        }

        const state = useStore.getState() as any;
        (line as any).__instances = [];
        canvas.setActiveObject(line);
        state.setToolbar?.({ target: line });
        state.updateFromFabric?.(line);
        state.saveState?.();
        state.addLayer?.(line, 'line');

        state.setActiveTool?.('select');
        disableLineDrawing();
    };

    // Escape cancels line mode
    const key = (e: KeyboardEvent) => {
        if (e.key === 'Escape') disableLineDrawing();
    };

    canvas.on('mouse:down', down);
    canvas.on('mouse:move', move);
    canvas.on('mouse:up', up);
    window.addEventListener('keydown', key);
    session = { canvas, down, move, up, key };
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export const useShapeFactory = () => {
    const canvas = useStore((state) => state.canvas);
    const addShape = useStore((state) => state.addShape);

    const customShapes: ShapeDef[] = useStore((s: any) => s.customShapes) ?? EMPTY;
    const addConnectorAction = useStore((s: any) => s.addConnector);
    const saveSelectionAsShape = useStore((s: any) => s.saveSelectionAsShape);
    const saveCustomPath = useStore((s: any) => s.saveCustomPath);
    const removeCustomShape = useStore((s: any) => s.removeCustomShape);

    /** Built-in + user-made shapes. */
    const shapesList = useMemo(() => [...SHAPES, ...customShapes], [customShapes]);

    /** Add a catalog (or custom) shape. Size/geometry come from the catalog. */
    const add = useCallback(
        (type: string, options: Record<string, any> = {}) => {
            if (!canvas || !getShapeDef(type)) return;
            addShape(type, options);
        },
        [canvas, addShape],
    );

    const startLine = useCallback(
        (style?: LineStyle) => enableLineDrawing(canvas, style),
        [canvas],
    );

    /** Connector: joins the selected shapes, or drops a free one in the viewport centre. */
    const addConnector = useCallback(
        (mode: ConnectorMode = 'simple') => {
            if (!canvas) return;
            addConnectorAction(mode);
        },
        [canvas, addConnectorAction],
    );

    return {
        shapesList,
        add,
        enableLineDrawing: startLine,
        disableLineDrawing,
        addConnector,
        saveSelectionAsShape,
        saveCustomPath,
        removeCustomShape,
    };
};
