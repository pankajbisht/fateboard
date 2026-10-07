import React from 'react';

/* =========================================================
   MINI WHITEBOARD
========================================================= */

function MiniWhiteboard() {
    type Tool = 'pen' | 'rectangle' | 'circle';

    type Point = {
        x: number;
        y: number;
    };

    type Shape = {
        id: number;
        type: 'rectangle' | 'circle';
        x: number;
        y: number;
        width: number;
        height: number;
        color: string;
    };

    const [tool, setTool] = React.useState<Tool>('pen');
    const [color, setColor] = React.useState('#4f46e5');

    const [shapes, setShapes] = React.useState<Shape[]>([]);

    const [drawing, setDrawing] = React.useState(false);

    const [startPoint, setStartPoint] = React.useState<Point | null>(null);

    const [currentPoint, setCurrentPoint] = React.useState<Point | null>(null);

    const [points, setPoints] = React.useState<Point[]>([]);

    const canvasRef = React.useRef<HTMLDivElement>(null);

    /* =========================================================
       GET POINTER POSITION
    ========================================================= */

    const getPosition = (event: React.PointerEvent<HTMLDivElement>): Point => {
        const rect = canvasRef.current?.getBoundingClientRect();

        if (!rect) {
            return {
                x: 0,
                y: 0,
            };
        }

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    /* =========================================================
       POINTER DOWN
    ========================================================= */

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        event.currentTarget.setPointerCapture(event.pointerId);

        const position = getPosition(event);

        setDrawing(true);

        setStartPoint(position);
        setCurrentPoint(position);

        if (tool === 'pen') {
            setPoints([position]);
        }
    };

    /* =========================================================
       POINTER MOVE
    ========================================================= */

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!drawing) return;

        const position = getPosition(event);

        setCurrentPoint(position);

        if (tool === 'pen') {
            setPoints((current) => [...current, position]);
        }
    };

    /* =========================================================
       POINTER UP
    ========================================================= */

    const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!drawing || !startPoint) {
            return;
        }

        const position = getPosition(event);

        if (tool === 'pen') {
            setDrawing(false);
            setStartPoint(null);
            setCurrentPoint(null);

            return;
        }

        const width = Math.abs(position.x - startPoint.x);

        const height = Math.abs(position.y - startPoint.y);

        /*
         * Ignore tiny accidental clicks.
         */
        if (width < 8 || height < 8) {
            setDrawing(false);
            setStartPoint(null);
            setCurrentPoint(null);

            return;
        }

        const x = Math.min(startPoint.x, position.x);

        const y = Math.min(startPoint.y, position.y);

        setShapes((current) => [
            ...current,
            {
                id: Date.now(),
                type: tool === 'circle' ? 'circle' : 'rectangle',
                x,
                y,
                width,
                height,
                color,
            },
        ]);

        setDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
    };

    /* =========================================================
       POINTER CANCEL
    ========================================================= */

    const handlePointerCancel = () => {
        setDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
    };

    /* =========================================================
       CURRENT PREVIEW
    ========================================================= */

    const getPreview = () => {
        if (!drawing || !startPoint || !currentPoint || tool === 'pen') {
            return null;
        }

        const width = Math.abs(currentPoint.x - startPoint.x);

        const height = Math.abs(currentPoint.y - startPoint.y);

        const x = Math.min(startPoint.x, currentPoint.x);

        const y = Math.min(startPoint.y, currentPoint.y);

        return {
            x,
            y,
            width,
            height,
        };
    };

    const preview = getPreview();

    /* =========================================================
       CLEAR CANVAS
    ========================================================= */

    const clearCanvas = () => {
        setShapes([]);
        setPoints([]);
        setDrawing(false);
        setStartPoint(null);
        setCurrentPoint(null);
    };

    return (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-indigo-100">
            {/* =================================================
                TOOLBAR
            ================================================= */}

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
                {/* Tools */}

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setTool('pen')}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                            tool === 'pen'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                        }`}
                        title="Pencil"
                    >
                        ✎
                    </button>

                    <button
                        type="button"
                        onClick={() => setTool('rectangle')}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl transition ${
                            tool === 'rectangle'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                        }`}
                        title="Rectangle"
                    >
                        □
                    </button>

                    <button
                        type="button"
                        onClick={() => setTool('circle')}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl transition ${
                            tool === 'circle'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                        }`}
                        title="Circle"
                    >
                        ○
                    </button>
                </div>

                {/* Colors */}

                <div className="flex items-center gap-2">
                    {['#4f46e5', '#111827', '#64748b', '#94a3b8'].map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setColor(item)}
                            aria-label={`Select ${item}`}
                            className={`h-5 w-5 rounded-full border-2 border-white shadow ring-1 transition ${
                                color === item ? 'scale-125 ring-indigo-500' : 'ring-gray-200'
                            }`}
                            style={{
                                backgroundColor: item,
                            }}
                        />
                    ))}
                </div>

                {/* Clear */}

                <button
                    type="button"
                    onClick={clearCanvas}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-500"
                >
                    Clear
                </button>
            </div>

            {/* =================================================
                CANVAS
            ================================================= */}

            <div
                ref={canvasRef}
                className={`relative h-[320px] touch-none select-none overflow-hidden bg-white sm:h-[400px] ${
                    tool === 'pen' ? 'cursor-crosshair' : 'cursor-crosshair'
                }`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
            >
                {/* =================================================
                    GRID
                ================================================= */}

                <div
                    className="pointer-events-none absolute inset-0 opacity-50"
                    style={{
                        backgroundImage: `
                            linear-gradient(
                                #e5e7eb 1px,
                                transparent 1px
                            ),
                            linear-gradient(
                                90deg,
                                #e5e7eb 1px,
                                transparent 1px
                            )
                            `,
                        backgroundSize: '28px 28px',
                    }}
                />

                {/* =================================================
                    EMPTY STATE
                ================================================= */}

                {shapes.length === 0 && points.length === 0 && !drawing && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="mb-3 text-3xl text-indigo-200">✦</div>

                            <p className="text-sm font-medium text-gray-400">Start drawing here</p>

                            <p className="mt-1 text-xs text-gray-400">
                                Choose a tool and drag on the canvas
                            </p>
                        </div>
                    </div>
                )}

                {/* =================================================
                    SAVED SHAPES
                ================================================= */}

                {shapes.map((shape) => (
                    <div
                        key={shape.id}
                        className="pointer-events-none absolute"
                        style={{
                            left: shape.x,
                            top: shape.y,
                            width: shape.width,
                            height: shape.height,
                            border: `3px solid ${shape.color}`,
                            borderRadius: shape.type === 'circle' ? '50%' : '12px',
                            boxSizing: 'border-box',
                        }}
                    />
                ))}

                {/* =================================================
                    SHAPE PREVIEW
                ================================================= */}

                {preview && (
                    <div
                        className="pointer-events-none absolute"
                        style={{
                            left: preview.x,
                            top: preview.y,
                            width: preview.width,
                            height: preview.height,
                            border: `3px dashed ${color}`,
                            borderRadius: tool === 'circle' ? '50%' : '12px',
                            boxSizing: 'border-box',
                            opacity: 0.65,
                        }}
                    />
                )}

                {/* =================================================
                    FREEHAND DRAWING
                ================================================= */}

                {points.length > 1 && (
                    <svg className="pointer-events-none absolute inset-0 h-full w-full">
                        <polyline
                            points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                            fill="none"
                            stroke={color}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}

                {/* =================================================
                    TOOL INDICATOR
                ================================================= */}

                <div className="pointer-events-none absolute bottom-5 left-5 rounded-full border border-gray-200 bg-white/90 px-3 py-2 text-xs font-medium text-gray-500 shadow-lg backdrop-blur">
                    {tool === 'pen' && '✎ Pencil'}
                    {tool === 'rectangle' && '□ Rectangle'}
                    {tool === 'circle' && '○ Circle'}
                </div>

                {/* =================================================
                    INTERACTIVE INDICATOR
                ================================================= */}

                <div className="pointer-events-none absolute bottom-5 right-5 hidden items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-2 text-xs text-gray-500 shadow-lg backdrop-blur sm:flex">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                    Interactive canvas
                </div>
            </div>
        </div>
    );
}

export default MiniWhiteboard;
