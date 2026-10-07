import React from 'react';

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

export default ImageSlider;
