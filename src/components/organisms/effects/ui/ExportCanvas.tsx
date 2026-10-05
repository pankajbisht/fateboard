import { useStore } from '@/store';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import DockTemplate from '@/components/templates/Dock.template';
import Dropdown from '@/components/atoms/Dropdown';
import Button from '@/components/atoms/Button';
import Input from '@/components/atoms/Input';

/* ---------------------------------------------------------
 * CONSTANTS
 * --------------------------------------------------------- */

const SIZE_PRESETS = [
    {
        label: 'YouTube Video',
        category: 'YouTube',
        value: 'youtube-video',
        width: 1920,
        height: 1080,
    },
    {
        label: 'YouTube Short',
        category: 'YouTube',
        value: 'youtube-short',
        width: 1080,
        height: 1920,
    },
    {
        label: 'YouTube Thumbnail',
        category: 'YouTube',
        value: 'youtube-thumbnail',
        width: 1280,
        height: 720,
    },
    {
        label: 'Instagram Post',
        category: 'Instagram',
        value: 'instagram-post',
        width: 1080,
        height: 1080,
    },
    {
        label: 'Instagram Portrait',
        category: 'Instagram',
        value: 'instagram-portrait',
        width: 1080,
        height: 1350,
    },
    {
        label: 'Instagram Story / Reel',
        category: 'Instagram',
        value: 'instagram-story',
        width: 1080,
        height: 1920,
    },
    {
        label: 'Facebook Post',
        category: 'Social',
        value: 'facebook-post',
        width: 1200,
        height: 630,
    },
    {
        label: 'X / Twitter Post',
        category: 'Social',
        value: 'twitter-post',
        width: 1600,
        height: 900,
    },
    { label: 'Custom', category: 'Custom', value: 'custom', width: 1280, height: 720 },
];

/* Built from SIZE_PRESETS, so adding a preset above is all that's needed. */
const PRESET_OPTIONS = SIZE_PRESETS.map((preset) => ({
    label:
        preset.value === 'custom'
            ? 'Custom size'
            : `${preset.label} · ${preset.width} × ${preset.height}`,
    value: preset.value,
}));

const SCALING_OPTIONS = [
    { label: 'Fit', value: 'fit' },
    { label: 'Fill', value: 'fill' },
    { label: 'Stretch', value: 'stretch' },
];

const FORMAT_OPTIONS = [
    { label: 'PNG', value: 'png' },
    { label: 'JPEG', value: 'jpeg' },
    { label: 'SVG', value: 'svg' },
    { label: 'JSON', value: 'json' },
];

const QUALITY_OPTIONS = [
    { label: 'Standard · 1×', value: '1' },
    { label: 'High Quality · 2×', value: '2' },
    { label: 'Maximum · 3×', value: '3' },
];

const BACKGROUND_OPTIONS = [
    { label: 'Transparent', value: 'transparent' },
    { label: 'White', value: '#ffffff' },
    { label: 'Black', value: '#000000' },
    { label: 'Green', value: '#00ff00' },
];

const PREVIEW_ZOOM_OPTIONS = [
    { label: 'Fit', value: 'fit' },
    { label: '100%', value: '100' },
    { label: '200%', value: '200' },
];

const MAX_RENDER_SIZE = 8192;

/* Custom properties that must survive canvas.toJSON() */
const JSON_PROPS = [
    'id',
    'name',
    'excludeFromCrop',
    'excludeFromExport',
    'selectable',
    'evented',
    'lockMovementX',
    'lockMovementY',
];

const CANVAS_EVENTS = [
    'object:added',
    'object:removed',
    'object:modified',
    'text:changed',
    'canvas:cleared',
];

const CHECKERBOARD_STYLE = {
    backgroundColor: '#ffffff',
    backgroundImage:
        'linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0,0 8px,8px -8px,-8px 0',
};

/* ---------------------------------------------------------
 * HELPERS
 * --------------------------------------------------------- */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const sanitizeFileName = (name) => {
    const cleaned = String(name || '')
        // eslint-disable-next-line no-control-regex
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^\.+/, '')
        .replace(/\.+$/, '')
        .slice(0, 100);

    return cleaned || 'drawing';
};

const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not load the rendered image.'));
        img.src = src;
    });

const canvasToBlob = (canvasEl, type, quality) =>
    new Promise((resolve, reject) => {
        canvasEl.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))),
            type,
            quality,
        );
    });

const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const friendlyError = (error) => {
    if (error && error.name === 'SecurityError') {
        return 'An image on the canvas comes from another site and blocks export. Re-add it from a file or a CORS-enabled source.';
    }

    return (error && error.message) || 'Something went wrong while exporting.';
};

const LABEL_CLASS = 'flex items-center gap-1 text-[11px] text-gray-500';

/* Local field wrapper so every setting label shares one style. */
const Field = ({ label, children }) => (
    <div>
        <div className={`mb-1.5 ${LABEL_CLASS}`}>{label}</div>
        {children}
    </div>
);

/* ---------------------------------------------------------
 * COMPONENT
 * --------------------------------------------------------- */

const ExportCanvas = () => {
    const { canvas } = useStore();

    const [width, setWidth] = useState(1280);
    const [height, setHeight] = useState(720);

    const [fileName, setFileName] = useState('drawing');
    const [format, setFormat] = useState('png');

    const [scaling, setScaling] = useState('fit');
    const [sizePreset, setSizePreset] = useState('youtube-thumbnail');

    const [cropToContent, setCropToContent] = useState(true);

    const [quality, setQuality] = useState(2);
    const [jpegQuality, setJpegQuality] = useState(0.92);

    const [background, setBackground] = useState('transparent');

    const [preview, setPreview] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewZoom, setPreviewZoom] = useState('fit');
    const [error, setError] = useState('');

    const [isExporting, setIsExporting] = useState(false);

    const [canvasVersion, setCanvasVersion] = useState(0);
    const [stageWidth, setStageWidth] = useState(470);

    const previewRequestRef = useRef(0);
    const previewUrlRef = useRef('');
    const stageRef = useRef(null);

    const isRaster = format === 'png' || format === 'jpeg';

    /* -------------------------------------------------------
     * PRESET
     * ------------------------------------------------------- */

    const handlePresetChange = (value) => {
        setSizePreset(value);

        if (value === 'custom') return;

        const preset = SIZE_PRESETS.find((item) => item.value === value);

        if (preset) {
            setWidth(preset.width);
            setHeight(preset.height);
        }
    };

    /* -------------------------------------------------------
     * OUTPUT SCALE (single source of truth for UI + file)
     * ------------------------------------------------------- */

    const getOutputScale = () =>
        Math.max(
            1,
            Math.min(Number(quality) || 1, MAX_RENDER_SIZE / width, MAX_RENDER_SIZE / height),
        );

    const outputScale = isRaster ? getOutputScale() : 1;
    const renderWidth = Math.round(width * outputScale);
    const renderHeight = Math.round(height * outputScale);

    /* -------------------------------------------------------
     * CONTENT BOUNDS (scene coordinates)
     * ------------------------------------------------------- */

    const getExportableObjects = () =>
        canvas
            .getObjects()
            .filter(
                (object) => object.visible && !object.excludeFromCrop && !object.excludeFromExport,
            );

    /* Returns null when there is nothing to export. */
    const getSceneBounds = () => {
        if (!canvas) return null;

        const objects = getExportableObjects();

        if (!objects.length) return null;

        if (!cropToContent) {
            return {
                left: 0,
                top: 0,
                width: canvas.getWidth(),
                height: canvas.getHeight(),
            };
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        objects.forEach((object) => {
            const bounds = object.getBoundingRect(true, true);

            minX = Math.min(minX, bounds.left);
            minY = Math.min(minY, bounds.top);
            maxX = Math.max(maxX, bounds.left + bounds.width);
            maxY = Math.max(maxY, bounds.top + bounds.height);
        });

        if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return null;

        return {
            left: minX,
            top: minY,
            width: Math.max(1, maxX - minX),
            height: Math.max(1, maxY - minY),
        };
    };

    /* -------------------------------------------------------
     * IMAGE LOADING
     * ------------------------------------------------------- */

    const waitForImages = async () => {
        if (!canvas) return;

        const promises = canvas.getObjects().map((object) => {
            if (object.type !== 'image' || !object.getElement) {
                return Promise.resolve();
            }

            const element = object.getElement();

            if (!element || element.complete) return Promise.resolve();

            return new Promise((resolve) => {
                element.addEventListener('load', resolve, { once: true });
                element.addEventListener('error', resolve, { once: true });
            });
        });

        await Promise.all(promises);
    };

    /* -------------------------------------------------------
     * CLEAN RENDER STATE
     * Resets zoom/pan, hides objects flagged excludeFromExport
     * and the canvas' own background (the Background option
     * controls it), then restores everything.
     * Must stay synchronous so it cannot interleave with
     * another export or preview.
     * ------------------------------------------------------- */

    const withCleanCanvas = (fn) => {
        const vpt = canvas.viewportTransform ? [...canvas.viewportTransform] : null;
        const previousBackground = canvas.backgroundColor;
        const hidden = [];

        canvas.getObjects().forEach((object) => {
            if (object.excludeFromExport && object.visible) {
                object.visible = false;
                hidden.push(object);
            }
        });

        try {
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            canvas.backgroundColor = '';

            return fn();
        } finally {
            hidden.forEach((object) => {
                object.visible = true;
            });

            canvas.backgroundColor = previousBackground;

            if (vpt) canvas.setViewportTransform(vpt);

            canvas.requestRenderAll();
        }
    };

    /* -------------------------------------------------------
     * LAYOUT: which part of the scene to read (src) and where
     * to draw it in the output (draw), for the chosen scaling.
     * ------------------------------------------------------- */

    const getLayout = (bounds, outW, outH) => {
        const targetAspect = width / height;
        const sourceAspect = bounds.width / bounds.height;

        const src = { ...bounds };
        const draw = { x: 0, y: 0, w: outW, h: outH };

        if (scaling === 'fill') {
            // Crop the source (centered) to the target aspect ratio.
            if (sourceAspect > targetAspect) {
                src.width = bounds.height * targetAspect;
                src.left = bounds.left + (bounds.width - src.width) / 2;
            } else {
                src.height = bounds.width / targetAspect;
                src.top = bounds.top + (bounds.height - src.height) / 2;
            }
        } else if (scaling === 'fit') {
            // Keep the whole source, letterbox inside the output.
            if (sourceAspect > targetAspect) {
                draw.w = outW;
                draw.h = outW / sourceAspect;
            } else {
                draw.h = outH;
                draw.w = outH * sourceAspect;
            }

            draw.x = (outW - draw.w) / 2;
            draw.y = (outH - draw.h) / 2;
        }

        return {
            src,
            draw: {
                x: Math.round(draw.x),
                y: Math.round(draw.y),
                w: Math.max(1, Math.round(draw.w)),
                h: Math.max(1, Math.round(draw.h)),
            },
        };
    };

    /* -------------------------------------------------------
     * RASTER RENDER -> <canvas> element at `scale`
     * ------------------------------------------------------- */

    const renderRasterCanvas = async (scale) => {
        if (!canvas) return null;

        await waitForImages();

        const bounds = getSceneBounds();

        if (!bounds) return null;

        const outW = Math.max(1, Math.round(width * scale));
        const outH = Math.max(1, Math.round(height * scale));

        const { src, draw } = getLayout(bounds, outW, outH);

        // Render the scene region at the exact pixel density it will be
        // drawn at, so nothing is rendered larger than needed.
        const multiplier = Math.max(
            0.01,
            Math.min(
                Math.max(draw.w / src.width, draw.h / src.height),
                MAX_RENDER_SIZE / src.width,
                MAX_RENDER_SIZE / src.height,
            ),
        );

        const dataUrl = withCleanCanvas(() =>
            canvas.toDataURL({
                format: 'png',
                quality: 1,
                left: src.left,
                top: src.top,
                width: src.width,
                height: src.height,
                multiplier,
            }),
        );

        const image = await loadImage(dataUrl);

        const output = document.createElement('canvas');

        output.width = outW;
        output.height = outH;

        const ctx = output.getContext('2d');

        if (!ctx) return null;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // JPEG has no alpha: use the chosen colour, or white if transparent.
        const fill = format === 'jpeg' && background === 'transparent' ? '#ffffff' : background;

        if (fill !== 'transparent') {
            ctx.fillStyle = fill;
            ctx.fillRect(0, 0, outW, outH);
        }

        ctx.drawImage(image, draw.x, draw.y, draw.w, draw.h);

        return output;
    };

    /* -------------------------------------------------------
     * SVG
     * ------------------------------------------------------- */

    const buildSvg = () => {
        if (!canvas) return null;

        const bounds = getSceneBounds();

        if (!bounds) return null;

        let svg = withCleanCanvas(() =>
            canvas.toSVG({
                width,
                height,
                viewBox: {
                    x: bounds.left,
                    y: bounds.top,
                    width: bounds.width,
                    height: bounds.height,
                },
            }),
        );

        const aspect =
            scaling === 'fit' ? 'xMidYMid meet' : scaling === 'fill' ? 'xMidYMid slice' : 'none';

        const svgTag = svg.match(/<svg\b[^>]*>/);

        if (svgTag) {
            let tag = svgTag[0];

            if (/preserveAspectRatio=/.test(tag)) {
                tag = tag.replace(/preserveAspectRatio="[^"]*"/, `preserveAspectRatio="${aspect}"`);
            } else {
                tag = tag.replace(/<svg\b/, `<svg preserveAspectRatio="${aspect}"`);
            }

            // Oversized rect so it also covers letterbox areas in Fit mode.
            const backgroundRect =
                background === 'transparent'
                    ? ''
                    : `<rect x="${bounds.left - 100000}" y="${bounds.top - 100000}" width="${
                          bounds.width + 200000
                      }" height="${bounds.height + 200000}" fill="${background}"/>`;

            svg = svg.replace(svgTag[0], tag + backgroundRect);
        }

        return svg;
    };

    /* -------------------------------------------------------
     * PREVIEW
     * ------------------------------------------------------- */

    const setPreviewUrl = (url) => {
        const previous = previewUrlRef.current;

        previewUrlRef.current = url;
        setPreview(url);

        if (previous) {
            setTimeout(() => URL.revokeObjectURL(previous), 1000);
        }
    };

    const updatePreview = async () => {
        if (!canvas) return;

        const requestId = ++previewRequestRef.current;
        const isCurrent = () => requestId === previewRequestRef.current;

        setPreviewLoading(true);
        setError('');

        try {
            if (format === 'json') {
                if (isCurrent()) setPreviewUrl('');
                return;
            }

            let url = '';

            if (format === 'svg') {
                const svg = buildSvg();

                if (svg) {
                    url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
                }
            } else {
                // Previews render at 1× (2× only when zoomed to 200%).
                const previewScale = Math.max(
                    1,
                    Math.min(
                        previewZoom === '200' ? 2 : 1,
                        MAX_RENDER_SIZE / width,
                        MAX_RENDER_SIZE / height,
                    ),
                );

                const output = await renderRasterCanvas(previewScale);

                if (output) {
                    const blob = await canvasToBlob(output, 'image/png');
                    url = URL.createObjectURL(blob);
                }
            }

            if (!isCurrent()) {
                if (url) URL.revokeObjectURL(url);
                return;
            }

            setPreviewUrl(url);
        } catch (err) {
            console.error('Preview generation failed:', err);

            if (isCurrent()) {
                setPreviewUrl('');
                setError(friendlyError(err));
            }
        } finally {
            if (isCurrent()) setPreviewLoading(false);
        }
    };

    /* Refresh when the drawing itself changes. */
    useEffect(() => {
        if (!canvas) return undefined;

        const bump = () => setCanvasVersion((version) => version + 1);

        CANVAS_EVENTS.forEach((name) => canvas.on(name, bump));

        return () => {
            CANVAS_EVENTS.forEach((name) => canvas.off(name, bump));
        };
    }, [canvas]);

    /* Debounced refresh when settings or the drawing change. */
    useEffect(() => {
        const timeout = setTimeout(updatePreview, 220);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        canvas,
        canvasVersion,
        width,
        height,
        format,
        scaling,
        cropToContent,
        quality,
        background,
        previewZoom,
    ]);

    /* Free the last preview URL on unmount. */
    useEffect(
        () => () => {
            previewRequestRef.current += 1;

            if (previewUrlRef.current) {
                URL.revokeObjectURL(previewUrlRef.current);
            }
        },
        [],
    );

    /* Track the preview stage width so the frame fits narrow docks. */
    useEffect(() => {
        const node = stageRef.current;

        if (!node || typeof ResizeObserver === 'undefined') return undefined;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];

            if (entry) setStageWidth(entry.contentRect.width);
        });

        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    /* -------------------------------------------------------
     * EXPORT
     * ------------------------------------------------------- */

    const handleExport = async () => {
        if (!canvas) return;

        setIsExporting(true);
        setError('');

        try {
            canvas.discardActiveObject();
            canvas.requestRenderAll();

            await waitForImages();

            let blob = null;
            let extension = format;

            if (isRaster) {
                const output = await renderRasterCanvas(getOutputScale());

                if (!output) {
                    setError('Nothing to export. Add content to the canvas first.');
                    return;
                }

                blob =
                    format === 'jpeg'
                        ? await canvasToBlob(output, 'image/jpeg', jpegQuality)
                        : await canvasToBlob(output, 'image/png');

                if (format === 'jpeg') extension = 'jpg';
            } else if (format === 'svg') {
                const svg = buildSvg();

                if (!svg) {
                    setError('Nothing to export. Add content to the canvas first.');
                    return;
                }

                blob = new Blob([svg], { type: 'image/svg+xml' });
            } else if (format === 'json') {
                const json = JSON.stringify(canvas.toJSON(JSON_PROPS), null, 2);

                blob = new Blob([json], { type: 'application/json' });
            }

            if (!blob) return;

            downloadBlob(blob, `${sanitizeFileName(fileName)}.${extension}`);
        } catch (err) {
            console.error('Export failed:', err);
            setError(friendlyError(err));
        } finally {
            setIsExporting(false);
        }
    };

    /* -------------------------------------------------------
     * DERIVED UI VALUES
     * ------------------------------------------------------- */

    const currentPreset = SIZE_PRESETS.find((preset) => preset.value === sizePreset);

    const currentQuality = QUALITY_OPTIONS.find(
        (option) => Number(option.value) === Number(quality),
    );

    const megapixels = ((renderWidth * renderHeight) / 1000000).toFixed(1);

    const showBackground = format !== 'json';

    const previewFrameStyle = useMemo(() => {
        if (previewZoom === '100') {
            return { width: `${width}px`, height: `${height}px` };
        }

        if (previewZoom === '200') {
            return { width: `${width * 2}px`, height: `${height * 2}px` };
        }

        const maxWidth = Math.max(120, stageWidth - 40);
        const maxHeight = 260;
        const ratio = width / height;

        let frameWidth = maxWidth;
        let frameHeight = frameWidth / ratio;

        if (frameHeight > maxHeight) {
            frameHeight = maxHeight;
            frameWidth = frameHeight * ratio;
        }

        return {
            width: `${Math.max(60, frameWidth)}px`,
            height: `${Math.max(40, frameHeight)}px`,
        };
    }, [previewZoom, width, height, stageWidth]);

    /* -------------------------------------------------------
     * UI
     * ------------------------------------------------------- */

    return (
        <DockTemplate title="Export">
            <div className="flex h-full min-h-0 flex-col bg-white">
                {/* =====================================================
            SETTINGS
        ====================================================== */}

                <div className="shrink-0 space-y-4 border-b border-gray-100">
                    {/* SIZE */}

                    <Field label="Size">
                        <Dropdown
                            value={sizePreset}
                            options={PRESET_OPTIONS}
                            onChange={handlePresetChange}
                        />
                    </Field>

                    {/* CUSTOM */}

                    {sizePreset === 'custom' && (
                        <div className="grid grid-cols-2 gap-2.5">
                            <Input
                                type="number"
                                value={width}
                                min={1}
                                max={MAX_RENDER_SIZE}
                                onChange={(e) =>
                                    setWidth(clamp(Number(e.target.value) || 1, 1, MAX_RENDER_SIZE))
                                }
                                placeholder="Width"
                            />

                            <Input
                                type="number"
                                value={height}
                                min={1}
                                max={MAX_RENDER_SIZE}
                                onChange={(e) =>
                                    setHeight(
                                        clamp(Number(e.target.value) || 1, 1, MAX_RENDER_SIZE),
                                    )
                                }
                                placeholder="Height"
                            />
                        </div>
                    )}

                    {/* FORMAT + SCALING */}

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Format">
                            <Dropdown
                                value={format}
                                options={FORMAT_OPTIONS}
                                onChange={setFormat}
                            />
                        </Field>

                        <Field label="Scaling">
                            <Dropdown
                                value={scaling}
                                options={SCALING_OPTIONS}
                                onChange={setScaling}
                            />
                        </Field>
                    </div>

                    {/* QUALITY */}

                    {isRaster && (
                        <Field label="Quality">
                            <Dropdown
                                value={String(quality)}
                                options={QUALITY_OPTIONS}
                                onChange={(value) => setQuality(Number(value))}
                            />
                        </Field>
                    )}

                    {/* JPEG COMPRESSION */}

                    {format === 'jpeg' && (
                        <div>
                            <div className={`mb-1.5 justify-between ${LABEL_CLASS}`}>
                                <label htmlFor="export-jpeg-quality">JPEG compression</label>
                                <span>{Math.round(jpegQuality * 100)}%</span>
                            </div>

                            <input
                                id="export-jpeg-quality"
                                type="range"
                                min={50}
                                max={100}
                                step={1}
                                value={Math.round(jpegQuality * 100)}
                                onChange={(e) => setJpegQuality(Number(e.target.value) / 100)}
                                className="w-full accent-gray-900"
                            />
                        </div>
                    )}

                    {/* BACKGROUND */}

                    {showBackground && (
                        <div>
                            <div className={`mb-2 ${LABEL_CLASS}`}>Background</div>

                            <div className="grid grid-cols-3 gap-2">
                                {BACKGROUND_OPTIONS.map((option) => {
                                    const active = background === option.value;
                                    const isTransparent = option.value === 'transparent';

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => setBackground(option.value)}
                                            className={`flex items-center gap-2 rounded-lg border px-1.5 py-2 transition ${
                                                active
                                                    ? 'border-gray-900 bg-gray-50'
                                                    : 'border-gray-200 bg-white hover:bg-gray-50'
                                            }`}
                                        >
                                            <span
                                                className={`relative h-3 w-3 shrink-0 overflow-hidden rounded-md border ${
                                                    active ? 'border-gray-500' : 'border-gray-200'
                                                }`}
                                                style={
                                                    isTransparent
                                                        ? {
                                                              backgroundColor: '#fff',
                                                              backgroundImage:
                                                                  'linear-gradient(45deg,#e5e7eb 25%,transparent 25%),linear-gradient(-45deg,#e5e7eb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e5e7eb 75%),linear-gradient(-45deg,transparent 75%,#e5e7eb 75%)',
                                                              backgroundSize: '8px 8px',
                                                              backgroundPosition:
                                                                  '0 0,0 4px,4px -4px,-4px 0',
                                                          }
                                                        : { backgroundColor: option.value }
                                                }
                                            />

                                            <span className="text-[7px] font-medium text-gray-600">
                                                {option.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {format === 'jpeg' && background === 'transparent' && (
                                <div className="mt-1.5 text-[9px] text-gray-400">
                                    JPEG does not support transparency. White will be used
                                    automatically.
                                </div>
                            )}
                        </div>
                    )}

                    {/* CROP */}

                    {format !== 'json' && (
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2.5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-medium text-gray-800">
                                        Crop to content
                                    </span>

                                    {cropToContent && (
                                        <span className="rounded-md bg-gray-200 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-gray-500">
                                            On
                                        </span>
                                    )}
                                </div>

                                <div className="mt-0.5 text-[10px] text-gray-400">
                                    Remove unused canvas space
                                </div>
                            </div>

                            <button
                                type="button"
                                role="switch"
                                aria-checked={cropToContent}
                                aria-label="Crop to content"
                                onClick={() => setCropToContent((prev) => !prev)}
                                className={`relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1 ${
                                    cropToContent ? 'bg-gray-900' : 'bg-gray-300'
                                }`}
                            >
                                <span
                                    className={`block h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 ease-out ${
                                        cropToContent ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    )}
                    {/* FILE NAME */}

                    <div>
                        <div className={`mb-1.5 ${LABEL_CLASS}`}>File name</div>

                        <Input
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            placeholder="drawing"
                        />
                    </div>
                </div>

                {/* =====================================================
            PREVIEW
        ====================================================== */}

                <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/60 py-4">
                    {/* HEADER */}

                    <div className="flex items-center justify-between pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-gray-900">
                                    Preview
                                </span>

                                {previewLoading && (
                                    <span className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-gray-800" />
                                )}
                            </div>

                            <div className="mt-0.5 text-[10px] text-gray-400">
                                Final export appearance
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <span className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[9px] font-bold uppercase text-gray-600 shadow-sm">
                                {format}
                            </span>

                            <span className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[9px] font-medium text-gray-500 shadow-sm">
                                {megapixels} MP
                            </span>
                        </div>
                    </div>

                    {/* PREVIEW CARD */}

                    <div className="pb-4">
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            {/* TOOLBAR */}

                            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                                    </div>

                                    <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">
                                        Preview canvas
                                    </span>
                                </div>

                                {/* ZOOM */}

                                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                                    {PREVIEW_ZOOM_OPTIONS.map((option) => {
                                        const active = previewZoom === option.value;

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() => setPreviewZoom(option.value)}
                                                className={`rounded-md px-2 py-1 text-[9px] font-medium transition ${
                                                    active
                                                        ? 'bg-white text-gray-800 shadow-sm'
                                                        : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* STAGE */}

                            <div
                                ref={stageRef}
                                className="relative flex min-h-[300px] overflow-auto bg-[#f3f4f6] p-5"
                            >
                                <div className="m-auto">
                                    {format === 'json' ? (
                                        <div className="flex flex-col items-center text-center">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
                                                <svg
                                                    width="25"
                                                    height="25"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    className="text-gray-500"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                    <path d="M14 2v6h6" />
                                                    <path d="M8 13h8" />
                                                    <path d="M8 17h6" />
                                                </svg>
                                            </div>

                                            <div className="mt-3 text-[13px] font-semibold text-gray-700">
                                                JSON document
                                            </div>

                                            <div className="mt-1 max-w-[220px] text-[10px] leading-relaxed text-gray-400">
                                                Your canvas structure will be exported as editable
                                                JSON.
                                            </div>
                                        </div>
                                    ) : error ? (
                                        <div className="flex max-w-[260px] flex-col items-center text-center">
                                            <div className="text-[13px] font-semibold text-red-600">
                                                Preview unavailable
                                            </div>

                                            <div className="mt-1 text-[10px] leading-relaxed text-gray-500">
                                                {error}
                                            </div>
                                        </div>
                                    ) : previewLoading && !preview ? (
                                        <div className="flex flex-col items-center">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
                                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-gray-800" />
                                            </div>

                                            <span className="mt-3 text-[10px] font-medium text-gray-500">
                                                Preparing preview…
                                            </span>
                                        </div>
                                    ) : preview ? (
                                        <div
                                            className="relative overflow-hidden rounded-lg border border-gray-300 shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                                            style={previewFrameStyle}
                                        >
                                            {/* CHECKERBOARD */}

                                            <div
                                                className="absolute inset-0"
                                                style={CHECKERBOARD_STYLE}
                                            />

                                            <img
                                                src={preview}
                                                alt="Export preview"
                                                draggable="false"
                                                className={`relative block h-full w-full object-contain transition-opacity ${
                                                    previewLoading ? 'opacity-60' : 'opacity-100'
                                                }`}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center text-center">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm">
                                                <svg
                                                    width="25"
                                                    height="25"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.5"
                                                    className="text-gray-400"
                                                    aria-hidden="true"
                                                >
                                                    <rect
                                                        x="3"
                                                        y="3"
                                                        width="18"
                                                        height="18"
                                                        rx="2"
                                                    />
                                                    <circle cx="8.5" cy="8.5" r="1.5" />
                                                    <path d="m21 15-5-5L5 21" />
                                                </svg>
                                            </div>

                                            <div className="mt-3 text-[13px] font-medium text-gray-600">
                                                Nothing to preview
                                            </div>

                                            <div className="mt-1 max-w-[220px] text-[10px] leading-relaxed text-gray-400">
                                                Add content to your canvas to see the exported
                                                result.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* PREVIEW FOOTER */}

                            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${
                                            error
                                                ? 'bg-red-500'
                                                : previewLoading
                                                  ? 'bg-gray-300'
                                                  : 'bg-green-500'
                                        }`}
                                    />

                                    <span className="text-[9px] font-medium text-gray-500">
                                        {error ? 'Error' : previewLoading ? 'Updating' : 'Ready'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 text-[9px] font-medium text-gray-400">
                                    <span>{scaling.toUpperCase()}</span>
                                    <span>•</span>
                                    <span>
                                        {width} × {height}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* =================================================
              EXPORT DETAILS
          ================================================== */}

                    <div className="pb-4">
                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            Export details
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-400">Preset</span>
                                <span className="text-[11px] font-medium text-gray-700">
                                    {currentPreset?.label || 'Custom'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-400">Output</span>
                                <span className="text-[11px] font-medium text-gray-700">
                                    {isRaster
                                        ? `${renderWidth} × ${renderHeight}`
                                        : `${width} × ${height}`}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-400">Base size</span>
                                <span className="text-[11px] font-medium text-gray-700">
                                    {width} × {height}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-400">Quality</span>
                                <span className="text-[11px] font-medium text-gray-700">
                                    {isRaster
                                        ? `${currentQuality?.label.split(' · ')[1] || `${outputScale}×`}${
                                              outputScale < Number(quality) ? ' (capped)' : ''
                                          }`
                                        : 'Vector'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* =====================================================
            EXPORT BUTTON
        ====================================================== */}

                <div className="shrink-0 border-t border-gray-200 bg-white p-3">
                    {error && format !== 'json' && (
                        <div
                            role="alert"
                            className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] leading-relaxed text-red-700"
                        >
                            {error}
                        </div>
                    )}

                    <Button
                        className="h-10 w-full"
                        onClick={handleExport}
                        disabled={isExporting || !canvas}
                    >
                        {isExporting ? (
                            <div className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />

                                <span>Exporting…</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    aria-hidden="true"
                                >
                                    <path d="M12 3v12" />
                                    <path d="m7 10 5 5 5-5" />
                                    <path d="M5 21h14" />
                                </svg>

                                <span>Export {format.toUpperCase()}</span>
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </DockTemplate>
    );
};

export default ExportCanvas;
