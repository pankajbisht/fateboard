/**
 * Render plan for document layers (pure, 2026-11-17). Turns the layer tree into steps the compositor
 * (lib/canvas/layerCompositor) runs bottom-first:
 * - `leaf`: draw the layer's objects straight onto the target (plain layers: no buffer, no extra cost);
 * - `group`: draw the steps into a buffer, then composite it once with opacity + blend (a layer or folder with
 *   opacity < 1 or a blend mode; a plain folder passes through);
 * - `clip`: a base layer plus the layers clipped to it (Photoshop / Clip Studio clipping): each clipped layer
 *   shows only where the base has paint, then the result composites with the base's opacity + blend.
 */
import { childrenOf, type DocLayer, type LayerBlend } from './docLayers';

export type ClippedLayer = { id: string; opacity: number; blend: LayerBlend };
export type Step =
    | { kind: 'leaf'; id: string }
    | { kind: 'group'; id: string; opacity: number; blend: LayerBlend; steps: Step[] }
    | {
          kind: 'clip';
          id: string;
          base: string;
          opacity: number;
          blend: LayerBlend;
          clipped: ClippedLayer[];
      };

const isolated = (l: DocLayer) => l.opacity < 1 || l.blend !== 'normal';

/** Is there a non-clip layer below position i (through other clip layers) for a clip layer to attach to? */
function hasBase(kids: DocLayer[], i: number): boolean {
    for (let j = i - 1; j >= 0; j--) {
        if (kids[j].kind !== 'layer') return false;
        if (!kids[j].clip) return true;
    }
    return false;
}

export function planLayers(layers: DocLayer[], parentId: string | null = null): Step[] {
    const kids = childrenOf(layers, parentId);
    const steps: Step[] = [];
    for (let i = 0; i < kids.length; i++) {
        const l = kids[i];
        if (l.kind === 'layer' && l.clip && hasBase(kids, i)) continue; // drawn with its base
        if (!l.visible || l.opacity <= 0) continue;
        if (l.kind === 'folder') {
            const inner = planLayers(layers, l.id);
            if (!inner.length) continue;
            if (isolated(l))
                steps.push({
                    kind: 'group',
                    id: l.id,
                    opacity: l.opacity,
                    blend: l.blend,
                    steps: inner,
                });
            else steps.push(...inner);
            continue;
        }
        const clipped: ClippedLayer[] = [];
        for (let j = i + 1; j < kids.length && kids[j].kind === 'layer' && kids[j].clip; j++)
            if (kids[j].visible && kids[j].opacity > 0)
                clipped.push({ id: kids[j].id, opacity: kids[j].opacity, blend: kids[j].blend });
        if (clipped.length)
            steps.push({
                kind: 'clip',
                id: l.id,
                base: l.id,
                opacity: l.opacity,
                blend: l.blend,
                clipped,
            });
        else if (isolated(l))
            steps.push({
                kind: 'group',
                id: l.id,
                opacity: l.opacity,
                blend: l.blend,
                steps: [{ kind: 'leaf', id: l.id }],
            });
        else steps.push({ kind: 'leaf', id: l.id });
    }
    return steps;
}

/** Every leaf layer a step draws. */
export function stepLeaves(step: Step): string[] {
    if (step.kind === 'leaf') return [step.id];
    if (step.kind === 'clip') return [step.base, ...step.clipped.map((c) => c.id)];
    return step.steps.flatMap(stepLeaves);
}

/** A step that can be pre-drawn into one transparent picture and laid "over" what is below it. */
const overSafe = (s: Step) => s.kind === 'leaf' || s.blend === 'normal';

/**
 * While one layer is being dragged: the top-level steps below the edited layers (cached as one picture), the
 * ones that must redraw every frame, and the ones above (cached too when `aboveSafe`: no step blends with
 * what is under it). Null when no step draws an edited layer.
 */
export function splitForCache(
    steps: Step[],
    live: Set<string>,
): { below: Step[]; live: Step[]; above: Step[]; aboveSafe: boolean } | null {
    const hit = steps.map((s) => stepLeaves(s).some((id) => live.has(id)));
    const first = hit.indexOf(true);
    if (first < 0) return null;
    const last = hit.lastIndexOf(true);
    const above = steps.slice(last + 1);
    return {
        below: steps.slice(0, first),
        live: steps.slice(first, last + 1),
        above,
        aboveSafe: above.every(overSafe),
    };
}
