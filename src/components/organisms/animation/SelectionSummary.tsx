import { useStore } from '@store';
import { Icon } from '../../atoms/Icon';
import { IconButton } from '../../atoms/IconButton';
import { seconds } from './animation.logic';
import type { AnimSelection } from './useAnimationCanvas';

/** Top of the panel: what is selected on the canvas and whether it is animated yet. */
export function SelectionSummary({ selection }: { selection: AnimSelection }) {
    const tracks = useStore((s) => s.tracks);
    const clearTrack = useStore((s) => s.clearTrack);

    const animated = selection.ids.map((id) => tracks[id]).filter((t) => t?.keyframes.length);
    const times = animated.flatMap((t) => t.keyframes.map((k) => k.time));
    const keyframes = times.length;

    let detail = 'Select an object on the canvas to animate it.';
    if (selection.count && !keyframes) detail = 'Not animated yet. Pick an animation below.';
    else if (keyframes)
        detail = `${keyframes} keyframe${keyframes === 1 ? '' : 's'} · ${seconds(Math.min(...times))} to ${seconds(Math.max(...times))}`;

    return (
        <div
            className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-muted px-2.5 py-2"
            role="status"
            aria-label="Selection"
        >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface text-ink-subtle">
                <Icon name={selection.count ? 'shapes' : 'arrow-pointer'} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink">
                    {selection.label || 'Nothing selected'}
                </p>
                <p className="truncate text-caption text-ink-muted">{detail}</p>
            </div>
            {selection.count === 1 && animated.length === 1 && (
                <IconButton
                    tone="danger"
                    icon={<Icon name="trash-can" />}
                    title="Remove this object's animation"
                    aria-label={`Remove animation from ${selection.label}`}
                    onClick={() => clearTrack(animated[0].objectId)}
                />
            )}
        </div>
    );
}

export default SelectionSummary;
