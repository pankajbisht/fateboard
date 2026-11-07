import LabeledToggle from '@/components/molecules/LabeledToggle';
import { BRAND } from '@/lib/theme';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { useStore } from '@/store';
import { EffectSection } from './EffectSection';
import { TransformInput } from '@/components/molecules/TransformInput';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { SliderField } from '@/components/molecules/LabeledSlider';
import { Button } from '@/components/atoms/Button';
import {
    DEFAULT_ALONG_PATH,
    GUIDE_PRESETS,
    createGuide,
    isGuideCandidate,
    isPanelGuide,
    sampleAlongPath,
    toGuidePath,
    type AlongPathOptions,
    type PathSample,
} from '@/lib/pathRepeat';

/* --------------------------------- hooks ---------------------------------- */
/** Re-renders when the canvas selection changes (canvas.getActiveObject() alone is not reactive). */
const useActiveObject = (canvas: fabric.Canvas | null) => {
    const [active, setActive] = useState<fabric.Object | null>(null);
    useEffect(() => {
        if (!canvas) return;
        const sync = () => setActive(canvas.getActiveObject() ?? null);
        sync();
        canvas.on('selection:created', sync);
        canvas.on('selection:updated', sync);
        canvas.on('selection:cleared', sync);
        return () => {
            canvas.off('selection:created', sync);
            canvas.off('selection:updated', sync);
            canvas.off('selection:cleared', sync);
        };
    }, [canvas]);
    return active;
};

/** Bumps a counter while `target` is being moved / scaled / rotated so previews stay live. */
const useTransformRevision = (canvas: fabric.Canvas | null, target: fabric.Object | null) => {
    const [rev, setRev] = useState(0);
    useEffect(() => {
        if (!canvas || !target) return;
        let raf = 0;
        const bump = (e: any) => {
            if (e?.target !== target) return;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => setRev((r) => r + 1));
        };
        const events = [
            'object:moving',
            'object:scaling',
            'object:rotating',
            'object:skewing',
            'object:modified',
        ] as const;
        events.forEach((ev) => canvas.on(ev, bump));
        return () => {
            cancelAnimationFrame(raf);
            events.forEach((ev) => canvas.off(ev, bump));
        };
    }, [canvas, target]);
    return rev;
};

/* ------------------------------ small controls ----------------------------- */
const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
};

/** Sub-heading inside the section: same label style as PanelSection titles, with a hairline. */
const Heading = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-1 border-t border-line pt-3 text-label uppercase text-ink-subtle">
        {children}
    </div>
);

/* ------------------------------- style presets ------------------------------ */
const STYLES: { id: string; label: string; patch: Partial<AlongPathOptions> }[] = [
    { id: 'border', label: 'Border', patch: {} },
    {
        id: 'footsteps',
        label: 'Footsteps',
        patch: { alternateSide: true, alternateFlip: true, sideOffset: 14 },
    },
    {
        id: 'taper',
        label: 'Taper',
        patch: { scaleStart: 1, scaleEnd: 0.2, opacityStart: 1, opacityEnd: 0.3 },
    },
    {
        id: 'scatter',
        label: 'Scatter',
        patch: { rotate: 'random', jitterPosition: 12, jitterScale: 0.3 },
    },
];

const MAX_PREVIEW = 1500;

/* -------------------------------- component -------------------------------- */
export const RepeatAlongPath = () => {
    const canvas = useStore((s: any) => s.canvas) as fabric.Canvas | null;
    const addObject = useStore((s: any) => s.addObject);
    const removeObject = useStore((s: any) => s.removeObject);
    const repeatAlongPath = useStore((s: any) => s.repeatAlongPath);

    const active = useActiveObject(canvas);

    const [guide, setGuide] = useState<fabric.Object | null>(null);
    const [opts, setOpts] = useState<AlongPathOptions>(DEFAULT_ALONG_PATH);
    const [preview, setPreview] = useState(true);
    const [group, setGroup] = useState(false);
    const [useOriginal, setUseOriginal] = useState(true);
    const [deleteGuide, setDeleteGuide] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const patch = (p: Partial<AlongPathOptions>) => setOpts((o) => ({ ...o, ...p }));

    // the object to repeat = current selection, as long as it is a single object and not the path itself
    const source =
        active &&
        active !== guide &&
        !(active instanceof fabric.ActiveSelection) &&
        !isPanelGuide(active)
            ? active
            : null;
    const multiSelected = active instanceof fabric.ActiveSelection;
    const canUseAsGuide =
        !!active && active !== guide && isGuideCandidate(active) && !multiSelected;

    const guideRev = useTransformRevision(canvas, guide);
    const sourceRev = useTransformRevision(canvas, source);

    // forget the guide if it was deleted from the canvas
    useEffect(() => {
        if (!canvas || !guide) return;
        const onRemoved = (e: any) => e.target === guide && setGuide(null);
        canvas.on('object:removed', onRemoved);
        return () => canvas.off('object:removed', onRemoved);
    }, [canvas, guide]);

    // on unmount remove only the guides THIS panel created (never the user's own paths)
    const removeRef = useRef(removeObject);
    removeRef.current = removeObject;
    useEffect(() => {
        if (!canvas) return;
        return () => {
            canvas
                .getObjects()
                .filter(isPanelGuide)
                .forEach((o) => {
                    if (removeRef.current) removeRef.current(o);
                    else canvas.remove(o);
                });
            canvas.requestRenderAll();
        };
    }, [canvas]);

    /* ------------------------------ sampling ------------------------------ */
    // guideRev / sourceRev change when the same Fabric objects are edited in place: they bust the cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const guidePath = useMemo(() => (guide ? toGuidePath(guide) : null), [guide, guideRev]);
    const result = useMemo(
        () =>
            guidePath ? sampleAlongPath(guidePath, opts, source?.angle ?? 0, MAX_PREVIEW) : null,
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sourceRev: see guidePath
        [guidePath, opts, source, sourceRev],
    );

    /* ----------------------------- live preview ---------------------------- */
    // Drawn straight onto the canvas after each render: nothing is added to the canvas,
    // the store, undo history or exports.
    const previewRef = useRef<{ samples: PathSample[]; w: number; h: number } | null>(null);

    useEffect(() => {
        if (!canvas) return;
        const draw = ({ ctx }: { ctx: CanvasRenderingContext2D }) => {
            const data = previewRef.current;
            if (!data) return;
            const v = canvas.viewportTransform;
            const zoom = canvas.getZoom() || 1;
            const skip = Math.ceil(data.samples.length / 600); // draw at most ~600 ghosts
            ctx.save();
            ctx.transform(v[0], v[1], v[2], v[3], v[4], v[5]);
            ctx.strokeStyle = BRAND.primary;
            ctx.fillStyle = BRAND.primary;
            ctx.lineWidth = 1 / zoom;
            for (let i = 0; i < data.samples.length; i += skip) {
                const s = data.samples[i];
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate((s.angle * Math.PI) / 180);
                ctx.globalAlpha = 0.25 + 0.5 * s.opacity;
                ctx.strokeRect(
                    (-data.w * s.scale) / 2,
                    (-data.h * s.scale) / 2,
                    data.w * s.scale,
                    data.h * s.scale,
                );
                ctx.beginPath();
                ctx.arc(0, 0, 2 / zoom, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        };
        canvas.on('after:render', draw as any);
        return () => {
            canvas.off('after:render', draw as any);
            previewRef.current = null;
            canvas.requestRenderAll();
        };
    }, [canvas]);

    useEffect(() => {
        previewRef.current =
            preview && result?.samples.length
                ? {
                      samples: result.samples,
                      w: source ? source.getScaledWidth() : 10,
                      h: source ? source.getScaledHeight() : 10,
                  }
                : null;
        canvas?.requestRenderAll();
    }, [canvas, preview, result, source, sourceRev]);

    /* -------------------------------- actions ------------------------------- */
    const insertGuide = (id: string) => {
        if (!canvas) return;
        if (guide && isPanelGuide(guide)) removeObject?.(guide);
        const g = createGuide(id, canvas.getVpCenter());
        addObject(g);
        canvas.setActiveObject(g);
        setGuide(g);
        setError(null);
        canvas.requestRenderAll();
    };

    const useSelectionAsGuide = () => {
        if (!active || !canUseAsGuide) return;
        setGuide(active);
        setError(null);
        canvas?.discardActiveObject();
        canvas?.requestRenderAll();
    };

    const matchObjectWidth = () => {
        if (!source) return;
        patch({
            mode: 'spacing',
            spacing: Math.max(1, Math.round(source.getBoundingRect().width)),
        });
    };

    const applyStyle = (p: Partial<AlongPathOptions>) =>
        setOpts((o) => ({
            ...DEFAULT_ALONG_PATH,
            mode: o.mode,
            spacing: o.spacing,
            count: o.count,
            ...p,
        }));

    const canApply = !!source && !!guide && !busy && !!result?.samples.length && !result.tooMany;

    const apply = async () => {
        if (!source || !guide || busy) return;
        setBusy(true);
        setError(null);
        try {
            await repeatAlongPath(source, guide, { ...opts, group, useOriginal, deleteGuide });
            if (deleteGuide) setGuide(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not repeat along the path.');
        } finally {
            setBusy(false);
        }
    };

    if (!canvas) return null;

    const status = !guide
        ? 'Pick a preset or select a path on the canvas, then press "Use selection as path".'
        : !source
          ? multiSelected
              ? 'Group the selection first (Ctrl+G), then repeat the group.'
              : 'Path is set. Now select the object to repeat.'
          : null;

    return (
        <EffectSection title="Repeat Along Path" disabled={!canApply} onApply={apply}>
            {/* ------------------------------ PATH ------------------------------ */}
            <Heading>Path</Heading>
            <div className="grid grid-cols-4 gap-1">
                {GUIDE_PRESETS.map((p) => (
                    <Button
                        key={p.id}
                        variant="secondary"
                        size="sm"
                        className="px-1"
                        onClick={() => insertGuide(p.id)}
                    >
                        {p.label}
                    </Button>
                ))}
            </div>
            <div className="flex gap-1.5">
                <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    disabled={!canUseAsGuide}
                    onClick={useSelectionAsGuide}
                >
                    Use selection as path
                </Button>
                {guide && (
                    <Button
                        variant="secondary"
                        size="sm"
                        icon="xmark"
                        onClick={() => setGuide(null)}
                    >
                        Clear
                    </Button>
                )}
            </div>
            <p className="text-caption text-ink-muted">
                Works with paths, lines, circles, ellipses, rectangles and polygons.
            </p>
            {status && <p className="mt-1 text-caption text-accent-700">{status}</p>}

            {/* ------------------------------ STYLE ----------------------------- */}
            <Heading>Quick styles</Heading>
            <div className="grid grid-cols-4 gap-1">
                {STYLES.map((s) => (
                    <Button
                        key={s.id}
                        variant="secondary"
                        size="sm"
                        className="px-1"
                        onClick={() => applyStyle(s.patch)}
                    >
                        {s.label}
                    </Button>
                ))}
            </div>

            {/* --------------------------- PLACEMENT ---------------------------- */}
            <Heading>Placement</Heading>
            <SegmentedControl
                aria-label="Placement"
                value={opts.mode}
                onChange={(mode) => patch({ mode })}
                options={[
                    { value: 'spacing', label: 'Fixed spacing' },
                    { value: 'count', label: 'Fixed count' },
                ]}
            />
            {opts.mode === 'spacing' ? (
                <>
                    <TransformInput
                        label="Spacing (px)"
                        value={opts.spacing}
                        onChange={(v: any) =>
                            patch({ spacing: Math.max(0.5, num(v, opts.spacing)) })
                        }
                    />
                    <Button
                        variant="secondary"
                        size="sm"
                        block
                        disabled={!source}
                        onClick={matchObjectWidth}
                    >
                        Match object width
                    </Button>
                </>
            ) : (
                <>
                    <TransformInput
                        label="Copies"
                        value={opts.count}
                        onChange={(v: any) =>
                            patch({ count: Math.max(1, Math.round(num(v, opts.count))) })
                        }
                    />
                    <LabeledToggle
                        label="Last copy on the end point"
                        checked={opts.includeEnd}
                        onChange={(includeEnd) => patch({ includeEnd })}
                    />
                </>
            )}
            <SliderField
                label="Start offset"
                value={opts.startOffset}
                min={0}
                max={95}
                step={1}
                unit="%"
                onChange={(startOffset) => patch({ startOffset })}
            />
            <SliderField
                label="End offset"
                value={opts.endOffset}
                min={0}
                max={95}
                step={1}
                unit="%"
                onChange={(endOffset) => patch({ endOffset })}
            />
            <LabeledToggle
                label="Reverse direction"
                checked={opts.reverse}
                onChange={(reverse) => patch({ reverse })}
            />

            {/* -------------------------- ORIENTATION --------------------------- */}
            <Heading>Orientation</Heading>
            <SegmentedControl
                aria-label="Orientation"
                value={opts.rotate}
                onChange={(rotate) => patch({ rotate })}
                options={[
                    { value: 'path', label: 'Follow path' },
                    { value: 'fixed', label: 'Keep angle' },
                    { value: 'random', label: 'Random' },
                ]}
            />
            <TransformInput
                label="Angle offset (deg)"
                value={opts.angleOffset}
                onChange={(v: any) => patch({ angleOffset: num(v, opts.angleOffset) })}
            />
            <TransformInput
                label="Side offset (px)"
                value={opts.sideOffset}
                onChange={(v: any) => patch({ sideOffset: num(v, opts.sideOffset) })}
            />
            <LabeledToggle
                label="Alternate sides"
                checked={opts.alternateSide}
                onChange={(alternateSide) => patch({ alternateSide })}
            />
            <LabeledToggle
                label="Mirror every other copy"
                checked={opts.alternateFlip}
                onChange={(alternateFlip) => patch({ alternateFlip })}
            />

            {/* --------------------------- VARIATION ---------------------------- */}
            <Heading>Size and opacity along the path</Heading>
            <SliderField
                label="Scale at start"
                value={opts.scaleStart}
                min={0.1}
                max={3}
                step={0.05}
                onChange={(scaleStart) => patch({ scaleStart })}
            />
            <SliderField
                label="Scale at end"
                value={opts.scaleEnd}
                min={0.1}
                max={3}
                step={0.05}
                onChange={(scaleEnd) => patch({ scaleEnd })}
            />
            <SliderField
                label="Opacity at start"
                value={opts.opacityStart}
                min={0}
                max={1}
                step={0.05}
                onChange={(opacityStart) => patch({ opacityStart })}
            />
            <SliderField
                label="Opacity at end"
                value={opts.opacityEnd}
                min={0}
                max={1}
                step={0.05}
                onChange={(opacityEnd) => patch({ opacityEnd })}
            />

            <Heading>Randomness</Heading>
            <TransformInput
                label="Position jitter (px)"
                value={opts.jitterPosition}
                onChange={(v: any) =>
                    patch({ jitterPosition: Math.max(0, num(v, opts.jitterPosition)) })
                }
            />
            <SliderField
                label="Rotation jitter"
                value={opts.jitterRotation}
                min={0}
                max={180}
                step={1}
                unit="°"
                onChange={(jitterRotation) => patch({ jitterRotation })}
            />
            <SliderField
                label="Size jitter"
                value={opts.jitterScale}
                min={0}
                max={0.9}
                step={0.05}
                onChange={(jitterScale) => patch({ jitterScale })}
            />
            <div className="mt-1 flex items-end gap-1">
                <div className="flex-1">
                    <TransformInput
                        label="Seed"
                        value={opts.seed}
                        onChange={(v: any) =>
                            patch({ seed: Math.max(0, Math.round(num(v, opts.seed))) })
                        }
                    />
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => patch({ seed: Math.floor(Math.random() * 99999) })}
                >
                    Shuffle
                </Button>
            </div>

            {/* ------------------------------ OUTPUT ---------------------------- */}
            <Heading>Output</Heading>
            <LabeledToggle label="Show live preview" checked={preview} onChange={setPreview} />
            <LabeledToggle
                label="Original becomes the first copy"
                checked={useOriginal}
                onChange={setUseOriginal}
            />
            <LabeledToggle label="Group the result" checked={group} onChange={setGroup} />
            <LabeledToggle
                label="Remove the path afterwards"
                checked={deleteGuide}
                onChange={setDeleteGuide}
            />

            {result?.tooMany && (
                <p className="mt-2 text-caption text-danger">
                    {result.requested} copies is too many (limit {MAX_PREVIEW}). Increase the
                    spacing or lower the count.
                </p>
            )}
            {result && !result.tooMany && result.samples.length > 0 && (
                <p className="mt-2 text-[11px] text-ink-muted">
                    {result.samples.length} {result.samples.length === 1 ? 'copy' : 'copies'} along{' '}
                    {Math.round(result.length)} px
                    {result.closed ? ' (closed path)' : ''}
                </p>
            )}
            {error && <p className="mt-2 text-caption text-danger">{error}</p>}
        </EffectSection>
    );
};
