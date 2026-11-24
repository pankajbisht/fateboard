import { useEffect, useState } from 'react';
import type * as fabric from 'fabric';

/**
 * Keeps React in sync with the Fabric selection.
 * (Reading canvas.getActiveObject() during render is not reactive, so the old
 * panel stayed disabled / stale after you clicked another shape.)
 */
export const useActiveObjects = (canvas?: fabric.Canvas | null) => {
    const [objects, setObjects] = useState<fabric.Object[]>([]);

    useEffect(() => {
        if (!canvas) {
            setObjects([]);
            return;
        }
        const sync = () => setObjects(canvas.getActiveObjects());
        sync();
        const disposers = [
            canvas.on('selection:created', sync),
            canvas.on('selection:updated', sync),
            canvas.on('selection:cleared', sync),
        ];
        return () => disposers.forEach((off) => off());
    }, [canvas]);

    return objects;
};
