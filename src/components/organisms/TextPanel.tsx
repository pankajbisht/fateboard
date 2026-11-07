import { useStore } from '@store';
import { fontOptionsWith, injectFontStyles, matchFontValue } from '@/lib/utils/shapeFonts';
import { useActiveText, type ActiveTextSnapshot } from '@hooks/useActiveText';
import type { TextCase } from '@/store/slices/createTextSlice';
import { Icon, type IconName } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { NumberField } from '../atoms/NumberField';
import { Select } from '../atoms/Select';
import { Button } from '../atoms/Button';
import { Field } from '../molecules/Field';
import { PanelSection } from '../molecules/PanelSection';
import { SliderField } from '../molecules/LabeledSlider';
import LabeledToggle from '../molecules/LabeledToggle';
import { SegmentedControl } from '../molecules/SegmentedControl';
import { PaintTargetSwatch } from '../molecules/PaintTargetSwatch';
import { EmptyState } from '../molecules/EmptyState';

const PRESETS = [
    {
        id: 'heading',
        label: 'Add a heading',
        text: 'Heading',
        fontSize: 64,
        bold: true,
        cls: 'text-xl font-bold',
    },
    {
        id: 'subheading',
        label: 'Add a subheading',
        text: 'Subheading',
        fontSize: 40,
        bold: true,
        cls: 'text-base font-semibold',
    },
    {
        id: 'body',
        label: 'Add body text',
        text: 'Body text',
        fontSize: 24,
        bold: false,
        cls: 'text-xs',
    },
] as const;

const ALIGN: { value: string; icon: IconName; title: string }[] = [
    { value: 'left', icon: 'align-left', title: 'Align left' },
    { value: 'center', icon: 'align-center', title: 'Align center' },
    { value: 'right', icon: 'align-right', title: 'Align right' },
    { value: 'justify', icon: 'align-justify', title: 'Justify' },
];

const CASES: { mode: TextCase; icon: IconName; label: string }[] = [
    { mode: 'upper', icon: 'case-upper', label: 'UPPERCASE' },
    { mode: 'lower', icon: 'case-lower', label: 'lowercase' },
    { mode: 'title', icon: 'case-title', label: 'Title Case' },
];

const MIN_SIZE = 1;
const MAX_SIZE = 1000;
const DEFAULT_SHADOW = { color: '#000000', blur: 8, offsetX: 3, offsetY: 3 };

/** Font size counter [− 24 px +]: typing applies on Enter / blur / outside click; − / + step by 1. */
function FontSize({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return (
        <NumberField
            aria-label="Font size"
            incrementLabel="Bigger text"
            decrementLabel="Smaller text"
            min={MIN_SIZE}
            max={MAX_SIZE}
            precision={1}
            value={value}
            unit="px"
            className="w-32"
            onCommit={onChange}
        />
    );
}

function TextStyle({
    t,
    apply,
    refresh,
}: {
    t: ActiveTextSnapshot;
    apply: Apply;
    refresh: () => void;
}) {
    const setTextCase = useStore((s) => s.setTextCase);

    return (
        <>
            <PanelSection
                title="Font"
                description={
                    t.hasRange
                        ? 'Changes apply to the highlighted characters.'
                        : t.count > 1
                          ? `Changes apply to ${t.count} text boxes.`
                          : undefined
                }
            >
                <Select<string>
                    aria-label="Font family"
                    value={matchFontValue(t.fontFamily)}
                    onChange={(fontFamily) => {
                        injectFontStyles();
                        apply({ fontFamily });
                    }}
                    options={fontOptionsWith(matchFontValue(t.fontFamily))}
                />
                <Field label="Size" inline>
                    <FontSize value={t.fontSize} onChange={(fontSize) => apply({ fontSize })} />
                </Field>
                <Field label="Style" inline>
                    <div className="flex gap-0.5">
                        <IconButton
                            icon={<Icon name="bold" />}
                            aria-label="Bold"
                            title="Bold (Ctrl+B)"
                            active={t.bold}
                            onClick={() => apply({ fontWeight: t.bold ? 'normal' : 'bold' })}
                        />
                        <IconButton
                            icon={<Icon name="italic" />}
                            aria-label="Italic"
                            title="Italic (Ctrl+I)"
                            active={t.italic}
                            onClick={() => apply({ fontStyle: t.italic ? 'normal' : 'italic' })}
                        />
                        <IconButton
                            icon={<Icon name="underline" />}
                            aria-label="Underline"
                            title="Underline (Ctrl+U)"
                            active={t.underline}
                            onClick={() => apply({ underline: !t.underline })}
                        />
                        <IconButton
                            icon={<Icon name="strikethrough" />}
                            aria-label="Strikethrough"
                            title="Strikethrough"
                            active={t.linethrough}
                            onClick={() => apply({ linethrough: !t.linethrough })}
                        />
                    </div>
                </Field>
                <Field label="Case" inline>
                    <div className="flex gap-0.5">
                        {CASES.map((c) => (
                            <IconButton
                                key={c.mode}
                                icon={<Icon name={c.icon} />}
                                aria-label={c.label}
                                title={c.label}
                                onClick={() => {
                                    setTextCase(c.mode);
                                    refresh();
                                }}
                            />
                        ))}
                    </div>
                </Field>
                <SegmentedControl<string>
                    aria-label="Text alignment"
                    value={t.textAlign}
                    onChange={(textAlign) => apply({ textAlign })}
                    options={ALIGN.map((a) => ({ value: a.value, icon: a.icon, title: a.title }))}
                />
            </PanelSection>

            <PanelSection title="Spacing">
                <SliderField
                    label="Letter spacing"
                    min={-200}
                    max={800}
                    step={10}
                    value={t.charSpacing}
                    defaultValue={0}
                    onChange={(charSpacing) => apply({ charSpacing }, false)}
                    onCommit={(charSpacing) => apply({ charSpacing })}
                />
                <SliderField
                    label="Line height"
                    min={0.5}
                    max={3}
                    step={0.05}
                    value={t.lineHeight}
                    defaultValue={1.16}
                    onChange={(lineHeight) => apply({ lineHeight }, false)}
                    onCommit={(lineHeight) => apply({ lineHeight })}
                />
            </PanelSection>

            <PanelSection title="Color">
                <Field label="Text color" inline>
                    <PaintTargetSwatch
                        id="text-fill"
                        label="Text color"
                        value={t.fill}
                        onChange={(fill) => apply({ fill })}
                    />
                </Field>
                <LabeledToggle
                    label="Highlight"
                    checked={!!t.textBackgroundColor}
                    onChange={(on) => apply({ textBackgroundColor: on ? '#fde68a' : '' })}
                />
                {t.textBackgroundColor && (
                    <Field label="Highlight color" inline>
                        <PaintTargetSwatch
                            id="text-highlight"
                            label="Highlight color"
                            value={t.textBackgroundColor}
                            onChange={(textBackgroundColor) => apply({ textBackgroundColor })}
                        />
                    </Field>
                )}
            </PanelSection>

            <PanelSection title="Effects">
                <LabeledToggle
                    label="Outline"
                    checked={!!t.stroke}
                    onChange={(on) =>
                        apply(
                            on
                                ? { stroke: '#000000', strokeWidth: 2, paintFirst: 'stroke' }
                                : { stroke: null, strokeWidth: 0 },
                        )
                    }
                />
                {t.stroke && (
                    <>
                        <Field label="Outline color" inline>
                            <PaintTargetSwatch
                                id="text-stroke"
                                label="Outline color"
                                value={t.stroke}
                                onChange={(stroke) => apply({ stroke })}
                            />
                        </Field>
                        <SliderField
                            label="Outline width"
                            min={0.5}
                            max={20}
                            step={0.5}
                            value={t.strokeWidth}
                            defaultValue={2}
                            unit="px"
                            onChange={(strokeWidth) => apply({ strokeWidth }, false)}
                            onCommit={(strokeWidth) => apply({ strokeWidth })}
                        />
                    </>
                )}

                <LabeledToggle
                    label="Shadow"
                    checked={!!t.shadow}
                    onChange={(on) => apply({ shadow: on ? DEFAULT_SHADOW : null })}
                />
                {t.shadow && <ShadowControls shadow={t.shadow} apply={apply} />}

                <SliderField
                    label="Opacity"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(t.opacity * 100)}
                    defaultValue={100}
                    unit="%"
                    onChange={(v) => apply({ opacity: v / 100 }, false)}
                    onCommit={(v) => apply({ opacity: v / 100 })}
                />
            </PanelSection>
        </>
    );
}

function ShadowControls({
    shadow,
    apply,
}: {
    shadow: NonNullable<ActiveTextSnapshot['shadow']>;
    apply: Apply;
}) {
    const set = (patch: Partial<typeof shadow>, history = true) =>
        apply({ shadow: { ...shadow, ...patch } }, history);
    return (
        <>
            <Field label="Shadow color" inline>
                <PaintTargetSwatch
                    id="text-shadow"
                    label="Shadow color"
                    value={shadow.color}
                    onChange={(color) => set({ color })}
                />
            </Field>
            <SliderField
                label="Blur"
                min={0}
                max={50}
                step={1}
                value={shadow.blur}
                defaultValue={8}
                unit="px"
                onChange={(blur) => set({ blur }, false)}
                onCommit={(blur) => set({ blur })}
            />
            <SliderField
                label="Offset X"
                min={-50}
                max={50}
                step={1}
                value={shadow.offsetX}
                defaultValue={3}
                unit="px"
                onChange={(offsetX) => set({ offsetX }, false)}
                onCommit={(offsetX) => set({ offsetX })}
            />
            <SliderField
                label="Offset Y"
                min={-50}
                max={50}
                step={1}
                value={shadow.offsetY}
                defaultValue={3}
                unit="px"
                onChange={(offsetY) => set({ offsetY }, false)}
                onCommit={(offsetY) => set({ offsetY })}
            />
        </>
    );
}

type Apply = (props: Record<string, unknown>, history?: boolean) => void;

/**
 * Left-sidebar Text panel: add text from presets, then style the selected text box
 * (or the highlighted characters while typing). Reads the selection live from the canvas and
 * writes through `updateText` / `setTextCase`, so every change is undoable.
 */
export function TextPanel() {
    const [t, refresh] = useActiveText();
    const addText = useStore((s) => s.addText);
    const updateText = useStore((s) => s.updateText);

    const apply: Apply = (props, history = true) => {
        updateText(props, { history });
        refresh();
    };

    return (
        <>
            <PanelSection title="Add text">
                <div className="flex flex-col gap-1.5">
                    {PRESETS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                                addText({ text: p.text, fontSize: p.fontSize, bold: p.bold })
                            }
                            className={`w-full cursor-pointer rounded-md border border-line-strong bg-surface px-3 py-2 text-left text-ink transition-colors hover:border-primary-500 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60 ${p.cls}`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </PanelSection>

            {t ? (
                <TextStyle t={t} apply={apply} refresh={refresh} />
            ) : (
                <EmptyState
                    title="No text selected"
                    description="Select a text box on the canvas to change its font, spacing, color and effects."
                    action={
                        <Button
                            variant="secondary"
                            size="sm"
                            icon="font"
                            onClick={() => addText({})}
                        >
                            Add a text box
                        </Button>
                    }
                />
            )}
        </>
    );
}

export default TextPanel;
