import { useStore } from '@/store';
import { useState } from 'react';
import { EffectSection } from './EffectSection';
import { EffectGrid } from './EffectGrid';
import { TransformInput } from '@/components/molecules/TransformInput';

export const PathEffects = () => {
    const { canvas, repeatGrid } = useStore();
    const activeObject = canvas?.getActiveObject();

    const [form, setForm] = useState({
        rows: 2,
        cols: 2,
        gapX: 10,
        gapY: 10,
    });

    const handleChange = (field: keyof typeof form, value: string) => {
        setForm((prev) => ({
            ...prev,
            [field]: parseInt(value, 10) || 0,
        }));
    };

    return (
        <>
            <EffectSection
                title="Repeat Grid"
                disabled={!activeObject}
                onApply={() => repeatGrid(activeObject, form.rows, form.cols, form.gapX, form.gapY)}
            >
                <EffectGrid>
                    <TransformInput
                        label="Rows"
                        value={form.rows}
                        onChange={(v) => handleChange('rows', v)}
                    />

                    <TransformInput
                        label="Gap X"
                        value={form.gapX}
                        onChange={(v) => handleChange('gapX', v)}
                    />

                    <TransformInput
                        label="Columns"
                        value={form.cols}
                        onChange={(v) => handleChange('cols', v)}
                    />

                    <TransformInput
                        label="Gap Y"
                        value={form.gapY}
                        onChange={(v) => handleChange('gapY', v)}
                    />
                </EffectGrid>
            </EffectSection>
        </>
    );
};
