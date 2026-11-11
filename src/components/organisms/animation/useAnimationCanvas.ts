import { useEffect, useMemo, useState } from 'react';
import type { FabricObject } from 'fabric';
import { useStore } from '@store';
import { getAnimId, isTextObject, labelOf } from '@/animation/engine';

/** What the panel needs to know about the objects selected on the canvas. */
export interface AnimSelection {
    count: number;
    hasText: boolean;
    /** animIds of the selected objects that have one (an object gets it with its first keyframe) */
    ids: string[];
    /** stays the same while the same animated objects are selected */
    key: string;
    /** "Rectangle", "3 objects"; empty when nothing is selected */
    label: string;
}

export function describeSelection(objects: FabricObject[]): AnimSelection {
    const ids = objects.map(getAnimId).filter((id): id is string => !!id);
    return {
        count: objects.length,
        hasText: objects.some(isTextObject),
        ids,
        key: ids.join(','),
        label:
            objects.length === 1
                ? labelOf(objects[0])
                : objects.length
                  ? `${objects.length} objects`
                  : '',
    };
}

/** The canvas selection, kept in step with the selection events. */
export function useCanvasSelection(): AnimSelection {
    const canvas = useStore((s) => s.canvas);
    const tracks = useStore((s) => s.tracks); // animIds appear with the first keyframe
    const [objects, setObjects] = useState<FabricObject[]>([]);

    useEffect(() => {
        if (!canvas) return;
        const update = () => setObjects(canvas.getActiveObjects());
        update();
        const offs = [
            canvas.on('selection:created', update),
            canvas.on('selection:updated', update),
            canvas.on('selection:cleared', update),
        ];
        return () => offs.forEach((off) => off());
    }, [canvas]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => describeSelection(objects), [objects, tracks]);
}

/** animIds of the objects on the canvas: the track of a deleted object is shown struck out. */
export function usePresentIds(): Set<string> {
    const canvas = useStore((s) => s.canvas);
    const tracks = useStore((s) => s.tracks);
    const [version, setVersion] = useState(0);

    useEffect(() => {
        if (!canvas) return;
        const bump = () => setVersion((v) => v + 1);
        const offs = [canvas.on('object:added', bump), canvas.on('object:removed', bump)];
        return () => offs.forEach((off) => off());
    }, [canvas]);

    return useMemo(
        () => new Set(canvas?.getObjects().map((o) => getAnimId(o) ?? '') ?? []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [canvas, tracks, version],
    );
}
