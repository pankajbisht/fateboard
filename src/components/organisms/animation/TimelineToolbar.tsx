import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import { KeyframeTools } from './KeyframeTools';
import { TIMELINE_KEYS } from './timelineKeys';
import { Transport } from './Transport';

const Divider = () => <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />;

/** Quick switches for the board overlays (their settings are in the View pane). */
function OverlayToggles() {
    const { onion, path } = useStore(
        useShallow((s) => ({ onion: s.onionSkin.on, path: s.motionPath })),
    );
    const setOnionSkin = useStore((s) => s.setOnionSkin);
    const setMotionPath = useStore((s) => s.setMotionPath);
    return (
        <div role="group" aria-label="Board overlays" className="flex items-center gap-0.5">
            <IconButton
                icon={<Icon name="onion-skin" />}
                active={onion}
                aria-pressed={onion}
                onClick={() => setOnionSkin({ on: !onion })}
                aria-label="Onion skin"
                title="Onion skin: the frames before (red) and after (green) the playhead"
            />
            <IconButton
                icon={<Icon name="motion-path" />}
                active={path}
                aria-pressed={path}
                onClick={() => setMotionPath(!path)}
                aria-label="Motion path"
                title="Motion path: where animated objects travel"
            />
        </div>
    );
}

/**
 * The dock's top bar: playback, keyframes, overlays; Close stays at the right end. Wraps on narrow boards;
 * on phones it is one row that scrolls sideways (like the footer), so the timeline keeps its height.
 */
export function TimelineToolbar({ canAdd }: { canAdd: boolean }) {
    const setOpen = useStore((s) => s.setTimelineOpen);
    return (
        <div className="flex shrink-0 items-start border-b border-line">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-1 pl-2 [scrollbar-width:none] max-sm:flex-nowrap max-sm:overflow-x-auto [&>*]:shrink-0">
                <Transport />
                <Divider />
                <KeyframeTools canAdd={canAdd} />
                <Divider />
                <OverlayToggles />
            </div>
            <IconButton
                className="m-1 shrink-0"
                icon={<Icon name="xmark" />}
                onClick={() => setOpen(false)}
                aria-label="Close timeline"
                title={`Close timeline (${TIMELINE_KEYS})`}
            />
        </div>
    );
}

export default TimelineToolbar;
