import clsx from 'clsx';
import { useMemo, type ReactNode } from 'react';
import { useStore } from '@store';
import { useActiveText } from '@hooks/useActiveText';
import { fontOptionsWith, injectFontStyles, matchFontValue } from '@/lib/utils/shapeFonts';
import { FLOAT_BAR_CLASS, FLOAT_SEP_CLASS } from '@/lib/floatChrome';
import { Select } from '../atoms/Select';
import { type IconName } from '../atoms/Icon';
import { FOCUS_RING } from '../atoms/control.styles';
import { SegmentedControl } from '../molecules/SegmentedControl';
import { NumberField } from '../atoms/NumberField';
import { focusShapeTextEditor, isEditingShapeText } from '@/lib/utils/shapeTextEditor';

type Props = {
    /** The text being edited (CanvasBoard positions the bar above it). */
    target: unknown;
};

const ALIGN: { value: string; icon: IconName; title: string }[] = [
    { value: 'left', icon: 'align-left', title: 'Align left' },
    { value: 'center', icon: 'align-center', title: 'Align center' },
    { value: 'right', icon: 'align-right', title: 'Align right' },
    { value: 'justify', icon: 'align-justify', title: 'Justify' },
];

/** macOS-style toggle segment: inset track, the "on" segment is a raised pill. */
function StyleButton({
    label,
    pressed,
    onClick,
    children,
}: {
    label: string;
    pressed: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={pressed}
            title={label}
            onClick={onClick}
            className={clsx(
                'inline-flex w-7 items-center justify-center rounded-full text-[13px] leading-none transition-colors',
                FOCUS_RING,
                pressed ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
            )}
        >
            {children}
        </button>
    );
}

/**
 * The one floating text bar of the app (text boxes, text shapes, sticky notes), macOS capsule:
 * Font (pop-up) | Size (− n +) | Style (B / I / U) | Alignment. Colours and the rest live in the
 * Text panel / palette. Reads the text live from the canvas and writes through `updateText`, so it styles
 * highlighted characters while typing and every change is undoable.
 */
export function FloatingTextToolbar({ target }: Props) {
    const [t, refresh] = useActiveText();
    const updateText = useStore((s) => s.updateText);
    const canvas = useStore((s) => s.canvas) as {
        getActiveObject?: () => unknown;
    } | null;

    const fontValue = t ? matchFontValue(t.fontFamily) : '';
    const options = useMemo(() => fontOptionsWith(fontValue), [fontValue]);

    if (!target || !t) return null;

    const apply = (props: Record<string, unknown>) => {
        updateText(props);
        refresh();
        // while typing (sticky note / text shape editor, or a text box in edit mode) hand the
        // focus back so the next keys go into the text. Next tick: a field that just committed
        // on Enter re-selects itself (input.select() takes focus) after this runs.
        setTimeout(() => {
            if (isEditingShapeText()) focusShapeTextEditor();
            else {
                const o = canvas?.getActiveObject?.() as
                    { isEditing?: boolean; hiddenTextarea?: HTMLTextAreaElement } | undefined;
                if (o?.isEditing) o.hiddenTextarea?.focus();
            }
        }, 0);
    };

    return (
        <div
            // keep the text editing session: clicks on the bar chrome must not blur the canvas
            onMouseDown={(e) => {
                const el = e.target as HTMLElement;
                if (!el.closest('input, [role="combobox"], [role="listbox"]')) e.preventDefault();
            }}
            // the shape text editor stays open while the focus is in here (lib/utils/shapeTextEditor)
            data-text-float
            className={FLOAT_BAR_CLASS}
        >
            {/* pop-up button look: no box until hovered */}
            <Select<string>
                aria-label="Font"
                size="sm"
                block={false}
                className="w-40 rounded-full! border-transparent! bg-transparent! pl-3! shadow-none! hover:bg-surface-strong! font-medium"
                value={fontValue}
                options={options}
                onChange={(fontFamily) => {
                    injectFontStyles();
                    apply({ fontFamily });
                }}
            />

            <NumberField
                aria-label="Font size"
                incrementLabel="Bigger text"
                decrementLabel="Smaller text"
                value={t.fontSize}
                min={1}
                max={1000}
                precision={1}
                onCommit={(fontSize) => apply({ fontSize })}
                className="w-[88px] rounded-full! border-transparent! bg-surface-strong! [&_button]:rounded-full!"
            />

            <span className={FLOAT_SEP_CLASS} />

            <div
                role="group"
                aria-label="Text style"
                className="inline-flex h-7 gap-0.5 rounded-full bg-surface-strong p-0.5"
            >
                <StyleButton
                    label="Bold"
                    pressed={t.bold}
                    onClick={() => apply({ fontWeight: t.bold ? 'normal' : 'bold' })}
                >
                    <span className="font-bold">B</span>
                </StyleButton>
                <StyleButton
                    label="Italic"
                    pressed={t.italic}
                    onClick={() => apply({ fontStyle: t.italic ? 'normal' : 'italic' })}
                >
                    <span className="font-serif italic">I</span>
                </StyleButton>
                <StyleButton
                    label="Underline"
                    pressed={t.underline}
                    onClick={() => apply({ underline: !t.underline })}
                >
                    <span className="underline underline-offset-2">U</span>
                </StyleButton>
            </div>

            <span className={FLOAT_SEP_CLASS} />

            <SegmentedControl<string>
                aria-label="Text alignment"
                size="sm"
                block={false}
                value={t.textAlign}
                onChange={(textAlign) => apply({ textAlign })}
                options={ALIGN.map((a) => ({ value: a.value, icon: a.icon, title: a.title }))}
                className="rounded-full! [&>button]:w-7 [&>button]:flex-none [&>button]:rounded-full! [&>button]:px-0"
            />
        </div>
    );
}
