import { Suspense, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import * as fabric from 'fabric';
import { init } from './CanvasBoard.slice';
import * as Page from './Page.slice';

const CanvasBoard = () => {
    const canvasRef = useRef(null);
    const dispatch = useDispatch();

    const onChangeSelection = (e) => {
        console.log('Selection changed:....', e.target);
    };

    const clearToolbar = () => {};

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = new fabric.Canvas(canvasRef.current, {
            backgroundColor: '#fff',
            preserveObjectStacking: false,
        });

        dispatch(init(canvas));
        if ((Page as any)?.setPageFormat) {
            dispatch((Page as any).setPageFormat({ format: 'A4', orientation: 'LANDSCAPE' }));
        }

        canvas.on('selection:created', onChangeSelection);
        canvas.on('selection:updated', onChangeSelection);
        canvas.on('selection:cleared', clearToolbar);
        canvas.on('mouse:down', onChangeSelection);

        return () => {
            if (canvas) {
                canvas.dispose();
            }
        };
    }, [canvasRef]);

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <main className="bg-white shadow-lg relative">
                <canvas ref={canvasRef} />
            </main>
        </Suspense>
    );
};

export default CanvasBoard;
