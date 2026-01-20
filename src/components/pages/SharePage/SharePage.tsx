import { useLayoutEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as fabric from 'fabric';

export default function SharePage() {
    const { docId } = useParams();
    const canvasRef = useRef<fabric.Canvas | null>(null);
    const canvasElRef = useRef<HTMLCanvasElement>(null);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useLayoutEffect(() => {
        const initCanvas = async () => {
            const canvasEl = canvasElRef.current;
            if (!canvasEl) {
                setError('Canvas element not found');
                setLoading(false);
                return;
            }

            if (!docId) {
                setError('Invalid link');
                setLoading(false);
                return;
            }

            const raw = localStorage.getItem(`board:${docId}`);
            if (!raw) {
                setError('Board not found');
                setLoading(false);
                return;
            }

            let doc;
            try {
                doc = JSON.parse(raw);
                if (!doc.canvasJSON) throw new Error();
            } catch {
                setError('Invalid board data');
                setLoading(false);
                return;
            }

            try {
                const canvas = new fabric.Canvas(canvasEl, {
                    width: 900,
                    height: 500,
                    backgroundColor: '#fff',
                });
                canvasRef.current = canvas;

                // Load JSON async
                await new Promise<void>((resolve, reject) => {
                    canvas.loadFromJSON(
                        doc.canvasJSON,
                        () => {
                            canvas.renderAll();
                            resolve();
                        },
                        (err) => reject(err),
                    );
                });

                setLoading(false);
            } catch (e) {
                console.error(e);
                setError('Failed to render canvas');
                setLoading(false);
            }
        };

        initCanvas();

        return () => {
            if (canvasRef.current) {
                canvasRef.current.dispose();
                canvasRef.current = null;
            }
        };
    }, [docId]);

    if (loading) return <h2 className="p-4">Loading shared canvas...</h2>;
    if (error) return <h2 className="p-4 text-red-600 font-bold">{error}</h2>;

    return (
        <div className="p-4">
            <h2 className="text-lg font-bold mb-2">Shared Canvas</h2>
            <canvas ref={canvasElRef} />
        </div>
    );
}
