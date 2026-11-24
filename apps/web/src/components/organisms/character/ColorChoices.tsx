import { Swatch } from '../../atoms/Swatch';
import { Field } from '../../molecules/Field';
import { CustomColorButton } from './CustomColorButton';

/** A colour row: palette swatches plus a custom colour. */
export function ColorChoices({
    label,
    colors,
    value,
    onChange,
}: {
    /** kept for callers; the custom colour no longer needs a paint target id */
    id?: string;
    label: string;
    colors: readonly string[];
    value: string;
    onChange: (color: string) => void;
}) {
    return (
        <Field wrap label={label}>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label={label}>
                {colors.map((c) => (
                    <Swatch
                        key={c}
                        color={c}
                        label={`${label} ${c}`}
                        state={c.toLowerCase() === value.toLowerCase() ? 'active' : 'none'}
                        onClick={() => onChange(c)}
                    />
                ))}
                <CustomColorButton
                    label={`Custom ${label.toLowerCase()}`}
                    value={value}
                    onChange={onChange}
                />
            </div>
        </Field>
    );
}

export default ColorChoices;
