import { useStore } from '@store';
import { Button } from '../../atoms/Button';
import LabeledToggle from '../../molecules/LabeledToggle';

/** Manual keyframes: add one at the playhead, or record every change (auto-key). */
export function KeyframeTools({ canAdd }: { canAdd: boolean }) {
    const addKeyframe = useStore((s) => s.addKeyframe);
    const autoKey = useStore((s) => s.autoKey);
    const setAutoKey = useStore((s) => s.setAutoKey);

    return (
        <>
            <div className="flex items-center gap-2">
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
            </div>
            <LabeledToggle
                label="Auto-key"
                hint={
                    autoKey
                        ? 'Recording. Move the playhead, then move, resize or rotate one object: a keyframe is added for you.'
                        : 'Record a keyframe whenever you change an object.'
                }
                checked={autoKey}
                onChange={setAutoKey}
            />
        </>
    );
}

export default KeyframeTools;
