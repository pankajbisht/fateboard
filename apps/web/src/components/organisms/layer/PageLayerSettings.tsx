import { SliderField } from '@/components/molecules/LabeledSlider';
import { SwitchField } from '@/components/molecules/LabeledToggle';
import { SelectField } from '@/components/molecules/SelectField';
import { LAYER_BLENDS, type DocLayer, type LayerBlend } from '@/lib/canvas/docLayers';

const BLEND_OPTIONS = LAYER_BLENDS.map((b) => ({
    value: b,
    label: b.charAt(0).toUpperCase() + b.slice(1).replace('-', ' '),
}));

/** Settings of the active page layer / folder: opacity, blend, clipping, reference. */
export function PageLayerSettings({
    layer,
    onUpdate,
}: {
    layer: DocLayer;
    onUpdate: (patch: Partial<DocLayer>) => void;
}) {
    const isLayer = layer.kind === 'layer';
    return (
        <div className="space-y-2 border-t border-line px-3 py-2">
            <SliderField
                label="Opacity"
                min={0}
                max={100}
                unit="%"
                value={Math.round(layer.opacity * 100)}
                onChange={(v) => onUpdate({ opacity: v / 100 })}
            />
            <SelectField<LayerBlend>
                label="Blend"
                inline
                options={BLEND_OPTIONS}
                value={layer.blend}
                onChange={(blend) => onUpdate({ blend })}
            />
            {isLayer && (
                <SwitchField
                    label="Clip to layer below"
                    checked={layer.clip}
                    onChange={(clip) => onUpdate({ clip })}
                />
            )}
            {isLayer && (
                <SwitchField
                    label="Reference layer"
                    hint="The paint bucket fills using only reference layers"
                    checked={layer.reference}
                    onChange={(reference) => onUpdate({ reference })}
                />
            )}
        </div>
    );
}
