import React from 'react';
import Brand from '../../atoms/Brand';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../../lib/utils/usePageTitle';

interface ImageSliderProps {
    images: string[];
}

/* =========================================================
   IMAGE SLIDER
========================================================= */

function ImageSlider({ images }: ImageSliderProps) {
    const [index, setIndex] = React.useState(0);
    const [isZoomed, setIsZoomed] = React.useState(false);
    const [isPaused, setIsPaused] = React.useState(false);

    const total = images.length;

    const next = React.useCallback(() => {
        setIndex((current) => (current + 1) % total);
    }, [total]);

    const previous = React.useCallback(() => {
        setIndex((current) => (current === 0 ? total - 1 : current - 1));
    }, [total]);

    /* =========================================================
       AUTOPLAY
    ========================================================= */

    React.useEffect(() => {
        if (isPaused || isZoomed || total <= 1) {
            return;
        }

        const timer = window.setInterval(next, 5000);

        return () => window.clearInterval(timer);
    }, [next, isPaused, isZoomed, total]);

    /* =========================================================
       KEYBOARD
    ========================================================= */

    React.useEffect(() => {
        const handleKeyboard = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsZoomed(false);
                return;
            }

            if (event.key === 'ArrowRight') {
                next();
            }

            if (event.key === 'ArrowLeft') {
                previous();
            }
        };

        window.addEventListener('keydown', handleKeyboard);

        return () => {
            window.removeEventListener('keydown', handleKeyboard);
        };
    }, [next, previous]);

    if (!images.length) {
        return null;
    }

    return (
        <>
            <div
                className="relative"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {/* =================================================
                    BACKGROUND GLOW
                ================================================= */}

                <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-indigo-500/10 blur-3xl" />

                <div className="relative">
                    {/* =================================================
                        LABEL
                    ================================================= */}

                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-200">
                                F
                            </span>

                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">
                                    Fateboard
                                </p>

                                <p className="text-xs text-gray-400">Canvas preview</p>
                            </div>
                        </div>

                        <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm sm:flex">
                            <span
                                className={`h-2 w-2 rounded-full ${
                                    isPaused ? 'bg-gray-400' : 'animate-pulse bg-indigo-500'
                                }`}
                            />

                            {isPaused ? 'Paused' : 'Auto preview'}
                        </div>
                    </div>

                    {/* =================================================
                        BROWSER FRAME
                    ================================================= */}

                    <div className="overflow-hidden rounded-[1.75rem] border border-gray-200/80 bg-white shadow-[0_25px_80px_-25px_rgba(79,70,229,0.35)]">
                        {/* Browser toolbar */}

                        <div className="flex h-12 items-center border-b border-gray-200 bg-gray-50/90 px-4">
                            <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                            </div>

                            <div className="mx-auto flex h-7 max-w-xs flex-1 items-center justify-center rounded-lg border border-gray-200 bg-white px-3">
                                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                    <span className="text-indigo-500">✦</span>
                                    fateboard.app
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsZoomed(true)}
                                className="ml-3 hidden rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 sm:block"
                            >
                                ⛶
                            </button>
                        </div>

                        {/* =================================================
                            IMAGE AREA
                        ================================================= */}

                        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-gray-100 via-white to-indigo-50 p-3 sm:p-5">
                            {/* Decorative background */}
                            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-100/40 blur-3xl" />

                            {/* Screenshot */}
                            <div className="relative h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                                <img
                                    key={images[index]}
                                    src={images[index]}
                                    alt={`Fateboard canvas preview ${index + 1}`}
                                    className="h-full w-full object-contain transition-all duration-700 ease-out"
                                />

                                {/* Top overlay */}
                                <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/10 to-transparent" />
                            </div>

                            {/* =================================================
                                PREVIOUS BUTTON
                            ================================================= */}

                            <button
                                type="button"
                                onClick={previous}
                                aria-label="Previous screenshot"
                                className="group absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 text-gray-600 opacity-0 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-indigo-600 hover:text-white focus:opacity-100 group-hover:opacity-100"
                            >
                                <span className="text-lg transition-transform group-hover:-translate-x-0.5">
                                    ←
                                </span>
                            </button>

                            {/* =================================================
                                NEXT BUTTON
                            ================================================= */}

                            <button
                                type="button"
                                onClick={next}
                                aria-label="Next screenshot"
                                className="group absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 text-gray-600 opacity-0 shadow-xl backdrop-blur-md transition-all duration-300 hover:scale-110 hover:bg-indigo-600 hover:text-white focus:opacity-100 group-hover:opacity-100"
                            >
                                <span className="text-lg transition-transform group-hover:translate-x-0.5">
                                    →
                                </span>
                            </button>

                            {/* =================================================
                                IMAGE COUNTER
                            ================================================= */}

                            <div className="absolute bottom-7 right-7 rounded-full border border-white/60 bg-gray-900/70 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg backdrop-blur-md">
                                <span className="text-white">
                                    {String(index + 1).padStart(2, '0')}
                                </span>

                                <span className="mx-1 text-white/40">/</span>

                                <span className="text-white/60">
                                    {String(total).padStart(2, '0')}
                                </span>
                            </div>
                        </div>

                        {/* =================================================
                            PROGRESS BAR
                        ================================================= */}

                        <div className="h-0.5 bg-gray-100">
                            {!isPaused && (
                                <div
                                    key={index}
                                    className="h-full origin-left bg-indigo-600"
                                    style={{
                                        animation: 'sliderProgress 5s linear',
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* =================================================
                        THUMBNAILS
                    ================================================= */}

                    <div className="mt-5 flex items-center gap-3">
                        <div className="flex min-w-0 flex-1 gap-3 overflow-x-auto pb-1">
                            {images.map((image, imageIndex) => {
                                const active = imageIndex === index;

                                return (
                                    <button
                                        key={image}
                                        type="button"
                                        onClick={() => setIndex(imageIndex)}
                                        className={`group relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all duration-300 sm:h-20 sm:w-28 ${
                                            active
                                                ? 'border-indigo-600 shadow-lg shadow-indigo-100'
                                                : 'border-gray-200 opacity-60 hover:border-indigo-300 hover:opacity-100'
                                        }`}
                                    >
                                        <img
                                            src={image}
                                            alt={`Preview ${imageIndex + 1}`}
                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                        />

                                        {active && (
                                            <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-600" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Thumbnail counter */}

                        <div className="hidden shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 shadow-sm sm:block">
                            {index + 1} / {total}
                        </div>
                    </div>

                    {/* =================================================
                        DOTS
                    ================================================= */}

                    <div className="mt-5 flex justify-center gap-1.5">
                        {images.map((_, imageIndex) => (
                            <button
                                key={imageIndex}
                                type="button"
                                onClick={() => setIndex(imageIndex)}
                                aria-label={`Go to screenshot ${imageIndex + 1}`}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    imageIndex === index
                                        ? 'w-8 bg-indigo-600'
                                        : 'w-1.5 bg-gray-300 hover:bg-indigo-300'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* =========================================================
                ZOOM MODAL
            ========================================================= */}

            {isZoomed && (
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-950/90 p-4 backdrop-blur-xl"
                    onClick={() => setIsZoomed(false)}
                >
                    <button
                        type="button"
                        onClick={() => setIsZoomed(false)}
                        aria-label="Close preview"
                        className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl text-white transition hover:bg-white/20"
                    >
                        ×
                    </button>

                    <div
                        className="relative max-h-[90vh] max-w-[95vw] overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <img
                            src={images[index]}
                            alt={`Fateboard screenshot ${index + 1}`}
                            className="max-h-[86vh] max-w-[92vw] object-contain"
                        />
                    </div>
                </div>
            )}

            {/* =========================================================
                SLIDER ANIMATION
            ========================================================= */}

            <style>
                {`
                    @keyframes sliderProgress {
                        from {
                            transform: scaleX(0);
                        }

                        to {
                            transform: scaleX(1);
                        }
                    }
                `}
            </style>
        </>
    );
}

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

function MiniWhiteboard1() {
    const [tool, setTool] = React.useState<'pen' | 'square' | 'circle'>('pen');
    const [color, setColor] = React.useState('#4f46e5');
    const [objects, setObjects] = React.useState<
        {
            id: number;
            type: 'square' | 'circle';
            x: number;
            y: number;
        }[]
    >([]);

    const [drawing, setDrawing] = React.useState(false);
    const [points, setPoints] = React.useState<{ x: number; y: number }[]>([]);

    const canvasRef = React.useRef<HTMLDivElement>(null);

    const getPosition = (event: React.PointerEvent<HTMLDivElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();

        if (!rect) {
            return { x: 0, y: 0 };
        }

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        };
    };

    const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        const position = getPosition(event);

        if (tool === 'pen') {
            setDrawing(true);
            setPoints([position]);
            return;
        }

        setObjects((current) => [
            ...current,
            {
                id: Date.now(),
                type: tool,
                x: position.x,
                y: position.y,
            },
        ]);
    };

    const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!drawing || tool !== 'pen') return;

        const position = getPosition(event);

        setPoints((current) => [...current, position]);
    };

    const handlePointerUp = () => {
        setDrawing(false);
    };

    return (
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-indigo-100">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2">
                    {[
                        ['pen', '✎'],
                        ['square', '□'],
                        ['circle', '○'],
                    ].map(([value, icon]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setTool(value as 'pen' | 'square' | 'circle')}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                                tool === value
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
                            }`}
                        >
                            {icon}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {['#4f46e5', '#111827', '#64748b', '#94a3b8'].map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setColor(item)}
                            aria-label={`Select ${item}`}
                            className="h-5 w-5 rounded-full border-2 border-white shadow ring-1 ring-gray-200"
                            style={{ backgroundColor: item }}
                        />
                    ))}
                </div>
            </div>

            {/* Canvas */}
            <div
                ref={canvasRef}
                className="relative h-[320px] touch-none overflow-hidden bg-white sm:h-[400px]"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
            >
                {/* Grid */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-50"
                    style={{
                        backgroundImage:
                            'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
                        backgroundSize: '28px 28px',
                    }}
                />

                {/* Empty state */}
                {objects.length === 0 && points.length === 0 && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="mb-2 text-3xl text-indigo-200">✦</div>

                            <p className="text-sm font-medium text-gray-400">Start drawing here</p>

                            <p className="mt-1 text-xs text-gray-400">Try a shape or draw freely</p>
                        </div>
                    </div>
                )}

                {/* Shapes */}
                {objects.map((item) => (
                    <div
                        key={item.id}
                        className={`absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-[scaleIn_.3s_ease-out] ${
                            item.type === 'circle' ? 'rounded-full' : 'rounded-xl'
                        }`}
                        style={{
                            left: item.x,
                            top: item.y,
                            border: `3px solid ${color}`,
                        }}
                    />
                ))}

                {/* Freehand drawing */}
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

                {/* Decorative cursor */}
                <div className="pointer-events-none absolute bottom-6 right-6 hidden items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3 py-2 text-xs text-gray-500 shadow-lg sm:flex">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />
                    Interactive canvas
                </div>
            </div>
        </div>
    );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function WhiteboardMarketingSite() {
    usePageTitle('Online Whiteboard | Fateboard');

    const navigate = useNavigate();

    const handleStartDrawing = () => {
        navigate('/draw');
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);

        if (!element) return;

        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const features = [
        {
            icon: '◇',
            title: 'Shape Creation',
            description:
                'Draw rectangles, circles, arrows, and freehand shapes just like on a real whiteboard.',
        },
        {
            icon: '✦',
            title: 'Easy to Use',
            description:
                'No learning curve. Pick a tool, draw, and your idea comes to life instantly.',
        },
        {
            icon: '◉',
            title: 'Color Options',
            description:
                'Choose colors that feel right – soft, bold, or playful – to match your story.',
        },
    ];

    const useCases = [
        {
            number: '01',
            title: 'Brainstorming',
            description: 'Turn scattered thoughts into something you can actually see.',
        },
        {
            number: '02',
            title: 'Mind Mapping',
            description: 'Connect ideas visually and discover relationships naturally.',
        },
        {
            number: '03',
            title: 'Study & Notes',
            description: 'Make concepts easier to understand with simple visual notes.',
        },
        {
            number: '04',
            title: 'Planning',
            description: 'Sketch flows, layouts, ideas and plans without getting in your way.',
        },
    ];

    const images = [
        './web/blank_canvas.png',
        './web/draw_canvas.png',
        './web/shape_canvas.png',
        './web/text_canvas.png',
    ];

    return (
        <div className="min-h-screen overflow-x-hidden bg-gray-50 text-gray-800 antialiased">
            {/* =====================================================
                GLOBAL ANIMATION
            ===================================================== */}

            <style>
                {`
                    @keyframes float {
                        0%, 100% {
                            transform: translateY(0px) rotate(0deg);
                        }
                        50% {
                            transform: translateY(-14px) rotate(3deg);
                        }
                    }

                    @keyframes floatReverse {
                        0%, 100% {
                            transform: translateY(0px) rotate(0deg);
                        }
                        50% {
                            transform: translateY(12px) rotate(-3deg);
                        }
                    }

                    @keyframes pulseSoft {
                        0%, 100% {
                            opacity: .35;
                            transform: scale(1);
                        }
                        50% {
                            opacity: .6;
                            transform: scale(1.05);
                        }
                    }

                    @keyframes scaleIn {
                        from {
                            opacity: 0;
                            transform: translate(-50%, -50%) scale(.7);
                        }
                        to {
                            opacity: 1;
                            transform: translate(-50%, -50%) scale(1);
                        }
                    }

                    @keyframes fadeUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    .animate-float {
                        animation: float 6s ease-in-out infinite;
                    }

                    .animate-float-reverse {
                        animation: floatReverse 7s ease-in-out infinite;
                    }

                    .animate-pulse-soft {
                        animation: pulseSoft 5s ease-in-out infinite;
                    }

                    .animate-fade-up {
                        animation: fadeUp .8s ease-out both;
                    }

                    @media (prefers-reduced-motion: reduce) {
                        *,
                        *::before,
                        *::after {
                            animation-duration: .01ms !important;
                            animation-iteration-count: 1 !important;
                            scroll-behavior: auto !important;
                            transition-duration: .01ms !important;
                        }
                    }
                `}
            </style>

            {/* =====================================================
                HEADER
            ===================================================== */}

            <header className="fixed inset-x-0 top-0 z-[9999] border-b border-gray-200/70 bg-white/90 shadow-sm backdrop-blur-xl">
                <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
                    {/* Logo */}
                    <button
                        type="button"
                        onClick={() => scrollToSection('top')}
                        aria-label="Go to top"
                        className="shrink-0"
                    >
                        <Brand
                            src="fate.svg"
                            className="h-9 cursor-pointer transition-transform duration-300 hover:scale-105"
                        />
                    </button>

                    {/* Navigation */}
                    <nav className="flex items-center gap-1 sm:gap-2">
                        <button
                            type="button"
                            onClick={() => scrollToSection('features')}
                            className="hidden rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 sm:block"
                        >
                            Features
                        </button>

                        <button
                            type="button"
                            onClick={() => scrollToSection('interactive')}
                            className="hidden rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 sm:block"
                        >
                            Demo
                        </button>

                        <button
                            type="button"
                            onClick={() => scrollToSection('process')}
                            className="hidden rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-600 sm:block"
                        >
                            Action
                        </button>

                        <button
                            type="button"
                            onClick={handleStartDrawing}
                            className="ml-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl"
                        >
                            Start Drawing
                        </button>
                    </nav>
                </div>
            </header>

            <div id="top" className="scroll-mt-24" />

            {/* =====================================================
                HERO
            ===================================================== */}

            <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
                {/* Decorative shapes */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="animate-float absolute left-[8%] top-[18%] h-16 w-16 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm" />

                    <div className="animate-float-reverse absolute right-[10%] top-[20%] h-20 w-20 rounded-full border border-white/20 bg-white/10" />

                    <div className="animate-float absolute bottom-[14%] left-[14%] h-10 w-10 rotate-45 border border-white/20 bg-white/10" />

                    <div className="animate-pulse-soft absolute right-[20%] bottom-[10%] h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                </div>

                <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
                    <div className="mx-auto max-w-4xl text-center">
                        <div className="animate-fade-up mb-7 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md">
                            <span className="text-lg">✦</span>
                            Simple ideas. Powerful visuals.
                        </div>

                        <h1 className="animate-fade-up text-5xl font-black tracking-tight sm:text-7xl">
                            Draw the Fate.
                        </h1>

                        <p className="animate-fade-up mx-auto mt-7 max-w-2xl text-base leading-7 text-blue-50 sm:text-xl sm:leading-8">
                            Just start with a blank canvas and the freedom to move the draw fate.
                        </p>

                        <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                            <button
                                type="button"
                                onClick={handleStartDrawing}
                                className="group rounded-2xl bg-white px-7 py-3.5 font-bold text-indigo-600 shadow-2xl shadow-indigo-950/20 transition duration-300 hover:-translate-y-1 hover:shadow-3xl"
                            >
                                Start Now
                                <span className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1">
                                    →
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => scrollToSection('interactive')}
                                className="rounded-2xl border border-white/25 bg-white/10 px-7 py-3.5 font-semibold text-white backdrop-blur-md transition duration-300 hover:bg-white/20"
                            >
                                Try it first
                            </button>
                        </div>
                    </div>

                    {/* Floating visual */}
                    <div className="relative mx-auto mt-16 max-w-3xl">
                        <div className="animate-float rounded-3xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-md">
                            <div className="rounded-2xl bg-white p-5 shadow-xl">
                                <div className="mb-5 flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full bg-gray-200" />
                                    <span className="h-3 w-3 rounded-full bg-gray-200" />
                                    <span className="h-3 w-3 rounded-full bg-gray-200" />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="h-28 rounded-2xl bg-indigo-50" />

                                    <div className="flex h-28 items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200">
                                        <div className="h-14 w-14 rounded-full border-4 border-indigo-500" />
                                    </div>

                                    <div className="h-28 rounded-2xl bg-blue-50" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* =====================================================
                FEATURES
            ===================================================== */}

            <section id="features" className="scroll-mt-24 bg-white py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
                            Key Features
                        </p>

                        <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                            Everything you need to think visually.
                        </h2>

                        <p className="mt-5 text-base leading-7 text-gray-500">
                            No complicated tools. No unnecessary distractions. Just a canvas that
                            lets your ideas flow.
                        </p>
                    </div>

                    <div className="mt-16 grid gap-6 md:grid-cols-3">
                        {features.map((feature, index) => (
                            <div
                                key={feature.title}
                                className="group rounded-3xl border border-gray-200 bg-white p-7 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100"
                                style={{
                                    animationDelay: `${index * 100}ms`,
                                }}
                            >
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600 transition duration-500 group-hover:rotate-6 group-hover:scale-110">
                                    {feature.icon}
                                </div>

                                <h3 className="mt-7 text-xl font-bold text-gray-900">
                                    {feature.title}
                                </h3>

                                <p className="mt-3 leading-7 text-gray-500">
                                    {feature.description}
                                </p>

                                <div className="mt-7 h-1 w-10 rounded-full bg-indigo-600 transition-all duration-500 group-hover:w-20" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* =====================================================
                INTERACTIVE WHITEBOARD
            ===================================================== */}

            <section
                id="interactive"
                className="scroll-mt-24 border-y border-gray-200 bg-gray-50 py-24 sm:py-28"
            >
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <div className="grid items-center gap-14 lg:grid-cols-[.8fr_1.2fr]">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
                                Try Fateboard
                            </p>

                            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                                Don't just look at it.
                                <span className="block text-indigo-600">Try it.</span>
                            </h2>

                            <p className="mt-6 max-w-lg text-base leading-7 text-gray-500">
                                Draw a shape, sketch an idea, or simply play around with the canvas.
                                This is only a small preview of what Fateboard can do.
                            </p>

                            <button
                                type="button"
                                onClick={handleStartDrawing}
                                className="mt-8 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-200 transition duration-300 hover:-translate-y-1 hover:bg-indigo-700"
                            >
                                Open Full Whiteboard →
                            </button>
                        </div>

                        <MiniWhiteboard />
                    </div>
                </div>
            </section>

            {/* =====================================================
                USE CASES
            ===================================================== */}

            <section className="bg-white py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <div className="grid gap-14 lg:grid-cols-[.8fr_1.2fr]">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
                                One canvas. Many possibilities.
                            </p>

                            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                                Wherever your ideas take you.
                            </h2>

                            <p className="mt-6 max-w-md leading-7 text-gray-500">
                                Fateboard isn't limited to one way of thinking. Use the canvas
                                however your brain works best.
                            </p>
                        </div>

                        <div className="grid gap-x-8 sm:grid-cols-2">
                            {useCases.map((item, index) => (
                                <div
                                    key={item.number}
                                    className="group border-t border-gray-200 py-7 transition duration-300 hover:border-indigo-300"
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="text-sm font-bold text-indigo-600">
                                            {item.number}
                                        </span>

                                        <span className="text-gray-300 transition duration-300 group-hover:-translate-y-1 group-hover:text-indigo-400">
                                            ↗
                                        </span>
                                    </div>

                                    <h3 className="mt-5 text-xl font-bold text-gray-900">
                                        {item.title}
                                    </h3>

                                    <p className="mt-2 leading-7 text-gray-500">
                                        {item.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* =====================================================
                SEE IT IN ACTION
            ===================================================== */}

            <section
                id="process"
                className="scroll-mt-24 border-y border-gray-200 bg-gray-50 py-24 sm:py-28"
            >
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <div className="mx-auto max-w-2xl text-center">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
                            See It In Action
                        </p>

                        <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                            From thought to visual.
                        </h2>

                        <p className="mt-5 leading-7 text-gray-500">
                            A quick look at how ideas turn into visuals — simple, smooth, and human.
                        </p>
                    </div>

                    <div className="mt-16 grid items-center gap-14 lg:grid-cols-[.7fr_1.3fr]">
                        <div className="space-y-8">
                            {[
                                {
                                    number: '01',
                                    title: 'Draw Naturally',
                                    description:
                                        'Pick a shape or pen and draw freely, just like on a real whiteboard.',
                                },
                                {
                                    number: '02',
                                    title: 'Adjust as You Go',
                                    description:
                                        'Resize, recolor, and tweak elements until it feels right.',
                                },
                                {
                                    number: '03',
                                    title: 'Bring It to Life',
                                    description:
                                        'Watch your board come alive with smooth visual flow.',
                                },
                            ].map((item) => (
                                <div key={item.number} className="group flex gap-5">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition duration-300 group-hover:scale-110">
                                        {item.number}
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-gray-900">{item.title}</h3>

                                        <p className="mt-2 text-sm leading-6 text-gray-500">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <ImageSlider images={images} />
                    </div>
                </div>
            </section>

            {/* =====================================================
                COMING SOON
            ===================================================== */}

            <section className="bg-white py-24 sm:py-28">
                <div className="mx-auto max-w-7xl px-5 sm:px-8">
                    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 to-indigo-600 px-7 py-14 text-white sm:px-14">
                        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

                        <div className="relative">
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">
                                The journey continues
                            </p>

                            <h2 className="mt-4 max-w-2xl text-3xl font-bold sm:text-5xl">
                                Fateboard is just getting started.
                            </h2>

                            <p className="mt-5 max-w-2xl leading-7 text-blue-100">
                                More creative tools are on the way. The goal is simple — make visual
                                thinking easier.
                            </p>

                            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                    'Mind Maps',
                                    'Image Editing',
                                    'AI-powered Canvas',
                                    'Sharing & Export',
                                ].map((item) => (
                                    <div
                                        key={item}
                                        className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/15"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold">{item}</span>

                                            <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">
                                                Soon
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* =====================================================
                FINAL CTA
            ===================================================== */}

            <section className="bg-gray-50 py-24 sm:py-28">
                <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-2xl text-white shadow-xl shadow-indigo-200">
                        ✦
                    </div>

                    <h2 className="mt-7 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Your next idea needs a canvas.
                    </h2>

                    <p className="mx-auto mt-5 max-w-xl leading-7 text-gray-500">
                        Open a blank canvas and see where your ideas take you.
                    </p>

                    <button
                        type="button"
                        onClick={handleStartDrawing}
                        className="mt-8 rounded-2xl bg-indigo-600 px-8 py-4 font-bold text-white shadow-xl shadow-indigo-200 transition duration-300 hover:-translate-y-1 hover:bg-indigo-700 hover:shadow-2xl"
                    >
                        Start Drawing →
                    </button>
                </div>
            </section>

            {/* =====================================================
                FOOTER
            ===================================================== */}

            <footer className="border-t border-gray-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-gray-500 sm:flex-row sm:px-8">
                    <Brand src="fate.svg" className="h-8" />

                    <p>© {new Date().getFullYear()} fateboard. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
