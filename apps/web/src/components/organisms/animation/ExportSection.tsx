import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { GIF_DEFAULTS, GIF_MAX_MS, type GifSettings } from '@/animation/gif/gifSettings';
import {
    getRealtimeFormats,
    supportsWebCodecs,
    type ContainerFormat,
    type ExportMode,
} from '@/animation/exportVideo';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Field } from '../../molecules/Field';
import { PaintTargetSwatch } from '../../molecules/PaintTargetSwatch';
import { PanelAction } from '../../molecules/PanelAction';
import { PanelSection } from '../../molecules/PanelSection';
import { EXPORT_FPS, EXPORT_QUALITY, EXPORT_SIZES, GIF_FPS, GIF_WIDTHS } from './export.config';
import { ExportProgress } from './ExportProgress';
import { GifFields } from './GifFields';

const GIF_MAX_S = GIF_MAX_MS / 1000;

/** The GIF form: its own size and frame rate (not the timeline's) and the encoder switches. */
type GifForm = GifSettings & { width: number; fps: number };

/** Video (MP4 / WebM), an animated GIF, or a PNG of the current frame. */
export function ExportSection() {
    const { exportState, duration, fps, workIn, workOut } = useStore(
        useShallow((s) => ({
            exportState: s.exportState,
            duration: s.animDuration,
            fps: s.animFps,
            workIn: s.workIn,
            workOut: s.workOut,
        })),
    );
    const a = useStore(
        useShallow((s) => ({ exportVideo: s.exportVideo, setAnimFps: s.setAnimFps })),
    );

    const fast = useMemo(() => supportsWebCodecs(), []);
    const realtimeFormats = useMemo(() => getRealtimeFormats(), []);
    const [mode, setMode] = useState<ExportMode>(fast ? 'mp4-fast' : 'realtime');
    const [container, setContainer] = useState<ContainerFormat>(realtimeFormats[0] ?? 'webm');
    const [range, setRange] = useState<'full' | 'work'>('full');
    const [size, setSize] = useState('1080');
    const [quality, setQuality] = useState('high');
    const [bg, setBg] = useState('#ffffff');
    const [name, setName] = useState('animation');
    const [gif, setGif] = useState<GifForm>({ ...GIF_DEFAULTS, width: 480, fps: 15 });
    const setGifField = (patch: Partial<GifForm>) => setGif((g) => ({ ...g, ...patch }));
    const rendering = exportState.status === 'rendering';
    const isGif = mode === 'gif';
    const isVideo = mode === 'mp4-fast' || mode === 'realtime';

    const hasWork = workIn > 0 || workOut !== null;
    const span = (range === 'work' ? (workOut ?? duration) - workIn : duration) / 1000 || 0;
    const bps = EXPORT_QUALITY.find((q) => q.id === quality)!.bps;
    const gifTooLong = isGif && span > GIF_MAX_S;
    const canRun =
        !gifTooLong &&
        (mode === 'png' ||
            isGif ||
            (mode === 'mp4-fast'
                ? fast || realtimeFormats.length > 0
                : realtimeFormats.length > 0));

    const run = () => {
        const sz = EXPORT_SIZES.find((x) => x.id === size)!;
        a.exportVideo({
            mode,
            container,
            range,
            width: isGif ? gif.width : sz.w,
            height: isGif ? 0 : sz.h, // GIF: the board's proportions
            ...(isGif
                ? {
                      fps: gif.fps,
                      gif: { loop: gif.loop, dither: gif.dither, transparent: gif.transparent },
                  }
                : {}),
            bitrate: bps,
            background: bg,
            fileName: name.trim() || 'animation',
        });
    };

    return (
        <PanelSection title="Export" collapsible>
            <Field wrap label="Output">
                <Select<ExportMode>
                    aria-label="Output"
                    value={mode}
                    onChange={setMode}
                    disabled={rendering}
                    options={[
                        {
                            value: 'mp4-fast',
                            label: `MP4 · fast, frame-exact${fast ? '' : ' (falls back to realtime)'}`,
                            disabled: !fast && realtimeFormats.length === 0,
                        },
                        {
                            value: 'realtime',
                            label: 'Video · realtime (compatibility)',
                            disabled: !realtimeFormats.length,
                        },
                        { value: 'gif', label: `GIF · animated, up to ${GIF_MAX_S} s` },
                        { value: 'png', label: 'PNG · current frame' },
                    ]}
                />
            </Field>

            <div className="grid grid-cols-2 gap-2">
                {mode !== 'png' && (
                    <Field wrap label="Frame rate">
                        <Select<number>
                            aria-label="Frame rate"
                            value={isGif ? gif.fps : fps}
                            onChange={isGif ? (v) => setGifField({ fps: v }) : a.setAnimFps}
                            disabled={rendering}
                            options={isGif ? GIF_FPS : EXPORT_FPS}
                        />
                    </Field>
                )}
                {isVideo && (
                    <Field wrap label="Quality">
                        <Select<string>
                            aria-label="Quality"
                            value={quality}
                            onChange={setQuality}
                            disabled={rendering}
                            options={EXPORT_QUALITY.map((q) => ({ value: q.id, label: q.label }))}
                        />
                    </Field>
                )}
                {isGif ? (
                    <Field wrap label="Size">
                        <Select<number>
                            aria-label="Size"
                            value={gif.width}
                            onChange={(v) => setGifField({ width: v })}
                            disabled={rendering}
                            options={GIF_WIDTHS}
                        />
                    </Field>
                ) : (
                    <Field wrap label="Resolution">
                        <Select<string>
                            aria-label="Resolution"
                            value={size}
                            onChange={setSize}
                            disabled={rendering}
                            options={EXPORT_SIZES.map((x) => ({ value: x.id, label: x.label }))}
                        />
                    </Field>
                )}
                {!(isGif && gif.transparent) && (
                    <Field wrap label="Background">
                        <PaintTargetSwatch
                            id="video-export-background"
                            label="Video background"
                            value={bg}
                            onChange={setBg}
                            disabled={rendering}
                        />
                    </Field>
                )}
                {mode === 'realtime' && (
                    <Field wrap label="Container">
                        <Select<ContainerFormat>
                            aria-label="Container"
                            value={container}
                            onChange={setContainer}
                            disabled={rendering}
                            options={realtimeFormats.map((f) => ({
                                value: f,
                                label: f === 'mp4' ? 'MP4' : 'WebM',
                            }))}
                        />
                    </Field>
                )}
                {mode !== 'png' && (
                    <Field wrap label="Range">
                        <Select<'full' | 'work'>
                            aria-label="Range"
                            value={range}
                            onChange={setRange}
                            disabled={rendering}
                            options={[
                                { value: 'full', label: 'Whole timeline' },
                                { value: 'work', label: 'Work area', disabled: !hasWork },
                            ]}
                        />
                    </Field>
                )}
            </div>

            {isGif && <GifFields value={gif} onChange={setGifField} disabled={rendering} />}

            <Field wrap label="File name">
                <Input
                    size="sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={rendering}
                />
            </Field>

            {!rendering && (
                // playback does not block it: the export pauses first
                <PanelAction
                    icon={mode === 'png' ? 'image' : 'video'}
                    onClick={run}
                    disabled={!canRun}
                >
                    {mode === 'png' ? 'Save PNG' : isGif ? 'Export GIF' : 'Export video'}
                </PanelAction>
            )}
            <ExportProgress />

            {!rendering && isVideo && (
                <p className="text-[11px] text-ink-muted">
                    {span.toFixed(1)} s · about {((bps * span) / 8 / 1_000_000).toFixed(1)} MB.{' '}
                    {mode === 'mp4-fast' && fast
                        ? 'Frames are rendered one by one, so this is usually faster than realtime.'
                        : `Realtime export takes about ${span.toFixed(1)} s. Keep this tab open.`}
                </p>
            )}
            {!rendering && isGif && (
                <p className="text-[11px] text-ink-muted">
                    {gifTooLong
                        ? `A GIF can be at most ${GIF_MAX_S} s; this is ${span.toFixed(1)} s. Set a work area (I and O on the timeline) and pick Range › Work area.`
                        : `${span.toFixed(1)} s · ${Math.floor(span * gif.fps) + 1} frames, ${gif.width} px wide. Frames that do not change take no space.`}
                </p>
            )}
        </PanelSection>
    );
}

export default ExportSection;
