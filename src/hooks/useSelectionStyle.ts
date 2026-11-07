import { useCallback, useEffect, useMemo, useState } from 'react';
import type * as fabric from 'fabric';
import { useStore } from '@store';
import { readFill, readShadow, type FillSnapshot, type ShadowStyle } from '@/lib/fillStyle';
import { collectPaintTargets } from '@/store/slices/colorSystemFixes';

export type SelectionStyle = {
    count: number;
    fill: FillSnapshot;
    shadow: ShadowStyle | null;
    /** Images have no fill to paint. */
    canFill: boolean;
    /** Object opacity 0..1 (the selection itself, not the painted child). */
    opacity: number;
};

const EVENTS = [
    'selection:created',
    'selection:updated',
    'selection:cleared',
    'object:modified',
] as const;

type Helperish = fabric.FabricObject & { isGradientHelper?: boolean };

function read(
    canvas: fabric.Canvas | null,
    geditor: { activeObj?: fabric.FabricObject | null } | null,
) {
    const active = (canvas?.getActiveObjects?.() ?? []) as Helperish[];
    // while dragging a gradient handle, the handle is "active": style the shape being edited
    const objects = active.some((o) => o.isGradientHelper)
        ? geditor?.activeObj
            ? [geditor.activeObj]
            : []
        : active;
    const first = objects[0];
    if (!first) return null;
    // groups ignore their own fill: read the child the fill actions paint (same rule as painting)
    const painted = (collectPaintTargets([first], 'fill')[0] ?? first) as fabric.FabricObject;
    return {
        count: objects.length,
        fill: readFill(painted),
        shadow: readShadow(first),
        canFill: (painted.type || '').toLowerCase() !== 'image',
        opacity: first.opacity ?? 1,
    } satisfies SelectionStyle;
}

/**
 * Live fill + shadow of the selection, read from the Fabric canvas (source of truth).
 * Re-reads on selection / modify events and when the on-canvas gradient tool edits a fill
 * (`fillRevision`). Call `refresh()` after a store action that changed the object.
 */
export function useSelectionStyle(): [SelectionStyle | null, () => void] {
    const canvas = useStore((s) => s.canvas) as fabric.Canvas | null;
    const geditor = useStore((s) => s.geditor) as { activeObj?: fabric.FabricObject | null } | null;
    const revision = useStore((s) => (s as { fillRevision?: number }).fillRevision ?? 0);
    const [version, setVersion] = useState(0);
    const refresh = useCallback(() => setVersion((v) => v + 1), []);

    useEffect(() => {
        if (!canvas?.on) return;
        EVENTS.forEach((name) => canvas.on(name, refresh));
        return () => EVENTS.forEach((name) => canvas.off?.(name, refresh));
    }, [canvas, refresh]);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- version / revision are change signals
    const style = useMemo(() => read(canvas, geditor), [canvas, geditor, version, revision]);
    return [style, refresh];
}
