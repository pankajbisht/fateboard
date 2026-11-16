import { useStore } from '@store';
import { GlowDivider } from '@/components/atoms/GlowDivider';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { Bar, Hint, Key } from './drawToolParts';

/** Lasso (L) options: select or fill, touch or contain. */
export function LassoOptions() {
    const style = useStore((s) => s.lassoStyle);
    const setLassoStyle = useStore((s) => s.setLassoStyle);
    return (
        <Bar label="Lasso" icon="lasso">
            <GlowDivider />
            <SegmentedControl<'select' | 'fill'>
                aria-label="Lasso action"
                size="sm"
                block={false}
                className="[&>button]:flex-none [&>button]:px-2.5"
                value={style.action}
                onChange={(action) => setLassoStyle({ action })}
                options={[
                    { value: 'select', label: 'Select' },
                    { value: 'fill', label: 'Fill' },
                ]}
            />
            {style.action === 'select' && (
                <SegmentedControl<'touch' | 'contain'>
                    aria-label="Objects to pick"
                    size="sm"
                    block={false}
                    className="[&>button]:flex-none [&>button]:px-2.5"
                    value={style.match}
                    onChange={(match) => setLassoStyle({ match })}
                    options={[
                        { value: 'touch', label: 'Touching' },
                        { value: 'contain', label: 'Inside only' },
                    ]}
                />
            )}
            <Hint>
                {style.action === 'select' ? (
                    <>
                        <Key>Shift</Key> add · <Key>Alt</Key> remove
                    </>
                ) : (
                    'The loop becomes a shape in the drawing colour'
                )}
            </Hint>
        </Bar>
    );
}
