import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { shortcut } from '@/lib/utils/isMac';
import { IconButton } from '../../atoms/IconButton';
import { Icon } from '../../atoms/Icon';
import { Select } from '../../atoms/Select';
import LabeledToggle from '../../molecules/LabeledToggle';
import { timecode } from './animation.logic';

const RATES = [0.25, 0.5, 1, 1.5, 2].map((r) => ({ value: r, label: `${r}×` }));

/** Re-renders every frame while playing, so it is its own component. */
function Timecode() {
    const currentTime = useStore((s) => s.currentTime);
    const duration = useStore((s) => s.animDuration);
    const fps = useStore((s) => s.animFps);
    return (
        <div
            className="ml-auto text-right font-mono text-[11px] tabular-nums leading-tight"
            title="Minutes : seconds : frames"
        >
            {timecode(currentTime, fps)}
            <div className="text-[10px] text-ink-muted">{timecode(duration, fps)}</div>
        </div>
    );
}

/** Play / step / loop, keyframe undo and redo, snapping and playback speed. */
export function Transport() {
    const { isPlaying, loop, rate, snap, canUndo, canRedo } = useStore(
        useShallow((s) => ({
            isPlaying: s.isPlaying,
            loop: s.loop,
            rate: s.playbackRate,
            snap: s.snap,
            canUndo: s.past.length > 0,
            canRedo: s.future.length > 0,
        })),
    );
    const a = useStore(
        useShallow((s) => ({
            togglePlay: s.togglePlay,
            stop: s.stop,
            stepFrames: s.stepFrames,
            setLoop: s.setLoop,
            setPlaybackRate: s.setPlaybackRate,
            setSnap: s.setSnap,
            undo: s.animUndo,
            redo: s.animRedo,
        })),
    );

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-0.5">
                <IconButton
                    icon={<Icon name="stop" />}
                    onClick={a.stop}
                    title="Stop and go back to the start"
                    aria-label="Stop"
                />
                <IconButton
                    icon={<Icon name="step-back" />}
                    onClick={() => a.stepFrames(-1)}
                    title="Previous frame (←)"
                    aria-label="Previous frame"
                />
                <IconButton
                    size="lg"
                    icon={<Icon name={isPlaying ? 'pause' : 'play'} filled />}
                    tone="primary"
                    onClick={a.togglePlay}
                    title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                />
                <IconButton
                    icon={<Icon name="step-forward" />}
                    onClick={() => a.stepFrames(1)}
                    title="Next frame (→)"
                    aria-label="Next frame"
                />
                <IconButton
                    icon={<Icon name="repeat" />}
                    active={loop}
                    onClick={() => a.setLoop(!loop)}
                    title="Loop (L)"
                    aria-label="Loop"
                />
                <Timecode />
            </div>
            <div className="flex items-center gap-0.5">
                <IconButton
                    icon={<Icon name="undo" />}
                    disabled={!canUndo}
                    onClick={a.undo}
                    title={`Undo animation change (${shortcut('⌘Z', 'Ctrl+Z')})`}
                    aria-label="Undo animation change"
                />
                <IconButton
                    icon={<Icon name="redo" />}
                    disabled={!canRedo}
                    onClick={a.redo}
                    title={`Redo animation change (${shortcut('⌘⇧Z', 'Ctrl+Shift+Z')})`}
                    aria-label="Redo animation change"
                />
                <LabeledToggle label="Snap" checked={snap} onChange={a.setSnap} className="ml-2" />
                <div className="ml-auto">
                    <Select
                        size="sm"
                        block={false}
                        aria-label="Playback speed"
                        value={rate}
                        onChange={a.setPlaybackRate}
                        options={RATES}
                    />
                </div>
            </div>
        </div>
    );
}

export default Transport;
