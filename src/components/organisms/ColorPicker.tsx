import { Icon } from '@/components/atoms/Icon';
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useStore } from '../../store';
import { toOpaqueHex } from '@/store/slices/colorSystemFixes';
import {
    PALETTE_BASICS,
    PALETTE_FAMILIES,
    PALETTE_SHADES,
    type PaletteSwatch,
} from '@/lib/palette';
import { Swatch, type SwatchState } from '../atoms/Swatch';
import { IconButton } from '../atoms/IconButton';
import { Tooltip } from '../molecules/Tooltip';
import { ColorPickerPopover } from './ColorPickerPopover';
import { normalizeHex } from '@/lib/colorMath';

/** The color the palette paints right now: a panel target, else the active fill / stroke / shadow. */
function useCurrentPaintColor(): string {
    const paintTarget = useStore((s) => s.paintTarget);
    const activePaint = useStore((s) => s.activePaint);
    const fill = useStore((s) => s.fill);
    const stroke = useStore((s) => s.stroke);
    const shadowColor = useStore((s) => s.shadowColor) as string | undefined;
    return (
        (paintTarget
            ? paintTarget.color
            : activePaint === 'stroke'
              ? stroke
              : activePaint === 'shadow'
                ? shadowColor
                : fill) ?? ''
    );
}

/** Swatch id -> #rrggbb (Tailwind 4 colors are oklch; rasterized once per mount). */
function useSwatchHex(): Map<string, string> {
    return useMemo(() => {
        const map = new Map<string, string>();
        const all = [...PALETTE_BASICS, ...PALETTE_FAMILIES.flatMap((f) => f.shades)];
        for (const sw of all) {
            const hex = toOpaqueHex(sw.css);
            if (hex) map.set(sw.id, hex);
        }
        return map;
    }, []);
}

/** Name + hex for each swatch, and a ring on the exact current color. */
function useSwatchState() {
    const current = toOpaqueHex(useCurrentPaintColor()) ?? '';
    const hexOf = useSwatchHex();
    const is = (sw: PaletteSwatch) => !!current && hexOf.get(sw.id) === current;
    return {
        label: (sw: PaletteSwatch) => {
            const hex = hexOf.get(sw.id);
            return hex ? `${sw.label} · ${hex}` : sw.label;
        },
        swatch: (sw: PaletteSwatch): SwatchState => (is(sw) ? 'active' : 'none'),
    };
}

/** Square 1-swatch box used by every item in the tools column (follows Settings > Icon size). */
const TOOL_BOX =
    'flex size-[var(--ui-swatch)] shrink-0 items-center justify-center border border-line-strong text-[10px] text-ink-muted hover:bg-surface-muted [&_svg]:size-[70%]';

/**
 * The palette's non-swatch tools: all shades, custom picker, hex, eyedropper. Rendered by
 * DockRoot in the column left of the palette, next to Remove stroke / Remove fill, so the
 * palette column holds only colors. What the palette paints is chosen with the footer
 * Fill/Stroke tiles or a panel's PaintTargetSwatch.
 */
export function PaletteTools() {
    const handleColorChange = useStore((s) => s.handleColorChange);
    const commitRecentColor = useStore((s) => s.commitRecentColor) as
        ((c: string) => void) | undefined;
    const current = useCurrentPaintColor();

    // one popover at a time; fixed position (the dock column scrolls and would clip it)
    const [open, setOpen] = useState<null | 'grid' | 'picker' | 'hex'>(null);
    const gridButton = useRef<HTMLButtonElement | null>(null);
    const pickerButton = useRef<HTMLButtonElement | null>(null);
    const hexButton = useRef<HTMLButtonElement | null>(null);
    const picked = useRef<string | null>(null);
    const toggle = (which: 'grid' | 'picker' | 'hex') => {
        if (open === 'picker' || open === 'hex') closePicker(false);
        setOpen((o) => (o === which ? null : which));
    };

    const currentHex = normalizeHex(current) ?? '#000000';
    const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

    // the picker applies live; the final color goes to Recent once, when it closes
    const closePicker = (refocus: boolean) => {
        const opener = open === 'hex' ? hexButton.current : pickerButton.current;
        if (picked.current) commitRecentColor?.(picked.current);
        picked.current = null;
        setOpen(null);
        if (refocus) opener?.focus();
    };

    const eyedrop = async () => {
        try {
            const res = await new (
                window as unknown as {
                    EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
                }
            ).EyeDropper().open();
            handleColorChange(res.sRGBHex);
            commitRecentColor?.(res.sRGBHex);
        } catch {
            /* cancelled */
        }
    };

    const pressed = (which: typeof open) =>
        open === which ? 'ring-2 ring-primary-500 ring-offset-1 ring-offset-surface' : '';

    return (
        <div className="relative flex flex-col items-center gap-[3px] border-b border-line pb-[3px]">
            <Tooltip content="All colors" position="left">
                <button
                    ref={gridButton}
                    type="button"
                    data-dock-box
                    aria-label="All colors"
                    aria-haspopup="dialog"
                    aria-expanded={open === 'grid'}
                    onClick={() => toggle('grid')}
                    className={`${TOOL_BOX} ${open === 'grid' ? 'bg-primary-50 text-primary-ink dark:bg-primary-500/20' : ''}`}
                >
                    <Icon name="table-cells-large" />
                </button>
            </Tooltip>

            <Tooltip content="Custom color" position="left">
                <button
                    ref={pickerButton}
                    type="button"
                    data-dock-box
                    aria-label="Custom color"
                    aria-haspopup="dialog"
                    aria-expanded={open === 'picker'}
                    onClick={() => toggle('picker')}
                    className={`${TOOL_BOX} ${pressed('picker')}`}
                    style={{
                        background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                    }}
                />
            </Tooltip>

            <Tooltip content="Hex color" position="left">
                <button
                    ref={hexButton}
                    type="button"
                    data-dock-box
                    aria-label="Enter a hex color"
                    aria-haspopup="dialog"
                    aria-expanded={open === 'hex'}
                    onClick={() => toggle('hex')}
                    className={`${TOOL_BOX} ${pressed('hex')}`}
                >
                    #
                </button>
            </Tooltip>

            {hasEyeDropper && (
                <Tooltip content="Pick from screen" position="left">
                    <button
                        type="button"
                        data-dock-box
                        aria-label="Pick a color from the screen"
                        onClick={eyedrop}
                        className={TOOL_BOX}
                    >
                        <Icon name="eye-dropper" />
                    </button>
                </Tooltip>
            )}

            {(open === 'picker' || open === 'hex') && (
                <ColorPickerPopover
                    anchor={open === 'hex' ? hexButton.current : pickerButton.current}
                    color={currentHex}
                    focusHex={open === 'hex'}
                    onChange={(hex) => {
                        picked.current = hex;
                        handleColorChange(hex);
                    }}
                    onClose={closePicker}
                />
            )}

            {open === 'grid' && (
                <PaletteGrid
                    anchor={gridButton.current}
                    onClose={(refocus) => {
                        setOpen(null);
                        if (refocus) gridButton.current?.focus();
                    }}
                />
            )}
        </div>
    );
}

/**
 * Every palette color at once: one row per family, shades light -> dark (plus White / Black).
 * Opens left of the dock from the "All colors" tool. Stays open while you try colors;
 * Escape, a click outside or the button closes it. Arrow keys move between swatches.
 */
function PaletteGrid({
    anchor,
    onClose,
}: {
    anchor: HTMLElement | null;
    onClose: (refocus: boolean) => void;
}) {
    const handleColorChange = useStore((s) => s.handleColorChange);
    const state = useSwatchState();
    const ref = useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

    const rows: { id: string; label: string; swatches: PaletteSwatch[] }[] = [
        { id: 'basic', label: 'Basic', swatches: PALETTE_BASICS },
        ...PALETTE_FAMILIES.map((f) => ({ id: f.id, label: f.label, swatches: f.shades })),
    ];

    // place left of the dock, top aligned with the button, kept inside the window.
    // Until placed it renders with opacity 0 (not visibility:hidden, which cannot take focus).
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el || !anchor) return;
        const a = anchor.getBoundingClientRect();
        const h = el.offsetHeight;
        setPos({
            top: Math.max(8, Math.min(a.top, window.innerHeight - h - 8)),
            right: window.innerWidth - a.left + 6,
        });
    }, [anchor]);

    // focus the current color (or the first swatch) when opened
    useEffect(() => {
        const el = ref.current;
        const target =
            el?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ??
            el?.querySelector<HTMLButtonElement>('[data-r]');
        target?.focus({ preventScroll: true });
    }, []);

    // close on a click outside (the toggle button handles its own click)
    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            const t = e.target as Node;
            if (ref.current?.contains(t) || anchor?.contains(t)) return;
            onClose(false);
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
    }, [anchor, onClose]);

    // Escape from anywhere while open (Safari does not focus a button on click, so the key may
    // never reach the dialog's own handler). Skipped when the dialog already handled it.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            e.preventDefault();
            onClose(!!ref.current?.contains(document.activeElement));
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        e.stopPropagation(); // arrows / Delete here must not reach canvas shortcuts
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose(true);
            return;
        }
        const step = {
            ArrowLeft: [0, -1],
            ArrowRight: [0, 1],
            ArrowUp: [-1, 0],
            ArrowDown: [1, 0],
        }[e.key];
        const from = (e.target as HTMLElement).closest<HTMLElement>('[data-r]');
        if (!step || !from) return;
        e.preventDefault();
        const r = Math.max(0, Math.min(rows.length - 1, Number(from.dataset.r) + step[0]));
        const c = Math.max(
            0,
            Math.min(rows[r].swatches.length - 1, Number(from.dataset.c) + step[1]),
        );
        ref.current?.querySelector<HTMLElement>(`[data-r="${r}"][data-c="${c}"]`)?.focus();
    };

    return (
        <div
            ref={ref}
            role="dialog"
            aria-label="All colors"
            onKeyDown={onKeyDown}
            className="fixed z-[9999] rounded-lg border border-line bg-surface p-3 shadow-lg"
            style={pos ?? { top: 8, right: 8, opacity: 0 }}
        >
            <div className="mb-2 flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-title">All colors</span>
                <IconButton
                    size="sm"
                    icon={<Icon name="xmark" />}
                    aria-label="Close all colors"
                    onClick={() => onClose(true)}
                />
            </div>
            <div
                className="grid items-center gap-[3px]"
                style={{
                    gridTemplateColumns: `auto repeat(${PALETTE_SHADES.length}, var(--ui-swatch))`,
                }}
            >
                <span />
                {PALETTE_SHADES.map((shade) => (
                    <span
                        key={shade}
                        aria-hidden
                        className="text-center text-[9px] leading-4 tabular-nums text-ink-subtle"
                    >
                        {shade}
                    </span>
                ))}
                {rows.map((row, r) => (
                    <div key={row.id} role="group" aria-label={row.label} className="contents">
                        <span aria-hidden className="pr-2 text-[11px] leading-none text-ink-muted">
                            {row.label}
                        </span>
                        {row.swatches.map((sw, c) => (
                            <Swatch
                                key={sw.id}
                                data-r={r}
                                data-c={c}
                                color={sw.css}
                                label={state.label(sw)}
                                state={state.swatch(sw)}
                                onClick={() => handleColorChange(sw.value)}
                            />
                        ))}
                        {/* basic row is short: keep the grid aligned */}
                        {Array.from(
                            { length: PALETTE_SHADES.length - row.swatches.length },
                            (_, i) => (
                                <span key={`pad-${i}`} aria-hidden />
                            ),
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Recently used colors (newest first, max 8, kept in memory only). Rendered by DockRoot at the
 * bottom of the left column.
 */
export function RecentColors() {
    const handleColorChange = useStore((s) => s.handleColorChange);
    const recentColors = useStore((s) => s.recentColors) as string[] | undefined;
    const commitRecentColor = useStore((s) => s.commitRecentColor) as
        ((c: string) => void) | undefined;

    if (!recentColors?.length) return null;

    return (
        <div
            className="mt-[3px] flex flex-col items-center gap-[3px] border-t border-line pt-[3px]"
            aria-label="Recent colors"
        >
            {recentColors.map((c) => (
                <button
                    key={c}
                    type="button"
                    data-dock-box
                    aria-label={`Use recent color ${c}`}
                    title={c}
                    onClick={() => {
                        handleColorChange(c);
                        commitRecentColor?.(c);
                    }}
                    className="size-[var(--ui-swatch)] shrink-0 border border-line-strong"
                    style={{ backgroundColor: c }}
                />
            ))}
        </div>
    );
}

/**
 * The palette strip: White, Black, then every shade of every family (each family dark -> light,
 * a small gap between families). "All colors" shows the same colors as a grid.
 */
export const ColorPicker = () => {
    const handleColorChange = useStore((s) => s.handleColorChange);
    const state = useSwatchState();
    const ref = useRef<HTMLDivElement | null>(null);
    const current = toOpaqueHex(useCurrentPaintColor()) ?? '';

    // the strip is long: center the current color when it changes and is off screen
    // (no jump when it is already fully visible, ring included)
    useEffect(() => {
        const el = ref.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
        const scroller = ref.current?.parentElement;
        if (!el || !scroller) return;
        const a = el.getBoundingClientRect();
        const v = scroller.getBoundingClientRect();
        const RING = 4;
        if (a.top - RING >= v.top && a.bottom + RING <= v.bottom) return;
        el.scrollIntoView?.({ block: 'center' });
    }, [current]);

    return (
        <div
            ref={ref}
            data-testid="color-palette"
            role="group"
            aria-label="Color palette"
            className="flex flex-col items-center gap-[3px] bg-surface"
        >
            {PALETTE_BASICS.map((sw) => (
                <Swatch
                    key={sw.id}
                    color={sw.css}
                    label={state.label(sw)}
                    state={state.swatch(sw)}
                    onClick={() => handleColorChange(sw.value)}
                />
            ))}
            {PALETTE_FAMILIES.map((f) => (
                <div
                    key={f.id}
                    role="group"
                    aria-label={f.label}
                    className="mt-[3px] flex flex-col items-center gap-[3px] border-t border-line pt-[6px]"
                >
                    {[...f.shades].reverse().map((sw) => (
                        <Swatch
                            key={sw.id}
                            color={sw.css}
                            label={state.label(sw)}
                            state={state.swatch(sw)}
                            onClick={() => handleColorChange(sw.value)}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};
