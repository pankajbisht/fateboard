import { type TMat2D } from 'fabric';
import { whenImagesReady } from '@/lib/imageReady';
import { serializeCanvas } from '@/lib/serialization';
import { useStore } from '@/store';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Input from '@/components/atoms/Input';
import { Icon } from '@/components/atoms/Icon';
import { Select } from '@/components/atoms/Select';
import { Badge } from '@/components/atoms/Badge';
import { Field } from '@/components/molecules/Field';
import { SliderField } from '@/components/molecules/LabeledSlider';
import LabeledToggle from '@/components/molecules/LabeledToggle';
import { PanelSection } from '@/components/molecules/PanelSection';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { PanelAction } from '@/components/molecules/PanelAction';

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

const CANVAS_EVENTS = [
    'object:added',
    'object:removed',
    'object:modified',
    'text:changed',
    'canvas:cleared',
] as const;

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

const canvasToBlob = (canvasEl: HTMLCanvasElement, type: string, quality?: number) =>
    new Promise<Blob>((resolve, reject) => {
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

/* ---------------------------------------------------------
 * COMPONENT
 * --------------------------------------------------------- */

const ExportCanvas = () => {
    const canvas = useStore((s) => s.canvas); // selector: never re-render on unrelated changes (BUG-029)

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
                (object) =>
                    object.visible &&
                    !(object as typeof object & { excludeFromCrop?: boolean }).excludeFromCrop &&
                    !object.excludeFromExport,
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
            const bounds = object.getBoundingRect(); // Fabric 6+: always absolute, no arguments

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

    // filtered images draw from a <canvas>: only a source <img> still downloading is waited for
    const waitForImages = async () => {
        if (!canvas) return;
        await whenImagesReady(canvas.getObjects());
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
        const vpt = canvas.viewportTransform ? ([...canvas.viewportTransform] as TMat2D) : null;
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

        // Render straight to a canvas element: no PNG encode + decode round trip (was the
        // slowest step of every export / preview on large images).
        const image = withCleanCanvas(() =>
            canvas.toCanvasElement(multiplier, {
                left: src.left,
                top: src.top,
                width: src.width,
                height: src.height,
            }),
        );

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
                width: String(width),
                height: String(height),
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
                // one serialize path (BUG-003): every custom prop, animated objects at rest (BUG-011)
                const json = JSON.stringify(serializeCanvas(canvas), null, 2);

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
        <>
            {/* =====================================================
            SETTINGS
        ====================================================== */}

            <PanelSection title="Settings">
                {/* SIZE */}

                <Field label="Size">
                    <Select
                        aria-label="Size"
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
                            label="Width (px)"
                        />

                        <Input
                            type="number"
                            value={height}
                            min={1}
                            max={MAX_RENDER_SIZE}
                            onChange={(e) =>
                                setHeight(clamp(Number(e.target.value) || 1, 1, MAX_RENDER_SIZE))
                            }
                            placeholder="Height"
                            label="Height (px)"
                        />
                    </div>
                )}

                {/* FORMAT + SCALING */}

                <div className="grid grid-cols-2 gap-3">
                    <Field label="Format">
                        <Select<string>
                            aria-label="Format"
                            value={format}
                            options={FORMAT_OPTIONS}
                            onChange={setFormat}
                        />
                    </Field>

                    <Field label="Scaling">
                        <Select<string>
                            aria-label="Scaling"
                            value={scaling}
                            options={SCALING_OPTIONS}
                            onChange={setScaling}
                        />
                    </Field>
                </div>

                {/* QUALITY */}

                {isRaster && (
                    <Field label="Quality">
                        <Select
                            aria-label="Quality"
                            value={String(quality)}
                            options={QUALITY_OPTIONS}
                            onChange={(value) => setQuality(Number(value))}
                        />
                    </Field>
                )}

                {/* JPEG COMPRESSION */}

                {format === 'jpeg' && (
                    <SliderField
                        label="JPEG compression"
                        min={50}
                        max={100}
                        step={1}
                        unit="%"
                        value={Math.round(jpegQuality * 100)}
                        onChange={(v) => setJpegQuality(v / 100)}
                    />
                )}

                {/* BACKGROUND */}

                {showBackground && (
                    <Field label="Background">
                        <div className="grid grid-cols-2 gap-2">
                            {BACKGROUND_OPTIONS.map((option) => {
                                const active = background === option.value;
                                const isTransparent = option.value === 'transparent';

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        aria-pressed={active}
                                        onClick={() => setBackground(option.value)}
                                        className={`flex h-8 items-center gap-2 rounded-md border px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60 ${
                                            active
                                                ? 'border-primary-500 bg-primary-50'
                                                : 'border-line-strong bg-surface hover:bg-surface-muted'
                                        }`}
                                    >
                                        <span
                                            className={`relative h-3.5 w-3.5 shrink-0 overflow-hidden rounded-sm border ${
                                                active ? 'border-primary-500' : 'border-line'
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

                                        <span className="text-xs font-medium text-ink">
                                            {option.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {format === 'jpeg' && background === 'transparent' && (
                            <p className="text-caption text-ink-subtle">
                                JPEG does not support transparency. White will be used
                                automatically.
                            </p>
                        )}
                    </Field>
                )}

                {/* CROP */}

                {format !== 'json' && (
                    <LabeledToggle
                        label="Crop to content"
                        hint="Remove unused canvas space"
                        checked={cropToContent}
                        onChange={setCropToContent}
                    />
                )}
                {/* FILE NAME */}

                <Input
                    label="File name"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="drawing"
                />
            </PanelSection>

            {/* =====================================================
            PREVIEW
        ====================================================== */}

            <PanelSection
                title="Preview"
                actions={
                    <>
                        {previewLoading && <Icon name="spinner" spin className="text-ink-subtle" />}
                        <Badge>{format.toUpperCase()}</Badge>
                        <Badge>{megapixels} MP</Badge>
                    </>
                }
            >
                {/* PREVIEW CARD */}

                <div>
                    <div className="overflow-hidden rounded-lg border border-line bg-surface">
                        {/* TOOLBAR */}

                        <div className="flex items-center justify-between border-b border-line px-3 py-2">
                            <span className="text-label uppercase text-ink-subtle">Zoom</span>
                            <SegmentedControl
                                aria-label="Preview zoom"
                                size="sm"
                                block={false}
                                value={previewZoom}
                                onChange={setPreviewZoom}
                                options={PREVIEW_ZOOM_OPTIONS}
                            />
                        </div>

                        {/* STAGE */}

                        <div
                            ref={stageRef}
                            className="relative flex min-h-[240px] overflow-auto bg-surface-muted p-4"
                        >
                            <div className="m-auto">
                                {format === 'json' ? (
                                    <div className="flex flex-col items-center text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-line bg-surface shadow-sm">
                                            <svg
                                                width="25"
                                                height="25"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                className="text-ink-muted"
                                                aria-hidden="true"
                                            >
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <path d="M14 2v6h6" />
                                                <path d="M8 13h8" />
                                                <path d="M8 17h6" />
                                            </svg>
                                        </div>

                                        <div className="mt-3 text-[13px] font-semibold text-ink">
                                            JSON document
                                        </div>

                                        <div className="mt-1 max-w-[220px] text-caption leading-relaxed text-ink-subtle">
                                            Your canvas structure will be exported as editable JSON.
                                        </div>
                                    </div>
                                ) : error ? (
                                    <div className="flex max-w-[260px] flex-col items-center text-center">
                                        <div className="text-xs font-semibold text-danger">
                                            Preview unavailable
                                        </div>

                                        <div className="mt-1 text-caption leading-relaxed text-ink-muted">
                                            {error}
                                        </div>
                                    </div>
                                ) : previewLoading && !preview ? (
                                    <div className="flex flex-col items-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface shadow-sm">
                                            <Icon
                                                name="spinner"
                                                spin
                                                className="text-lg text-ink-subtle"
                                            />
                                        </div>

                                        <span className="mt-3 text-caption font-medium text-ink-muted">
                                            Preparing preview…
                                        </span>
                                    </div>
                                ) : preview ? (
                                    <div
                                        className="relative overflow-hidden rounded-lg border border-line-strong shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
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
                                        <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-line bg-surface shadow-sm">
                                            <svg
                                                width="25"
                                                height="25"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="1.5"
                                                className="text-ink-subtle"
                                                aria-hidden="true"
                                            >
                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <path d="m21 15-5-5L5 21" />
                                            </svg>
                                        </div>

                                        <div className="mt-3 text-[13px] font-medium text-ink-muted">
                                            Nothing to preview
                                        </div>

                                        <div className="mt-1 max-w-[220px] text-caption leading-relaxed text-ink-subtle">
                                            Add content to your canvas to see the exported result.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PREVIEW FOOTER */}

                        <div className="flex items-center justify-between border-t border-line px-3 py-2.5">
                            <div className="flex items-center gap-2">
                                <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                        error
                                            ? 'bg-danger'
                                            : previewLoading
                                              ? 'bg-line-strong'
                                              : 'bg-success'
                                    }`}
                                />

                                <span className="text-caption font-medium text-ink-muted">
                                    {error ? 'Error' : previewLoading ? 'Updating' : 'Ready'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 text-caption font-medium text-ink-subtle">
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
            </PanelSection>

            <PanelSection title="Export details">
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-ink-muted">Preset</span>
                        <span className="text-xs font-medium tabular-nums text-ink">
                            {currentPreset?.label || 'Custom'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-ink-muted">Output</span>
                        <span className="text-xs font-medium tabular-nums text-ink">
                            {isRaster ? `${renderWidth} × ${renderHeight}` : `${width} × ${height}`}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-ink-muted">Base size</span>
                        <span className="text-xs font-medium tabular-nums text-ink">
                            {width} × {height}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs text-ink-muted">Quality</span>
                        <span className="text-xs font-medium tabular-nums text-ink">
                            {isRaster
                                ? `${currentQuality?.label.split(' · ')[1] || `${outputScale}×`}${
                                      outputScale < Number(quality) ? ' (capped)' : ''
                                  }`
                                : 'Vector'}
                        </span>
                    </div>
                </div>
            </PanelSection>

            {/* =====================================================
            EXPORT BUTTON
        ====================================================== */}

            <div className="flex flex-col gap-2">
                {error && format !== 'json' && (
                    <div
                        role="alert"
                        className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-caption text-danger"
                    >
                        {error}
                    </div>
                )}

                <PanelAction
                    icon="download"
                    loading={isExporting}
                    onClick={handleExport}
                    disabled={!canvas}
                >
                    {isExporting ? 'Exporting…' : `Export ${format.toUpperCase()}`}
                </PanelAction>
            </div>
        </>
    );
};

export default ExportCanvas;
