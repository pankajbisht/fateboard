import { useEffect, useId, useState, type ReactNode } from 'react';
import { useStore } from '@/store';
import { type IconSize, type ThemeMode, type Unit } from '@/store/slices/createSettingSlice';
import { ColorThemePicker } from './ColorThemePicker';
import { Switch } from '@/components/atoms/Switch';
import { SegmentedControl, type SegmentOption } from '@/components/molecules/SegmentedControl';

/* -------------------------------------------------------------------------- */
/*  Option lists                                                               */
/* -------------------------------------------------------------------------- */

const THEME_OPTIONS: Option<ThemeMode>[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
];

const ICON_SIZE_OPTIONS: Option<IconSize>[] = [
    { value: 'sm', label: 'Small' },
    { value: 'md', label: 'Medium' },
    { value: 'lg', label: 'Large' },
];

const UNIT_OPTIONS: Option<Unit>[] = [
    { value: 'px', label: 'px' },
    { value: 'mm', label: 'mm' },
    { value: 'cm', label: 'cm' },
    { value: 'in', label: 'in' },
];

/** Same as --ui-rail-icon in index.css, so the preview shows the real size. */
const ICON_PREVIEW_PX: Record<IconSize, number> = { sm: 16, md: 19, lg: 23 };

/* -------------------------------------------------------------------------- */
/*  Building blocks                                                            */
/* -------------------------------------------------------------------------- */

type Option<T extends string> = SegmentOption<T>;

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-4">
                <h2 className="text-base font-semibold text-ink">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
            </div>
            <div className="divide-y divide-line px-5">{children}</div>
        </section>
    );
}

function Row({
    title,
    description,
    children,
    labelId,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    labelId?: string;
}) {
    return (
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="min-w-0 sm:max-w-xs">
                <p id={labelId} className="text-sm font-medium text-ink">
                    {title}
                </p>
                {description && <p className="mt-0.5 text-sm text-ink-muted">{description}</p>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

function Preferences() {
    const settings = useStore((s) => s.settings);
    const setMode = useStore((s) => s.setMode);
    const setIconSize = useStore((s) => s.setIconSize);
    const toggleFreehand = useStore((s) => s.toggleFreehand);
    const setColorTheme = useStore((s) => s.setColorTheme);
    const setUnit = useStore((s) => s.setUnit);
    const resetSettings = useStore((s) => s.resetSettings);

    const freehandLabelId = useId();
    const [confirmingReset, setConfirmingReset] = useState(false);

    // Don't leave a pending confirmation armed forever.
    useEffect(() => {
        if (!confirmingReset) return;
        const timer = window.setTimeout(() => setConfirmingReset(false), 5000);
        return () => window.clearTimeout(timer);
    }, [confirmingReset]);

    const iconPx = ICON_PREVIEW_PX[settings.iconSize];

    return (
        <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
            <header>
                <h1 className="text-2xl font-semibold text-ink">Settings</h1>
                <p className="mt-1 text-sm text-ink-muted">
                    Changes are saved automatically on this device.
                </p>
            </header>

            <Section title="Appearance">
                <Row title="Theme" description="System follows your device setting.">
                    <SegmentedControl
                        block={false}
                        aria-label="Theme"
                        value={settings.mode}
                        options={THEME_OPTIONS}
                        onChange={setMode}
                    />
                </Row>

                <Row
                    title="Color theme"
                    description="Brand color for buttons, selections and the board. Works in light and dark."
                >
                    <ColorThemePicker value={settings.colorTheme} onChange={setColorTheme} />
                </Row>

                <Row title="Icon size" description="Applies to toolbars and panels.">
                    <div className="flex items-center gap-4">
                        <span
                            aria-hidden
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-muted"
                        >
                            <span
                                className="rounded-sm bg-ink-muted transition-all"
                                style={{ width: iconPx, height: iconPx }}
                            />
                        </span>
                        <SegmentedControl
                            block={false}
                            aria-label="Icon size"
                            value={settings.iconSize}
                            options={ICON_SIZE_OPTIONS}
                            onChange={setIconSize}
                        />
                    </div>
                </Row>
            </Section>

            <Section
                title="Canvas"
                description="Choose between an endless canvas and a fixed page. Set the page size in the Canvas Size panel."
            >
                <Row
                    title="Freehand"
                    description="An endless canvas with no page boundary."
                    labelId={freehandLabelId}
                >
                    <Switch
                        checked={settings.freehand}
                        onChange={() => toggleFreehand()}
                        aria-labelledby={freehandLabelId}
                    />
                </Row>
            </Section>

            {/* page size: Canvas Size panel; grid / snap: top bar (one place per feature) */}
            <Section title="Units">
                <Row title="Units" description="Used on rulers and size fields.">
                    <SegmentedControl
                        block={false}
                        aria-label="Units"
                        value={settings.unit}
                        options={UNIT_OPTIONS}
                        onChange={setUnit}
                    />
                </Row>
            </Section>

            <div className="flex items-center justify-between rounded-xl border border-line bg-surface px-5 py-4">
                <div>
                    <p className="text-sm font-medium text-ink">Reset settings</p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                        Restore every setting on this page to its default.
                    </p>
                </div>

                {confirmingReset ? (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setConfirmingReset(false)}
                            className="rounded-md px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                resetSettings();
                                setConfirmingReset(false);
                            }}
                            className="rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                        >
                            Reset all
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setConfirmingReset(true)}
                        className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                        Reset
                    </button>
                )}
            </div>
        </div>
    );
}

export default Preferences;
