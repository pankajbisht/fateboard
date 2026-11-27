import type { Canvas, FabricObject } from 'fabric';
import { creationScaleOf } from '@/lib/canvas/creationScale';
import type { PropLight } from '@/props/types';
import { pageBox, pageLight, propObjects, type PageState } from './propPage';

/**
 * Page-wide prop actions for the props slice (docs/PROPS.md phase 4): time of day for every prop, and the
 * scene presets. The prop code loads on first use (dynamic imports), like the rest of the slice.
 */
export interface PageActionContext {
    peers: () => PageState & {
        canvas?: Canvas | null;
        showToast?: (o: { message: string }) => void;
        addPageLayer?: (kind?: 'layer') => string | null;
        updatePageLayer?: (id: string, patch: { name?: string }) => void;
        setActiveLayer?: (id: string) => void;
    };
    /** Runs `fn` as one board history step. */
    oneStep: <T>(fn: () => Promise<T>) => Promise<T>;
}

/** Day / sunset / night for every prop on the page, rebuilt in place, one undo step. Props restyled. */
export async function relightPage(
    { peers, oneStep }: PageActionContext,
    light: PropLight,
): Promise<number> {
    const { canvas } = peers();
    if (!canvas) return 0;
    try {
        const board = await import('@/props/board');
        const targets = propObjects(canvas);
        if (!targets.length) return 0;
        const fresh = await Promise.all(
            targets.map((t) => board.buildPropObject({ ...board.readPropData(t)!, light })),
        );
        let done = 0;
        await oneStep(async () => {
            targets.forEach((t, i) => {
                const f = fresh[i];
                if (!f) return;
                board.swapPropDrawing(t, f, board.readPropData(f)!);
                canvas.fire('object:modified', { target: t });
                done++;
            });
        });
        canvas.requestRenderAll();
        return done;
    } catch (err) {
        console.error('[props] could not change the time of day', err);
        peers().showToast?.({ message: 'Could not change the time of day.' });
        return 0;
    }
}

const PLANES = [
    ['background', 'Background'],
    ['midground', 'Midground'],
    ['foreground', 'Foreground'],
] as const;

/**
 * A scene preset on three new page layers (Background, Midground, Foreground), each prop placed by page
 * fractions (a `cover` backdrop fills the page), in the page's time of day; one undo step. Props placed.
 */
export async function layOutScene(
    { peers, oneStep }: PageActionContext,
    sceneId: string,
): Promise<number> {
    const { canvas } = peers();
    if (!canvas) return 0;
    try {
        const [board, scenes, parse, catalog] = await Promise.all([
            import('@/props/board'),
            import('@/props/scenes'),
            import('@/props/schema/parse'),
            import('@/props/catalog'),
        ]);
        const scene = scenes.getPropScene(sceneId);
        if (!scene) return 0;
        const box = pageBox(peers());
        const light = pageLight(canvas);
        // the ink outline a prop added by hand would show on this page (props scale their outline)
        const ink = 3 * creationScaleOf(peers());
        // build first (async), then add everything inside one history step
        const built = await Promise.all(
            scene.items.map(async (item) => {
                const def = catalog.getProp(item.propId);
                if (!def) return null;
                const k = item.cover
                    ? Math.max(box.width / def.width, box.height / def.height)
                    : (item.h * box.height) / def.height;
                const obj = await board.buildPropObject({
                    propId: item.propId,
                    variant: item.variant ?? 0,
                    shadow: !item.cover && parse.shadowByDefault(def),
                    outlineWidth: Math.min(20, Math.max(0.5, Math.round((ink / k) * 10) / 10)),
                    light,
                });
                return obj ? { item, obj } : null;
            }),
        );
        if (peers().canvas !== canvas) return 0;
        let placed = 0;
        await oneStep(async () => {
            for (const [plane, name] of PLANES) {
                const layerId = peers().addPageLayer?.('layer');
                if (layerId) {
                    peers().updatePageLayer?.(layerId, { name });
                    peers().setActiveLayer?.(layerId);
                }
                for (const b of built) {
                    if (!b || b.item.plane !== plane) continue;
                    const { item, obj } = b;
                    const w = obj.width || 1;
                    const h = obj.height || 1;
                    const k = item.cover
                        ? Math.max(box.width / w, box.height / h)
                        : (item.h * box.height) / h;
                    obj.set({
                        scaleX: k,
                        scaleY: k,
                        flipX: !!item.flip,
                        left: box.left + item.x * box.width,
                        top: item.cover
                            ? box.top + box.height / 2
                            : box.top + item.bottom * box.height - (h * k) / 2,
                    });
                    obj.setCoords();
                    canvas.add(obj as FabricObject);
                    placed++;
                }
            }
        });
        canvas.discardActiveObject();
        canvas.requestRenderAll();
        return placed;
    } catch (err) {
        console.error('[props] could not lay out the scene', err);
        peers().showToast?.({ message: 'Could not lay out the scene.' });
        return 0;
    }
}
