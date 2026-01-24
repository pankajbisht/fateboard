import { useStore } from '@store';
import { TransformInput } from '../molecules/TransformInput.tsx';
import { TextToolsHeader } from './TextToolsHeader.tsx';
import { GlowDivider } from './toolbars/index.ts';
import { LayerControlBar } from './toolbars/ui/bars/LayerControlBar.tsx';
import { FlipBar } from './toolbars/ui/bars/FlipBar.tsx';
import { transformFieldsConfig } from '../config/transformfields.config.ts';

export const ShapeToolsHeader = () => {
    const transform = useStore((s) => s.transform);
    const setTransform = useStore((s) => s.setTransform);
    const hasSelection = useStore((s) => s.hasSelection);
    const canvas = useStore((s) => s.canvas);
    const setRadius = useStore((s) => s.setRadius);
    const { selectedObject } = useStore();
    const active = canvas?.getActiveObject();

    return (
        <div
            className={`px-2 py-1 overflow-x-auto bg-white ${
                !active ? 'pointer-events-none opacity-50' : ''
            }`}
        >
            <div className="flex items-center justify-between whitespace-nowrap text-sm">
                <div className="flex items-center gap-4">
                    <FlipBar />
                    <GlowDivider />
                    <LayerControlBar />
                    <GlowDivider />

                    <div className="flex items-center gap-2">
                        {transformFieldsConfig.map((field) => (
                            <TransformInput
                                key={field.key}
                                label={field.label}
                                value={transform[field.key]}
                                disabled={!hasSelection}
                                onChange={(val) => setTransform(field.key, val)}
                            />
                        ))}
                    </div>
                </div>

                {(active?.type === 'square' || active?.type === 'rect') && (
                    <div className="flex gap-4 px-4">
                        <GlowDivider />

                        <TransformInput
                            label="Rx"
                            value={transform.rx}
                            onChange={(val) => setRadius(val, transform.ry)}
                        />
                        <TransformInput
                            label="Ry"
                            value={transform.ry}
                            onChange={(val) => setRadius(transform.rx, val)}
                        />
                    </div>
                )}

                {selectedObject && selectedObject?.type === 'textbox' && (
                    <div className="flex px-4">
                        <GlowDivider />
                        <TextToolsHeader />
                    </div>
                )}
            </div>
        </div>
    );
};
