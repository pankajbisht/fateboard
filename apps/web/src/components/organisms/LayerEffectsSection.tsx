import { useStore } from '@store';
import type { SelectionStyle } from '@hooks/useSelectionStyle';
import { LAYER_BLUR_MAX } from '@/lib/canvas/layerBlur';
import { PanelSection } from '../molecules/PanelSection';
import { SliderField } from '../molecules/LabeledSlider';

/**
 * Fill & Shadow "Opacity" and "Layer blur" sections. Layer blur blurs the object itself (Figma's Layer blur);
 * the drop shadow keeps its own "Shadow blur". Slider drags preview without undo steps and commit on release.
 */
export function LayerEffectsSection({
    style,
    refresh,
}: {
    style: SelectionStyle;
    refresh: () => void;
}) {
    const previewOpacity = useStore((s) => s.previewOpacity);
    const endOpacityPreview = useStore((s) => s.endOpacityPreview);
    const setOpacity = useStore((s) => s.setOpacity);
    const setLayerBlur = useStore((s) => s.setLayerBlur);

    return (
        <>
            <PanelSection title="Opacity">
                <SliderField
                    label="Opacity"
                    min={5}
                    max={100}
                    step={1}
                    unit="%"
                    value={Math.round(style.opacity * 100)}
                    defaultValue={100}
                    onChange={(v) => {
                        previewOpacity(v); // live, no undo step
                        refresh();
                    }}
                    onCommit={(v) => {
                        endOpacityPreview();
                        setOpacity(v / 100); // one undo step
                        refresh();
                    }}
                />
            </PanelSection>

            <PanelSection
                title="Layer blur"
                description="Blurs the object itself. The drop shadow has its own Shadow blur."
            >
                <SliderField
                    label="Layer blur"
                    min={0}
                    max={LAYER_BLUR_MAX}
                    step={0.5}
                    unit="px"
                    value={style.layerBlur}
                    defaultValue={0}
                    onChange={(v) => {
                        setLayerBlur(v, { history: false });
                        refresh();
                    }}
                    onCommit={(v) => {
                        setLayerBlur(v);
                        refresh();
                    }}
                />
            </PanelSection>
        </>
    );
}
