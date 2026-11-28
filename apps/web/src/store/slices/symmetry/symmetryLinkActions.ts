/**
 * Symmetry slice: linked copies on the board (listener) and the Break link / Bake all / Merge actions.
 * Listener: `object:modified` (move, scale, turn, node edits) and `text:editing:exited` rebuild a source's
 * copies, or carry a copy's edit back to its source first. Rebuilds of one source run one after another.
 */
import type * as fabric from 'fabric';
import type { SymmetryPeers } from '../createSymmetrySlice';
import {
    copiesOf,
    copyEdited,
    linkOf,
    mergeFamilies,
    previousMatrix,
    rebuildCopies,
    sourceId,
    unlink,
} from './symmetryLinks';

export interface SymmetryLinkActions {
    /** Break the link of the selected copies / sources. Returns how many copies. */
    unlinkSymmetryCopies: () => number;
    /** Every linked copy on the page becomes an independent object. */
    bakeSymmetryCopies: () => number;
    /** The selected families (source + copies) become one group. */
    mergeSymmetryCopies: () => Promise<boolean>;
}

type ModifiedEvent = {
    target?: fabric.FabricObject & { getObjects?: () => fabric.FabricObject[] };
    transform?: { original?: Record<string, unknown> };
};

/** Watches edits of linked objects; returns the disposer. */
export function attachSymmetryLinks(canvas: fabric.Canvas, peers: () => SymmetryPeers): () => void {
    const queues = new Map<string, Promise<unknown>>();
    const busy = () => {
        const s = peers();
        return !!(s._isRestoring || s.isPageSwitching || s.symmetryAnimating);
    };
    const queue = (src: string, job: () => Promise<unknown>) => {
        const next = (queues.get(src) ?? Promise.resolve())
            .then(job)
            .catch((err) => console.error('[symmetry] linked copies failed', err));
        queues.set(src, next);
        return next;
    };
    const rebuild = (source: fabric.FabricObject) => {
        const src = sourceId(source);
        if (src && copiesOf(canvas, src).length)
            void queue(src, () => rebuildCopies(canvas, source));
    };
    const onModified = (e: ModifiedEvent) => {
        if (busy() || !e?.target) return;
        const members =
            e.target.type === 'activeselection' && e.target.getObjects
                ? e.target.getObjects()
                : [e.target];
        // a transform of one object: Fabric remembers where it was (`original`)
        const single = members.length === 1 ? e.transform?.original : undefined;
        for (const obj of members) {
            const link = linkOf(obj);
            if (link) {
                const before = single ? previousMatrix(obj, single) : null;
                if (members.length > 1 && members.some((o) => sourceId(o) === link.src)) continue; // moved with its source
                void queue(link.src, async () => {
                    const source = await copyEdited(canvas, obj, before);
                    if (source) await rebuildCopies(canvas, source);
                });
            } else rebuild(obj);
        }
    };
    const onTextDone = (e: { target?: fabric.FabricObject }) => {
        if (busy() || !e?.target) return;
        const link = linkOf(e.target);
        if (link)
            void queue(link.src, async () => {
                const source = await copyEdited(canvas, e.target!, null);
                if (source) await rebuildCopies(canvas, source);
            });
        else rebuild(e.target);
    };
    const offs = [
        canvas.on('object:modified', onModified as never),
        canvas.on('text:editing:exited', onTextDone as never),
    ];
    return () => offs.forEach((off) => off());
}

export function createSymmetryLinkActions(peers: () => SymmetryPeers) {
    const toast = (message: string) => peers().showToast?.({ message });
    const selection = () => peers().canvas?.getActiveObjects() ?? [];
    return {
        unlinkSymmetryCopies: () => {
            const canvas = peers().canvas;
            if (!canvas) return 0;
            const n = unlink(canvas, selection());
            toast(
                n
                    ? `${n} ${n === 1 ? 'copy stands' : 'copies stand'} on their own now.`
                    : 'Select a linked copy or its source first.',
            );
            if (n) peers().persist?.();
            return n;
        },
        bakeSymmetryCopies: () => {
            const canvas = peers().canvas;
            if (!canvas) return 0;
            const n = unlink(
                canvas,
                canvas.getObjects().filter((o) => linkOf(o)),
            );
            toast(
                n
                    ? `Baked ${n} ${n === 1 ? 'copy' : 'copies'} into real objects.`
                    : 'There are no linked copies on this page.',
            );
            if (n) peers().persist?.();
            return n;
        },
        mergeSymmetryCopies: async () => {
            const canvas = peers().canvas;
            if (!canvas) return false;
            try {
                const group = await mergeFamilies(canvas, selection());
                if (!group) {
                    toast('Select a linked copy or its source to merge the whole pattern.');
                    return false;
                }
                return true;
            } catch (err) {
                console.error('[symmetry] merge failed', err);
                return false;
            }
        },
    } satisfies SymmetryLinkActions;
}
