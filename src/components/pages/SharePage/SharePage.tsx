import { useLayoutEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import * as fabric from 'fabric';
import db from 'opendb-store';

export default function SharePage() {
    const canvasRef = useRef<fabric.Canvas | null>(null);
    const canvasElRef = useRef<HTMLCanvasElement | null>(null);
    const initializedRef = useRef(false);

    const { docId } = useParams();
    const [params] = useSearchParams();
    const mode = (params.get('mode') as 'view' | 'edit') || 'view';

    useLayoutEffect(() => {
        if (!canvasElRef.current) return;
        if (initializedRef.current) return;

        initializedRef.current = true;

        const canvas = new fabric.Canvas(canvasElRef.current, {
            backgroundColor: '#fff',
            preserveObjectStacking: true,
        });

        canvasRef.current = canvas;

        const raw = db.local.get(`board:${docId}`);
        if (!raw) return;

        const { canvasJSON } = JSON.parse(raw);

        canvas.loadFromJSON(canvasJSON, () => {
            const readOnly = mode === 'view';

            canvas.selection = !readOnly;
            canvas.forEachObject((obj) => {
                obj.selectable = !readOnly;
                obj.evented = !readOnly;
            });

            canvas.requestRenderAll();
        });

        return () => {
            // IMPORTANT: guard cleanup
            if (canvasRef.current) {
                canvasRef.current.dispose();
                canvasRef.current = null;
                initializedRef.current = false;
            }
        };
    }, [docId, mode]);

    return (
        <div className="flex justify-center items-center">
            <canvas
                ref={canvasElRef}
                className="flex-1"
                height={window.innerHeight}
                width={window.innerWidth}
            />
        </div>
    );
}
