import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import {
    getRealtimeFormats,
    supportsWebCodecs,
    type ContainerFormat,
    type ExportMode,
} from '@/animation/exportVideo';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';
import { Field } from '../../molecules/Field';
import { PaintTargetSwatch } from '../../molecules/PaintTargetSwatch';
import { PanelAction } from '../../molecules/PanelAction';
import { PanelSection } from '../../molecules/PanelSection';
import { EXPORT_FPS, EXPORT_QUALITY, EXPORT_SIZES } from './export.config';

/** Video (MP4 / WebM) or a PNG of the current frame. */
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
        useShallow((s) => ({
            exportVideo: s.exportVideo,
            cancelExport: s.cancelExport,
            setAnimFps: s.setAnimFps,
        })),
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
    const rendering = exportState.status === 'rendering';
    const percent = Math.round(exportState.progress * 100);

    const hasWork = workIn > 0 || workOut !== null;
    const span = (range === 'work' ? (workOut ?? duration) - workIn : duration) / 1000 || 0;
    const bps = EXPORT_QUALITY.find((q) => q.id === quality)!.bps;
    const canRun =
        mode === 'png' ||
        (mode === 'mp4-fast' ? fast || realtimeFormats.length > 0 : realtimeFormats.length > 0);

    const run = () => {
        const sz = EXPORT_SIZES.find((x) => x.id === size)!;
        a.exportVideo({
            mode,
            container,
            range,
            width: sz.w,
            height: sz.h,
            bitrate: bps,
            background: bg,
            fileName: name.trim() || 'animation',
        });
    };

    return (
        <PanelSection title="Export video" collapsible>
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
                        { value: 'png', label: 'PNG · current frame' },
                    ]}
                />
            </Field>

            <div className="grid grid-cols-2 gap-2">
                {mode !== 'png' && (
                    <>
                        <Field wrap label="Frame rate">
                            <Select
                                aria-label="Frame rate"
                                value={fps}
                                onChange={a.setAnimFps}
                                disabled={rendering}
                                options={EXPORT_FPS}
                            />
                        </Field>
                        <Field wrap label="Quality">
                            <Select<string>
                                aria-label="Quality"
                                value={quality}
                                onChange={setQuality}
                                disabled={rendering}
                                options={EXPORT_QUALITY.map((q) => ({
                                    value: q.id,
                                    label: q.label,
                                }))}
                            />
                        </Field>
                    </>
                )}
                <Field wrap label="Resolution">
                    <Select<string>
                        aria-label="Resolution"
                        value={size}
                        onChange={setSize}
                        disabled={rendering}
                        options={EXPORT_SIZES.map((x) => ({ value: x.id, label: x.label }))}
                    />
                </Field>
                <Field wrap label="Background">
                    <PaintTargetSwatch
                        id="video-export-background"
                        label="Video background"
                        value={bg}
                        onChange={setBg}
                        disabled={rendering}
                    />
                </Field>
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

            <Field wrap label="File name">
                <Input
                    size="sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={rendering}
                />
            </Field>

            {rendering ? (
                <div className="space-y-1.5">
                    <div
                        className="h-2 overflow-hidden rounded an-track"
                        role="progressbar"
                        aria-label="Export progress"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                    >
                        <div
                            className="h-full bg-primary-600 transition-[width]"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-ink-muted">Rendering… {percent}%</span>
                        <Button variant="secondary" size="sm" icon="xmark" onClick={a.cancelExport}>
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : (
                // playback does not block it: the export pauses first
                <PanelAction
                    icon={mode === 'png' ? 'image' : 'video'}
                    onClick={run}
                    disabled={!canRun}
                >
                    {mode === 'png' ? 'Save PNG' : 'Export video'}
                </PanelAction>
            )}

            {!rendering && mode !== 'png' && (
                <p className="text-[11px] text-ink-muted">
                    {span.toFixed(1)} s · about {((bps * span) / 8 / 1_000_000).toFixed(1)} MB.{' '}
                    {mode === 'mp4-fast' && fast
                        ? 'Frames are rendered one by one, so this is usually faster than realtime.'
                        : `Realtime export takes about ${span.toFixed(1)} s. Keep this tab open.`}
                </p>
            )}
            {exportState.status === 'done' && (
                <p role="status" className="text-[11px] text-success">
                    {exportState.message}
                </p>
            )}
            {exportState.status === 'error' && (
                <p role="alert" className="text-[11px] text-danger">
                    {exportState.message}
                </p>
            )}
        </PanelSection>
    );
}

export default ExportSection;
