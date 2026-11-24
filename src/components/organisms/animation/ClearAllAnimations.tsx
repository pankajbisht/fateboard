import { useStore } from '@store';
import { PanelAction } from '../../molecules/PanelAction';

/** Removes every animation on the page, after asking (one undo step). */
export function ClearAllAnimations() {
    const clear = useStore((s) => s.clearAllAnimations);
    const has = useStore((s) => Object.keys(s.tracks).length > 0);
    const confirmDialog = useStore((s) => s.confirmDialog);
    const onClear = async () => {
        const ok = await confirmDialog({
            title: 'Remove all animations?',
            message: 'You can undo this.',
            confirmLabel: 'Remove all',
            tone: 'danger',
        });
        if (ok) clear();
    };
    return (
        <PanelAction tone="danger" icon="trash-can" disabled={!has} onClick={onClear}>
            Clear all animations
        </PanelAction>
    );
}

export default ClearAllAnimations;
