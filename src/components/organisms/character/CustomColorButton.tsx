import { useRef, useState } from 'react';
import { Swatch } from '../../atoms/Swatch';
import { ColorPickerPopover } from '../ColorPickerPopover';

/**
 * Any colour, inside the studio: a swatch that opens the app's colour picker (above the studio). The board's
 * paint-target swatches cannot work here: the palette they feed is the right dock, covered by the studio.
 */
export function CustomColorButton({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (hex: string) => void;
}) {
    const ref = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    return (
        <>
            <Swatch
                ref={ref}
                color={value}
                label={label}
                aria-haspopup="dialog"
                aria-expanded={open}
                className="ring-1 ring-line-strong"
                onClick={() => setOpen((o) => !o)}
            />
            {open && (
                <ColorPickerPopover
                    anchor={ref.current}
                    color={value}
                    onChange={onChange}
                    onClose={(refocus) => {
                        setOpen(false);
                        if (refocus) ref.current?.focus();
                    }}
                />
            )}
        </>
    );
}

export default CustomColorButton;
