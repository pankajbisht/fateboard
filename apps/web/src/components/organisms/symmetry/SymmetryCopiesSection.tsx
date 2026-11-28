import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { SliderField } from '../../molecules/LabeledSlider';
import { SwitchField } from '../../molecules/LabeledToggle';

/**
 * Linked copies (edit one, all follow; break / bake / merge), smart snapping, and the tools that act on what is
 * drawn: complete the other half (with natural imperfections = face mode), cut and mirror, magic wand, and the
 * symmetry check (score, heatmap, fix near-symmetry).
 */
export function SymmetryCopiesSection() {
    const s = useStore(
        useShallow((st) => ({
            options: st.symmetryOptions,
            setOptions: st.setSymmetryOptions,
            unlink: st.unlinkSymmetryCopies,
            bake: st.bakeSymmetryCopies,
            merge: st.mergeSymmetryCopies,
        })),
    );
    return (
        <div className="flex flex-col gap-2">
            <SwitchField
                label="Keep copies linked"
                description="Edit, move or turn one piece and every copy follows."
                checked={s.options.linked}
                onChange={(linked) => s.setOptions({ linked })}
            />
            <SwitchField
                label="Snap to the mirror"
                description="Dragged objects snap onto the axes and the centre."
                checked={s.options.snap}
                onChange={(snap) => s.setOptions({ snap })}
            />
            <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="secondary" onClick={() => s.unlink()}>
                    <Icon name="unlink" />
                    Break link
                </Button>
                <Button size="sm" variant="secondary" onClick={() => s.bake()}>
                    <Icon name="check" />
                    Bake all copies
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void s.merge()}>
                    <Icon name="object-group" />
                    Merge into a group
                </Button>
            </div>
        </div>
    );
}

export function SymmetryShapeSection() {
    const s = useStore(
        useShallow((st) => ({
            complete: st.completeSymmetryHalf,
            cut: st.cutAndMirror,
            wand: st.symmetryWandArmed,
            armWand: st.armSymmetryWand,
            score: st.symmetryScore,
            heatmap: st.symmetryHeatmap,
            setHeatmap: st.setSymmetryHeatmap,
            analyze: st.analyzeSymmetryNow,
            fix: st.fixNearSymmetry,
        })),
    );
    const [natural, setNatural] = useState(false);
    const [keep, setKeep] = useState<'1' | '-1'>('1');
    const [tolerance, setTolerance] = useState(35);
    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
                <SwitchField
                    label="Natural imperfections (face mode)"
                    description="Tiny differences so a face or character does not look robotic."
                    checked={natural}
                    onChange={setNatural}
                />
                <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onClick={() => void s.complete({ natural })}
                >
                    <Icon name="copy" />
                    Complete the other half
                </Button>
            </div>
            <div className="flex flex-col gap-2">
                <SegmentedControl<'1' | '-1'>
                    aria-label="Side to keep"
                    value={keep}
                    onChange={setKeep}
                    options={[
                        { value: '1', label: 'Keep left / top' },
                        { value: '-1', label: 'Keep right / bottom' },
                    ]}
                />
                <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onClick={() => void s.cut(keep === '1' ? 1 : -1)}
                >
                    <Icon name="scissors" />
                    Cut and mirror
                </Button>
            </div>
            <SwitchField
                label="Magic wand mirror"
                description="Click any object: it mirrors across its nearest edge. Esc stops."
                checked={s.wand}
                onChange={s.armWand}
            />
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => s.analyze()}>
                        <Icon name="magnifying-glass" />
                        Check symmetry
                    </Button>
                    {s.score && (
                        <span role="status" className="text-sm font-medium text-ink">
                            {s.score.score}% symmetric
                            <span className="text-xs text-ink-muted">
                                {' '}
                                ({s.score.pairs} pairs, {s.score.unmatched} alone)
                            </span>
                        </span>
                    )}
                </div>
                <SwitchField
                    label="Heatmap"
                    description="Green = has its mirror partner, red = none."
                    checked={s.heatmap}
                    onChange={s.setHeatmap}
                />
                <SliderField
                    label="Fix tolerance"
                    hint="How far off (in object sizes) still counts as almost symmetric"
                    min={5}
                    max={50}
                    unit="%"
                    value={tolerance}
                    onChange={setTolerance}
                />
                <Button
                    size="sm"
                    variant="secondary"
                    className="self-start"
                    onClick={() => s.fix(tolerance / 100)}
                >
                    <Icon name="wand-magic-sparkles" />
                    Fix near-symmetry
                </Button>
            </div>
        </div>
    );
}
