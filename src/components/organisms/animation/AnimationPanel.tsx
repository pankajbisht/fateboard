import { useEffect } from 'react';
import { useStore } from '@store';
import { ANIM_CSS, useAnimationTheme } from '../../hooks/useAnimationTheme';
import { PanelAction } from '../../molecules/PanelAction';
import { PanelSection } from '../../molecules/PanelSection';
import { ExportSection } from './ExportSection';
import { KeyframeInspector } from './KeyframeInspector';
import { KeyframeTools } from './KeyframeTools';
import { PresetPicker } from './PresetPicker';
import { SelectionSummary } from './SelectionSummary';
import { Timeline } from './Timeline';
import { Transport } from './Transport';
import { useCanvasSelection } from './useAnimationCanvas';
import { useAnimationKeys } from './useAnimationKeys';

function ClearAll() {
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

/**
 * The Animate tab, in the order you work: what is selected, add an animation, fine-tune it on
 * the timeline, edit a keyframe, export. Composition only; each part reads the store itself.
 */
export default function AnimationPanel() {
    const canvas = useStore((s) => s.canvas);
    const bindAutoKey = useStore((s) => s.bindAutoKey);
    const selection = useCanvasSelection();
    const theme = useAnimationTheme();
    const keys = useAnimationKeys();

    useEffect(() => bindAutoKey(), [canvas, bindAutoKey]);

    // Playback and auto-key belong to the open panel: without it there is no Pause button, and
    // the auto-key listeners are gone while the switch would still say "on" (BUG-181).
    useEffect(
        () => () => {
            const st = useStore.getState();
            st.pause();
            if (st.autoKey) st.setAutoKey(false);
        },
        [],
    );

    return (
        <div
            className="flex flex-col gap-4 outline-none"
            style={theme.style}
            data-anim-theme={theme.isDark ? 'dark' : 'light'}
            tabIndex={0}
            onKeyDown={keys.onKeyDown}
            onKeyUp={keys.onKeyUp}
        >
            <style>{ANIM_CSS}</style>
            <SelectionSummary selection={selection} />
            <PresetPicker selection={selection} />
            <PanelSection title="Timeline">
                <div className="rounded-lg border border-line bg-surface p-2">
                    <Transport />
                </div>
                <Timeline selectedIds={selection.ids} />
                <KeyframeTools canAdd={selection.count > 0} />
            </PanelSection>
            <KeyframeInspector />
            <ExportSection />
            <ClearAll />
        </div>
    );
}
