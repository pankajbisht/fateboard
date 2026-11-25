import { useStore } from '@store';
import { Button } from '../../atoms/Button';
import LabeledToggle from '../../molecules/LabeledToggle';

/** Manual keyframes: add one at the playhead, or record every change (auto-key). */
export function KeyframeTools({ canAdd }: { canAdd: boolean }) {
    const addKeyframe = useStore((s) => s.addKeyframe);
    const autoKey = useStore((s) => s.autoKey);
    const setAutoKey = useStore((s) => s.setAutoKey);
    const hint = autoKey
        ? 'Recording. Move the playhead, then move, resize or rotate one object: a keyframe is added for you.'
        : 'Record a keyframe whenever you change an object.';

    return (
        <div className="flex items-center gap-2 whitespace-nowrap">
            <Button
                variant="secondary"
                size="sm"
                icon="plus"
                disabled={!canAdd}
                onClick={() => addKeyframe()}
                title={
                    canAdd
                        ? "Save the selected object's position, size and colors at the playhead (K)"
                        : 'Select an object first'
                }
            >
                Keyframe at playhead
            </Button>
            <span className="flex items-center gap-1.5" title={hint}>
                <LabeledToggle
                    label="Auto-key"
                    description={hint}
                    checked={autoKey}
                    onChange={setAutoKey}
                />
                {autoKey && (
                    // red dot = graphic (3:1 is enough); the word stays ink (text-danger fails AA in dark, BUG-201)
                    <span
                        aria-hidden
                        className="flex items-center gap-1 text-[11px] font-medium text-ink"
                    >
                        <span className="size-1.5 rounded-full bg-danger" />
                        Recording
                    </span>
                )}
            </span>
        </div>
    );
}

export default KeyframeTools;
