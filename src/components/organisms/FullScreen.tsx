import { useState, useEffect } from 'react';

export function Fullscreen({ canvas }) {
    const [isFull, setIsFull] = useState(false);
    const [originalSize, setOriginalSize] = useState({ width: 800, height: 500 });

    const toggleFullScreen = () => {
        if (!canvas) return;

        const canvasEl = canvas.lowerCanvasEl;
        if (!document.fullscreenElement) {
            setOriginalSize({ width: canvas.width, height: canvas.height });
            canvasEl.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    };

    const resizeCanvas = () => {
        if (!canvas) return;

        const canvasEl = canvas.lowerCanvasEl;
        if (!canvasEl) return;

        if (document.fullscreenElement) {
            // Fullscreen size
            const width = window.innerWidth;
            const height = window.innerHeight;

            const scaleX = width / canvas.width;
            const scaleY = height / canvas.height;

            canvas.setWidth(width);
            canvas.setHeight(height);

            // Scale content
            canvas.getObjects().forEach((obj) => {
                obj.scaleX *= scaleX;
                obj.scaleY *= scaleY;
                obj.left *= scaleX;
                obj.top *= scaleY;
                obj.setCoords();
            });

            canvas.requestRenderAll();
        } else {
            // Restore original size
            const { width, height } = originalSize;
            const scaleX = width / canvas.width;
            const scaleY = height / canvas.height;

            canvas.setWidth(width);
            canvas.setHeight(height);

            canvas.getObjects().forEach((obj) => {
                obj.scaleX *= scaleX;
                obj.scaleY *= scaleY;
                obj.left *= scaleX;
                obj.top *= scaleY;
                obj.setCoords();
            });

            canvas.requestRenderAll();
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFull(!!document.fullscreenElement);
            resizeCanvas();
        };

        window.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('resize', resizeCanvas);

        return () => {
            window.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [canvas]);

    return (
        <button
            onClick={toggleFullScreen}
            className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-100 flex items-center gap-1"
            title="Toggle Fullscreen"
        >
            <i className={`fa-solid ${isFull ? 'fa-compress' : 'fa-expand'}`}></i>
        </button>
    );
}
