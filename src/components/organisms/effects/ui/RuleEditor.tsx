import { TransformInput } from '@/components/molecules/TransformInput';
import type { ColorRule, PaintTarget, RuleType } from '@/lib/patternRules';
import { PaintTargetSwatch } from '@/components/molecules/PaintTargetSwatch';
import { SelectField } from '@/components/molecules/SelectField';
import { Button } from '@/components/atoms/Button';
import { IconButton } from '@/components/atoms/IconButton';
import { Icon } from '@/components/atoms/Icon';

const FALLBACK_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#14b8a6'];

const RULES: Record<
    Exclude<RuleType, 'custom'>,
    { label: string; hint: string; min: number; max: number; labels?: string[] }
> = {
    none: { label: 'No rule (keep colours)', hint: '', min: 0, max: 0 },
    oddEven: {
        label: 'Odd / Even items',
        hint: 'Items 1, 3, 5… get the first colour, 2, 4, 6… the second.',
        min: 1,
        max: 2,
        labels: ['Odd', 'Even'],
    },
    rowOddEven: {
        label: 'Odd / Even rows',
        hint: 'Whole rows alternate between the two colours.',
        min: 1,
        max: 2,
        labels: ['Odd rows', 'Even rows'],
    },
    colOddEven: {
        label: 'Odd / Even columns',
        hint: 'Whole columns alternate between the two colours.',
        min: 1,
        max: 2,
        labels: ['Odd cols', 'Even cols'],
    },
    checkerboard: {
        label: 'Checkerboard',
        hint: 'Neighbours (left/right/up/down) always differ.',
        min: 2,
        max: 2,
        labels: ['Colour A', 'Colour B'],
    },
    everyNth: {
        label: 'Every Nth item',
        hint: 'Every Nth item gets the first colour; the rest get the second (or keep their own).',
        min: 1,
        max: 2,
        labels: ['Every Nth', 'Others'],
    },
    diagonal: {
        label: 'Diagonal palette',
        hint: 'The palette cycles along diagonals.',
        min: 2,
        max: 6,
    },
    palette: {
        label: 'Palette cycle',
        hint: 'Colours repeat in order, item by item.',
        min: 2,
        max: 6,
    },
    random: {
        label: 'Random from palette',
        hint: 'Seeded random pick, so the result is stable. Use Shuffle for a new one.',
        min: 2,
        max: 6,
    },
};

type Props = {
    value: ColorRule;
    onChange: (rule: ColorRule) => void;
    disabled?: boolean;
    /** unique per editor: its colors become palette targets */
    idPrefix?: string;
};

export const RuleEditor = ({ value, onChange, disabled, idPrefix = 'rule' }: Props) => {
    const def = RULES[value.type as Exclude<RuleType, 'custom'>] ?? RULES.none;

    const setType = (type: Exclude<RuleType, 'custom'>) => {
        const next = RULES[type];
        const colors = [...value.colors];
        while (colors.length < next.min)
            colors.push(FALLBACK_COLORS[colors.length % FALLBACK_COLORS.length]);
        onChange({ ...value, type, colors: next.max > 0 ? colors.slice(0, next.max) : colors });
    };

    const setColor = (i: number, color: string) =>
        onChange({ ...value, colors: value.colors.map((c, idx) => (idx === i ? color : c)) });

    const addColor = () =>
        onChange({
            ...value,
            colors: [
                ...value.colors,
                FALLBACK_COLORS[value.colors.length % FALLBACK_COLORS.length],
            ],
        });

    const removeColor = (i: number) =>
        onChange({ ...value, colors: value.colors.filter((_, idx) => idx !== i) });

    const parse = (raw: string | number, min: number, max: number) => {
        const n = parseInt(String(raw), 10);
        return Number.isNaN(n) ? min : Math.min(max, Math.max(min, n));
    };

    const shown = value.colors.slice(0, def.max || 0);
    const resizable = def.max > def.min;

    return (
        <div className="flex flex-col gap-3">
            <SelectField<Exclude<RuleType, 'custom'>>
                label="Colour rule"
                disabled={disabled}
                value={value.type === 'custom' ? 'none' : value.type}
                onChange={setType}
                options={(Object.keys(RULES) as Exclude<RuleType, 'custom'>[]).map((key) => ({
                    value: key,
                    label: RULES[key].label,
                }))}
            />

            {value.type !== 'none' && (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        {shown.map((color, i) => (
                            <div key={i} className="flex flex-col items-center gap-0.5">
                                <PaintTargetSwatch
                                    id={`${idPrefix}-color-${i}`}
                                    label={def.labels?.[i] ?? `Colour ${i + 1}`}
                                    disabled={disabled}
                                    value={color}
                                    onChange={(hex) => setColor(i, hex)}
                                />
                                <span className="text-[10px] text-ink-muted">
                                    {def.labels?.[i] ?? `#${i + 1}`}
                                </span>
                                {resizable && shown.length > def.min && (
                                    <IconButton
                                        size="sm"
                                        tone="danger"
                                        icon={<Icon name="xmark" />}
                                        disabled={disabled}
                                        onClick={() => removeColor(i)}
                                        aria-label={`Remove colour ${def.labels?.[i] ?? i + 1}`}
                                        title="Remove colour"
                                    />
                                )}
                            </div>
                        ))}
                        {resizable && shown.length < def.max && (
                            <Button
                                variant="secondary"
                                size="sm"
                                icon="plus"
                                className="border-dashed"
                                disabled={disabled}
                                onClick={addColor}
                            >
                                Colour
                            </Button>
                        )}
                    </div>

                    {value.type === 'everyNth' && (
                        <div className="grid grid-cols-2 gap-2">
                            <TransformInput
                                label="Every N"
                                value={value.n ?? 2}
                                onChange={(v) => onChange({ ...value, n: parse(v, 1, 100) })}
                            />
                            <TransformInput
                                label="Offset"
                                value={value.offset ?? 0}
                                onChange={(v) => onChange({ ...value, offset: parse(v, 0, 100) })}
                            />
                        </div>
                    )}

                    {value.type === 'random' && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="self-start"
                            disabled={disabled}
                            onClick={() =>
                                onChange({ ...value, seed: Math.floor(Math.random() * 1_000_000) })
                            }
                        >
                            Shuffle
                        </Button>
                    )}

                    <SelectField<PaintTarget>
                        label="Apply colour to"
                        disabled={disabled}
                        value={value.applyTo}
                        onChange={(v) => onChange({ ...value, applyTo: v })}
                        options={[
                            { value: 'fill', label: 'Fill' },
                            { value: 'stroke', label: 'Stroke' },
                            { value: 'both', label: 'Fill + stroke' },
                        ]}
                    />

                    {def.hint && <p className="text-caption text-ink-muted">{def.hint}</p>}
                </>
            )}
        </div>
    );
};
