import { useEffect, useState } from 'react';
import { useStore } from '@store';
import { useSelectionStyle } from '@hooks/useSelectionStyle';
import type { ReflectOptions } from '@/store/slices/createPaintToolsSlice';
import { PanelAction } from '../molecules/PanelAction';
import { PanelSection } from '../molecules/PanelSection';
import { SegmentedControl } from '../molecules/SegmentedControl';
import { SymmetryControls } from './SymmetryControls';
import { SymmetryCopiesSection, SymmetryShapeSection } from './symmetry/SymmetryCopiesSection';
import { SymmetryLook } from './symmetry/SymmetryLook';
import { SymmetryChallengeSection, SymmetryMakers } from './symmetry/SymmetryMakers';
import { SymmetryMirrorLens } from './symmetry/SymmetryMirrorLens';
import { SymmetryMotion } from './symmetry/SymmetryMotion';
import { SymmetryPresets } from './symmetry/SymmetryPresets';
import { SymmetrySourcePicker } from './symmetry/SymmetrySourcePicker';

type Around = NonNullable<ReflectOptions['around']>;

/**
 * Right dock "Symmetry": pick a mode, pick where it comes from, tune the look, save a preset. Drawing copies
 * every stroke (ghosts while drawing); "Reflect selection" applies the same setup to selected objects (left-right
 * when symmetry is off). While this panel is open the guide and its handles show on the board in any tool.
 */
export function SymmetryPanel() {
    const reflectSelection = useStore((s) => s.reflectSelection);
    const showToast = useStore((s) => s.showToast);
    const setPanelOpen = useStore((s) => s.setSymmetryPanelOpen);
    const lens = useStore((s) => s.symmetryLens);
    const [style] = useSelectionStyle();
    const [around, setAround] = useState<Around>('selection');
    const selected = style?.count ?? 0;

    useEffect(() => {
        setPanelOpen(true);
        return () => setPanelOpen(false);
    }, [setPanelOpen]);

    const run = async () => {
        const added = await reflectSelection({ around });
        showToast({
            message: added
                ? `Added ${added} ${added === 1 ? 'copy' : 'copies'}.`
                : 'Select something to reflect first.',
        });
    };

    return (
        <>
            <PanelSection
                title="Drawing symmetry"
                description="Every stroke is copied as you draw. M turns it on or off; Shift + [ and ] change the copies."
            >
                <SymmetryControls />
            </PanelSection>
            <PanelSection
                title="Mirror source"
                description="Where the mirror sits: a free centre, the page, the selection, another object or a pin."
            >
                <SymmetrySourcePicker />
            </PanelSection>
            <PanelSection title="Linked copies" collapsible defaultOpen={false}>
                <SymmetryCopiesSection />
            </PanelSection>
            <PanelSection title="Copies look" collapsible defaultOpen={false}>
                <SymmetryLook />
            </PanelSection>
            <PanelSection title="Presets" collapsible defaultOpen={false}>
                <SymmetryPresets />
            </PanelSection>
            <PanelSection
                title="Reflect selection"
                description="Apply the symmetry above to the selected objects (left-right when it is off)."
            >
                <SegmentedControl<Around>
                    aria-label="Reflect around"
                    value={around}
                    onChange={setAround}
                    options={[
                        { value: 'selection', label: 'Selection centre' },
                        { value: 'page', label: 'Page centre' },
                        { value: 'source', label: 'Mirror source' },
                    ]}
                />
                <PanelAction icon="reflect" disabled={!selected} onClick={run}>
                    Reflect selection
                </PanelAction>
            </PanelSection>
            <PanelSection
                title="Make and fix"
                description="Complete a half, cut and mirror, magic wand, and check how symmetric the page is."
                collapsible
                defaultOpen={false}
            >
                <SymmetryShapeSection />
            </PanelSection>
            <PanelSection title="Animate" collapsible defaultOpen={false}>
                <SymmetryMotion />
            </PanelSection>
            <PanelSection title="Patterns, stamps and replay" collapsible defaultOpen={false}>
                <SymmetryMakers />
            </PanelSection>
            <PanelSection
                title="Symmetry challenge"
                description="Complete the missing half of a target and get a score."
                collapsible
                defaultOpen={false}
            >
                <SymmetryChallengeSection />
            </PanelSection>
            {lens && <SymmetryMirrorLens />}
        </>
    );
}

export default SymmetryPanel;
