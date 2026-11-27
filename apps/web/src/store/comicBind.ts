import { ActiveSelection, util, type Canvas, type FabricObject } from 'fabric';
import { isLayerHelper } from '@/lib/canvas/docLayers';
import { clipToPanel, frameAt, isInPanel, lockFrame, reclip, releaseFromPanel } from './comicClip';

/**
 * The comic slice's canvas listeners (moved out of createComicSlice.ts, 2026-11-27, size budget): a frame keeps its
 * white area twin in step (moved / resized / deleted), content in a panel keeps its cut on that panel while it is
 * dragged and moves to the panel it is dropped in (comicClip.ts), and frames are locked as they arrive (a layout, a
 * split, a loaded page) when the panel lock is on.
 */
type Obj = FabricObject & Record<string, unknown>;

const content = (c: Canvas) => (c.getObjects() as Obj[]).filter((o) => !isLayerHelper(o));
export const framesOf = (c: Canvas) => content(c).filter((o) => o.comicPanel);

const twinOf = (c: Canvas, frame: Obj) =>
    content(c).find((o) => o !== frame && o.comicPanelArea && o.panelId === frame.panelId);

/** The white area twin takes its frame's place, size and angle. */
export function syncTwin(c: Canvas, frame: FabricObject) {
    const twin = twinOf(c, frame as Obj);
    if (!twin) return;
    const d = util.qrDecompose(frame.calcTransformMatrix());
    twin.set({
        originX: 'center',
        originY: 'center',
        left: d.translateX,
        top: d.translateY,
        angle: d.angle,
        scaleX: d.scaleX,
        scaleY: d.scaleY,
        skewX: d.skewX,
        skewY: 0,
        flipX: false,
        flipY: false,
        width: frame.width,
        height: frame.height,
    });
    twin.setCoords();
}

export function bindComicCanvas(
    c: Canvas,
    opts: { busy: () => boolean; locked: () => boolean },
): () => void {
    const list = (t: FabricObject) =>
        (t instanceof ActiveSelection ? t.getObjects() : [t]) as Obj[];
    const boundTo = (frame: Obj) =>
        content(c).filter((o) => isInPanel(o) && o.panelId === frame.panelId);

    // while dragging, scaling or turning: the cut stays on the panel
    const onTransform = ({ target }: { target: FabricObject }) => {
        if (opts.busy() || !target) return;
        const frames = framesOf(c);
        for (const o of list(target)) if (isInPanel(o)) reclip(o, frames);
    };
    const onModified = ({ target }: { target: FabricObject }) => {
        if (opts.busy() || !target) return;
        const frames = framesOf(c);
        for (const o of list(target)) {
            if (o.comicPanel) {
                syncTwin(c, o);
                for (const b of boundTo(o)) clipToPanel(b, o);
            } else if (isInPanel(o)) {
                // dropped with its centre in another panel: it goes into that one
                const into = frameAt(frames, o.getCenterPoint());
                if (into) clipToPanel(o, into);
                else reclip(o, frames);
            }
        }
    };
    const onRemoved = ({ target }: { target: FabricObject }) => {
        const o = target as Obj;
        if (opts.busy() || !o?.comicPanel) return;
        const twin = twinOf(c, o);
        if (twin) c.remove(twin);
        for (const b of boundTo(o)) releaseFromPanel(b);
    };
    // not while busy only: a page loaded or restored brings its frames back, and they are locked too
    const onAdded = ({ target }: { target: FabricObject }) => {
        if ((target as Obj)?.comicPanel) lockFrame(target, opts.locked());
    };
    const offs = [
        c.on('object:moving', onTransform),
        c.on('object:scaling', onTransform),
        c.on('object:rotating', onTransform),
        c.on('object:skewing', onTransform),
        c.on('object:modified', onModified),
        c.on('object:removed', onRemoved),
        c.on('object:added', onAdded),
    ];
    return () => offs.forEach((off) => off());
}
