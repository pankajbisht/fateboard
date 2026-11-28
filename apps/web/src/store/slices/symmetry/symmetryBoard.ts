/**
 * Symmetry slice, board side: every canvas listener of the symmetry tools in one place, re-attached when the
 * canvas changes and disposed with it — handle dragging, ghosts, following a moving source object, linked
 * copies, axis snapping, the magic wand, stamps and the heatmap refresh — plus the store reactions: guide sync,
 * and cleaning up (animation, time machine, armed tools) on page switches, tool changes and closing the panel.
 */
import type * as fabric from 'fabric';
import { getPreset } from '../../brushConfig';
import { drawingState } from '../../pencilStyle';
import { installSymmetryPreview } from '../../brushes/symmetryPreview';
import type { SymmetryPeers } from '../createSymmetrySlice';
import { attachSymmetrySnap, type createSymmetryCheck } from './symmetryCheck';
import { createSymmetryGuide } from './symmetryGuide';
import { attachSymmetryLinks } from './symmetryLinkActions';
import { attachSymmetryPointer } from './symmetryPointer';
import { attachSymmetryWand } from './symmetryShapeTools';
import { attachSymmetryStamps } from './symmetryStamps';
import { paintTimeMachine } from './symmetryPlay';
import { symmetryPlanOf } from './symmetrySetup';
import type { createSymmetryAnimation } from './symmetryAnimation';

type Set = (partial: Record<string, unknown>, replace: false, action: string) => void;
type Store = { subscribe?: (l: (s: unknown, p: unknown) => void) => unknown };

const GUIDE_INPUTS = [
    'activeTool',
    'canvas',
    'symmetry',
    'symmetryCenter',
    'symmetryAngle',
    'symmetryCount',
    'symmetrySource',
    'symmetryEdge',
    'symmetryBox',
    'symmetryObjectId',
    'symmetryPins',
    'symmetryPinId',
    'symmetryOptions',
    'symmetryChain',
    'symmetryCurveId',
    'symmetryPanelOpen',
    'zoom',
    'isPageSwitching',
    '_isRestoring', // undo / redo reloads the page and clears the guide with it
    'currentPageId',
    'pageWidth',
    'pageHeight',
] as const;

export function wireSymmetryBoard(o: {
    set: Set;
    store: Store | undefined;
    peers: () => SymmetryPeers;
    check: ReturnType<typeof createSymmetryCheck>;
    anim: ReturnType<typeof createSymmetryAnimation>;
}) {
    const { set, store, peers, check, anim } = o;
    const guide = createSymmetryGuide(peers);
    let detach: (() => void) | null = null;
    let syncFrame = 0;
    let heatFrame = 0;

    const soon = (fn: () => void, which: 'sync' | 'heat') => {
        if (typeof requestAnimationFrame !== 'function') return fn();
        if (which === 'sync' && !syncFrame)
            syncFrame = requestAnimationFrame(() => {
                syncFrame = 0;
                fn();
            });
        if (which === 'heat' && !heatFrame)
            heatFrame = requestAnimationFrame(() => {
                heatFrame = 0;
                fn();
            });
    };

    const attach = (canvas: fabric.Canvas) => {
        const offs: (() => void)[] = [];
        offs.push(
            attachSymmetryPointer(canvas, peers, {
                moveCenter: (p) => {
                    const s = peers();
                    // dragging the centre of a page / selection / object source makes it a free centre there
                    if (s.symmetrySource !== 'free')
                        set({ symmetrySource: 'free' }, false, 'symmetry/source');
                    s.updateBrush?.({ symmetryCenter: { x: p.x, y: p.y } });
                },
                movePin: (id, p) => peers().updateSymmetryPin(id, { x: p.x, y: p.y }),
                turnPin: (id, angle) => peers().updateSymmetryPin(id, { angle }),
            }),
        );
        offs.push(
            installSymmetryPreview(canvas, () => {
                const s = peers();
                if (!s.symmetryOptions.preview) return [];
                const st = drawingState(s as never) as { symmetry?: string; brush?: string };
                if (!st.symmetry || st.symmetry === 'none') return [];
                if (st.brush && getPreset(st.brush).engine === 'eraser') return [];
                return symmetryPlanOf(s)?.matrices ?? [];
            }),
        );
        offs.push(attachSymmetryLinks(canvas, peers));
        offs.push(attachSymmetrySnap(canvas, peers));
        offs.push(attachSymmetryWand(canvas, peers, () => peers().armSymmetryWand(false)));
        offs.push(attachSymmetryStamps(canvas, peers, () => peers().armSymmetryStamp(null)));
        const onObject = (e: { target?: fabric.FabricObject & { _isHelper?: boolean } }) => {
            const s = peers();
            if (e?.target?._isHelper || s.symmetryAnimating) return;
            if (s.symmetrySource === 'object' || s.symmetry === 'curve') soon(guide.sync, 'sync');
            if (s.symmetryHeatmap) soon(check.paintHeatmap, 'heat');
        };
        for (const ev of [
            'object:moving',
            'object:scaling',
            'object:rotating',
            'object:modified',
            'object:added',
            'object:removed',
        ])
            offs.push(canvas.on(ev as never, onObject as never));
        return () => offs.forEach((off) => off());
    };

    store?.subscribe?.((state, prevState) => {
        const next = state as SymmetryPeers;
        const prev = prevState as SymmetryPeers;
        if (next.canvas !== prev.canvas) {
            anim.stop();
            detach?.();
            detach = next.canvas ? attach(next.canvas) : null;
            guide.remove(prev.canvas);
        }
        const pageChanged =
            next.currentPageId !== prev.currentPageId ||
            next.isPageSwitching !== prev.isPageSwitching;
        const closed = prev.symmetryPanelOpen && !next.symmetryPanelOpen;
        if (pageChanged || closed || next.activeTool !== prev.activeTool) {
            if (next.symmetryTimeStep !== null) peers().setSymmetryTimeStep(null);
            if (next.symmetryAnimating && (pageChanged || closed)) anim.stop();
        }
        if (closed) {
            if (next.symmetryWandArmed) peers().armSymmetryWand(false);
            if (next.symmetryStampArmed) peers().armSymmetryStamp(null);
            if (next.symmetrySound !== 'off') void peers().listenSymmetrySound('off');
            if (next.symmetryHeatmap) peers().setSymmetryHeatmap(false);
        }
        if (pageChanged && next.symmetryHeatmap && !next.isPageSwitching)
            soon(check.paintHeatmap, 'heat');
        if (next.zoom !== prev.zoom && next.symmetryTimeStep !== null && next.canvas)
            paintTimeMachine(next.canvas, next.symmetryTimeStep);
        if (GUIDE_INPUTS.some((key) => next[key] !== prev[key])) {
            guide.sync();
            // a design zoom resizes the board after this change: redo the handle sizes next frame
            if (next.zoom !== prev.zoom) soon(guide.sync, 'sync');
        }
    });
}
