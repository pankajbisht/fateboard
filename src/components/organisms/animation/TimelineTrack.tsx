import clsx from 'clsx';
import type { MouseEvent, PointerEvent } from 'react';
import { useStore } from '@store';
import { usedProps, type Keyframe, type Track } from '@/animation/engine';
import type { Unit } from '@/lib/units';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import { FOCUS_RING } from '../../atoms/control.styles';
import { EASING_LABELS, PROP_LABELS, describeProp } from './animation.labels';
import { LABEL_W, LANE_GUTTER, timecode } from './animation.logic';
import type { KeyframeDrag } from './useKeyframeDrag';

interface RowContext {
    pps: number;
    selected: Set<string>;
    drag: KeyframeDrag;
}

/** A keyframe diamond on a lane: click to select and jump to it, drag to retime. */
function KeyframeMarker({
    objectId,
    keyframe,
    label,
    small = false,
    ctx,
}: {
    objectId: string;
    keyframe: Keyframe;
    label: string;
    small?: boolean;
    ctx: RowContext;
}) {
    const ref = { objectId, keyframeId: keyframe.id };
    const isSelected = ctx.selected.has(keyframe.id);
    return (
        <button
            type="button"
            className={clsx(
                'absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-sm p-1 leading-none',
                FOCUS_RING,
                isSelected
                    ? 'z-10 scale-125 text-danger'
                    : 'text-primary-500 hover:text-primary-400',
                small && 'opacity-80',
            )}
            style={{ left: (keyframe.time / 1000) * ctx.pps }}
            title={label}
            aria-label={label}
            aria-pressed={isSelected}
            onPointerDown={(e) => ctx.drag.down(e, ref)}
            onPointerMove={(e) => ctx.drag.move(e, ref)}
            onPointerUp={() => ctx.drag.up(ref)}
            onPointerCancel={ctx.drag.cancel}
            onDoubleClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.key === 'Enter' && ctx.drag.pick(ref)}
        >
            <Icon name="keyframe" filled size={small ? 9 : 12} />
        </button>
    );
}

/** One animated object on the timeline: its name and actions, its keyframes, its properties. */
export function TimelineTrack({
    track,
    open,
    onToggle,
    exists,
    highlighted,
    fps,
    unit,
    ctx,
    onLaneDown,
    onLaneDoubleClick,
}: {
    track: Track;
    open: boolean;
    onToggle: () => void;
    /** false when the object was deleted from the canvas */
    exists: boolean;
    /** the object is selected on the canvas */
    highlighted: boolean;
    fps: number;
    unit: Unit;
    ctx: RowContext;
    onLaneDown: (e: PointerEvent) => void;
    onLaneDoubleClick: (e: MouseEvent, track: Track) => void;
}) {
    const selectObject = useStore((s) => s.selectObject);
    const toggleMute = useStore((s) => s.toggleMute);
    const clearTrack = useStore((s) => s.clearTrack);
    const cellBg = highlighted ? 'bg-surface-strong' : 'bg-surface';
    const first = track.keyframes[0];
    const last = track.keyframes[track.keyframes.length - 1];

    return (
        <div data-track={track.objectId} data-selected={highlighted || undefined}>
            <div className="flex h-8 border-b an-bd-soft">
                <div
                    className={clsx(
                        'group sticky left-0 z-30 flex shrink-0 items-center gap-0.5 px-1',
                        cellBg,
                        highlighted && 'shadow-[inset_2px_0_0_var(--color-primary-500)]',
                    )}
                    style={{ width: LABEL_W }}
                >
                    <IconButton
                        size="sm"
                        icon={
                            <Icon
                                name="chevron-right"
                                className={clsx('transition-transform', open && 'rotate-90')}
                            />
                        }
                        aria-label={open ? 'Hide properties' : 'Show properties'}
                        aria-expanded={open}
                        onClick={onToggle}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => selectObject(track.objectId)}
                        className={clsx(
                            'min-w-0 flex-1 px-1 text-[11px] font-medium',
                            exists ? 'text-ink' : 'line-through opacity-40',
                        )}
                        title={
                            exists
                                ? `${track.label}: select on the canvas`
                                : `${track.label}: no longer on the canvas`
                        }
                    >
                        <span className="w-full truncate text-left">{track.label}</span>
                    </Button>
                    {/* shown on hover / focus (and while muted), over the end of the name */}
                    <div
                        className={clsx(
                            'absolute inset-y-0 right-0 items-center gap-0.5 px-1',
                            cellBg,
                            track.muted
                                ? 'flex'
                                : 'hidden group-focus-within:flex group-hover:flex [@media(hover:none)]:flex',
                        )}
                    >
                        <IconButton
                            size="sm"
                            icon={<Icon name={track.muted ? 'eye-slash' : 'eye'} />}
                            onClick={() => toggleMute(track.objectId)}
                            title={track.muted ? 'Turn the animation back on' : 'Turn off for now'}
                            aria-label={
                                track.muted
                                    ? `Enable animation of ${track.label}`
                                    : `Mute animation of ${track.label}`
                            }
                        />
                        <IconButton
                            size="sm"
                            tone="danger"
                            icon={<Icon name="trash-can" />}
                            onClick={() => clearTrack(track.objectId)}
                            title="Remove animation"
                            aria-label={`Remove animation from ${track.label}`}
                        />
                    </div>
                </div>
                <div
                    className={clsx('relative flex-1', track.muted && 'opacity-40')}
                    style={{ marginLeft: LANE_GUTTER }}
                    onPointerDown={onLaneDown}
                    onDoubleClick={(e) => onLaneDoubleClick(e, track)}
                >
                    {track.keyframes.length > 1 && (
                        <div
                            className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-primary-500/25"
                            style={{
                                left: (first.time / 1000) * ctx.pps,
                                width: ((last.time - first.time) / 1000) * ctx.pps,
                            }}
                        />
                    )}
                    {track.keyframes.map((k) => (
                        <KeyframeMarker
                            key={k.id}
                            objectId={track.objectId}
                            keyframe={k}
                            label={`Keyframe at ${timecode(k.time, fps)} on ${track.label} · ${k.bezier ? 'Custom curve' : EASING_LABELS[k.easing]}`}
                            ctx={ctx}
                        />
                    ))}
                </div>
            </div>

            {open &&
                usedProps(track).map((p) => (
                    <div key={p} className="flex h-6 border-b an-bd-soft">
                        <div
                            className={clsx(
                                'sticky left-0 z-30 flex shrink-0 items-center pl-8 text-[10px] text-ink-muted',
                                cellBg,
                            )}
                            style={{ width: LABEL_W }}
                        >
                            {PROP_LABELS[p]}
                        </div>
                        <div
                            className="relative flex-1"
                            style={{ marginLeft: LANE_GUTTER }}
                            onPointerDown={onLaneDown}
                        >
                            {track.keyframes
                                .filter((k) => k.props[p] !== undefined)
                                .map((k) => (
                                    <KeyframeMarker
                                        key={k.id}
                                        objectId={track.objectId}
                                        keyframe={k}
                                        label={`${describeProp(p, k.props[p]!, unit)} at ${timecode(k.time, fps)}`}
                                        small
                                        ctx={ctx}
                                    />
                                ))}
                        </div>
                    </div>
                ))}
        </div>
    );
}

export default TimelineTrack;
