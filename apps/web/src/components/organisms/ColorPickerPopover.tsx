import { placeBeside, sizeOf } from '@/lib/placeBeside';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@store';
import { normalizeHex } from '@/lib/colorMath';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { Swatch } from '../atoms/Swatch';
import { ColorFormatFields } from '../molecules/ColorFormatFields';
import { ColorHarmonies } from '../molecules/ColorHarmonies';
import { SegmentedControl } from '../molecules/SegmentedControl';
import { HsvSquare } from '../molecules/color/HsvSquare';
import { HsvWheel } from '../molecules/color/HsvWheel';
import { useHsvColor } from '../molecules/color/useHsvColor';
import { DEFAULT_WHEEL_HARMONY, type WheelHarmony } from '../molecules/color/wheelHarmony';

type Props = {
    /** Element the popover opens next to (left of it); null = top right corner. */
    anchor: HTMLElement | null;
    /** Current color (#rrggbb). Outside changes (a palette click) show up while open. */
    color: string;
    /** Called with #rrggbb for every change (drags too: the history debounce makes one undo step). */
    onChange: (hex: string) => void;
    /** `refocus` = return focus to the opener (keyboard close). */
    onClose: (refocus: boolean) => void;
};

const FALLBACK = '#000000';

/**
 * In-app color picker (replaces the browser's own dialog, which looked different on every OS):
 * saturation / brightness square, hue slider, eyedropper, original vs new, hex + the color as
 * RGB / HSL / HSB / CMYK (copyable), harmonies, recent colors. Keeps its own HSV so the hue does
 * not jump when a color turns gray.
 */
export function ColorPickerPopover({ anchor, color, onChange, onClose }: Props) {
    const recentColors = useStore((s) => s.recentColors) as string[] | undefined;
    const placeLater = useRef<(() => void) | null>(null);
    const { hsv, hex, preview, emit, emitHex, dragging, rootProps } = useHsvColor(
        color,
        onChange,
        FALLBACK,
        () => {
            const later = placeLater.current;
            placeLater.current = null;
            later?.();
        },
    );
    const [original] = useState(() => normalizeHex(color) ?? FALLBACK);
    const [view, setView] = useState<'square' | 'wheel'>('square');
    const [harmony, setHarmony] = useState<WheelHarmony>(DEFAULT_WHEEL_HARMONY);

    const ref = useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    // beside the anchor (left of the dock; above it on a phone bar). Until placed: opacity 0 (not
    // visibility:hidden, which cannot take focus). When its height changes (harmony rows, Square / Wheel)
    // it keeps its place and only moves up if it would now leave the window; never during a drag (the
    // control would slide under the pointer and the drag would chase it: the flicker).
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (!anchor) return setPos({ top: 8, left: 8 });
        const place = () => setPos(placeBeside(anchor.getBoundingClientRect(), sizeOf(el)));
        const fit = () => {
            if (dragging.current) {
                placeLater.current = fit;
                return;
            }
            setPos((cur) => {
                if (!cur) return placeBeside(anchor.getBoundingClientRect(), sizeOf(el));
                const top = Math.max(
                    8,
                    Math.min(cur.top, window.innerHeight - el.offsetHeight - 8),
                );
                return top === cur.top ? cur : { ...cur, top };
            });
        };
        place();
        const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
        ro?.observe(el);
        window.addEventListener('resize', place);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', place);
        };
    }, [anchor, dragging]);

    useEffect(() => {
        ref.current?.querySelector<HTMLElement>('[role="slider"]')?.focus();
    }, []);
    // close on a click outside (the opener handles its own click)
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

    const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;
    const eyedrop = async () => {
        try {
            const res = await new (
                window as unknown as {
                    EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> };
                }
            ).EyeDropper().open();
            const n = normalizeHex(res.sRGBHex);
            if (n) emitHex(n);
        } catch {
            /* cancelled */
        }
    };

    // portalled: inside the dock, the editor header / footer bars would cover it
    return createPortal(
        <div
            ref={ref}
            role="dialog"
            aria-label="Custom color"
            {...rootProps}
            onKeyDown={(e) => {
                e.stopPropagation(); // Delete / arrows / letters here must not reach the canvas
                if (e.key === 'Escape' && !e.defaultPrevented) {
                    e.preventDefault();
                    onClose(true);
                }
            }}
            className="fixed z-[9999] max-h-[calc(100vh-16px)] w-80 overflow-y-auto rounded-lg border border-line bg-surface p-3 shadow-lg [scrollbar-gutter:stable]"
            style={pos ?? { top: 8, left: 8, opacity: 0 }}
        >
            <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-title">Custom color</span>
                <IconButton
                    size="sm"
                    icon={<Icon name="xmark" />}
                    aria-label="Close custom color"
                    onClick={() => onClose(true)}
                />
            </div>

            <SegmentedControl<'square' | 'wheel'>
                aria-label="Color picker view"
                size="sm"
                className="mb-2"
                value={view}
                onChange={setView}
                options={[
                    { value: 'square', label: 'Square', icon: 'table-cells-large' },
                    { value: 'wheel', label: 'Wheel', icon: 'color-wheel' },
                ]}
            />
            {view === 'wheel' ? (
                <HsvWheel
                    hsv={hsv}
                    hex={hex}
                    onPreview={preview}
                    onCommit={emit}
                    onPickHex={emitHex}
                    harmony={harmony}
                    onHarmony={setHarmony}
                />
            ) : (
                <HsvSquare
                    hsv={hsv}
                    hex={hex}
                    onPreview={preview}
                    onCommit={emit}
                    leading={
                        hasEyeDropper && (
                            <IconButton
                                size="sm"
                                icon={<Icon name="eye-dropper" />}
                                aria-label="Pick a color from the screen"
                                title="Pick from screen"
                                onClick={eyedrop}
                            />
                        )
                    }
                />
            )}

            {/* original -> new: small labelled swatches; Original goes back */}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-muted">
                <button
                    type="button"
                    aria-label={`Original color ${original}`}
                    title="Go back to the original color"
                    onClick={() => emitHex(original)}
                    className="flex items-center gap-1.5 rounded-md px-1 py-0.5 outline-none hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-primary-400"
                >
                    <span
                        aria-hidden
                        className="size-5 rounded border border-line-strong"
                        style={{ backgroundColor: original }}
                    />
                    Original
                </button>
                <Icon name="chevron-right" aria-hidden />
                <span className="flex items-center gap-1.5 px-1 text-ink">
                    <span
                        aria-hidden
                        className="size-5 rounded border border-line-strong"
                        style={{ backgroundColor: hex }}
                    />
                    New
                </span>
            </div>

            <ColorFormatFields hex={hex} hsv={hsv} onHex={emitHex} onHsv={emit} />
            <ColorHarmonies color={hex} onPick={emitHex} />

            {!!recentColors?.length && (
                <div className="mt-3 border-t border-line pt-2">
                    <div className="mb-1.5 text-[11px] text-ink-muted">Recent</div>
                    <div className="flex flex-wrap gap-1">
                        {recentColors.map((c) => (
                            <Swatch
                                key={c}
                                color={c}
                                label={`Recent color ${c}`}
                                className="size-5"
                                onClick={() => {
                                    const n = normalizeHex(c);
                                    if (n) emitHex(n);
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>,
        document.body,
    );
}
