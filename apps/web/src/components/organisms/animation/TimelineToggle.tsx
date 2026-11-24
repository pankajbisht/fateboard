import { useStore } from '@store';
import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import { Tooltip } from '../../molecules/Tooltip';
import { TIMELINE_KEYS } from './timelineKeys';

/** Footer button: show or hide the animation timeline under the board. */
export function TimelineToggle() {
    const open = useStore((s) => s.timelineOpen);
    const toggle = useStore((s) => s.toggleTimeline);
    return (
        <Tooltip position="top" content={`Timeline (${TIMELINE_KEYS})`}>
            <IconButton
                active={open}
                aria-pressed={open}
                icon={<Icon name="video" />}
                onClick={toggle}
                aria-label="Timeline"
                className="border border-line"
                size="chrome"
            />
        </Tooltip>
    );
}

export default TimelineToggle;
