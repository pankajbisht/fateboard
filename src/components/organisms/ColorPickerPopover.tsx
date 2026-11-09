import clsx from 'clsx';
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { useStore } from '@store';
import {
    hexToRgb,
    hsvToRgb,
    normalizeHex,
    rgbToHex,
    rgbToHsv,
    type HSV,
    type RGB,
} from '@/lib/colorMath';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { NumberField } from '../atoms/NumberField';
import { Swatch } from '../atoms/Swatch';

type Props = {
    /** Element the popover opens next to (left of it); null = top right corner. */
    anchor: HTMLElement | null;
    /** Current color (#rrggbb). Outside changes (a palette click) show up while open. */
    color: string;
    /** Called with #rrggbb for every change (drags too: the history debounce makes one undo step). */
    onChange: (hex: string) => void;
    /** `refocus` = return focus to the opener (keyboard close). */
    onClose: (refocus: boolean) => void;
    /** Focus the hex field on open (the "#" tool). */
    focusHex?: boolean;
};

const FALLBACK = '#000000';
const toHsv = (hex: string): HSV => rgbToHsv(hexToRgb(hex) ?? { r: 0, g: 0, b: 0 });
const hsvHex = (hsv: HSV) => rgbToHex(hsvToRgb(hsv));
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * In-app color picker (replaces the browser's own dialog, which looked different on every OS):
 * saturation / brightness square, hue slider, eyedropper, original vs new, hex + R G B, recent
 * colors. Keeps its own HSV so the hue does not jump when a color turns gray.
 */
export function ColorPickerPopover({ anchor, color, onChange, onClose, focusHex }: Props) {
    const recentColors = useStore((s) => s.recentColors) as string[] | undefined;
    const start = normalizeHex(color) ?? FALLBACK;
    const [original] = useState(start);
    const [hsv, setHsv] = useState<HSV>(() => toHsv(start));
    const hex = hsvHex(hsv);
    const rgb = hsvToRgb(hsv);

    const ref = useRef<HTMLDivElement | null>(null);
    const hexRef = useRef<HTMLInputElement | null>(null);
    const lastSent = useRef(start);
    const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

    const emit = (next: HSV) => {
        setHsv(next);
        const out = hsvHex(next);
        if (out !== lastSent.current) {
            lastSent.current = out;
            onChange(out);
        }
    };
    const emitHex = (h: string) => {
        const next = toHsv(h);
        // gray / black / white have no hue: keep the current one
        emit(next.s === 0 || next.v === 0 ? { ...next, h: hsv.h } : next);
    };

    // outside change (palette click while open): follow it, unless it is our own echo
    useEffect(() => {
        const n = normalizeHex(color);
        if (!n || n === lastSent.current) return;
        lastSent.current = n;
        setHsv((cur) => {
            const next = toHsv(n);
            return next.s === 0 || next.v === 0 ? { ...next, h: cur.h } : next;
        });
    }, [color]);

    // place left of the anchor, kept inside the window.
    // Until placed it renders with opacity 0 (not visibility:hidden, which cannot take focus).
    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (!anchor) return setPos({ top: 8, right: 8 });
        const a = anchor.getBoundingClientRect();
        setPos({
            top: clamp(a.top, 8, Math.max(8, window.innerHeight - el.offsetHeight - 8)),
            right: window.innerWidth - a.left + 6,
        });
    }, [anchor]);

    useEffect(() => {
        if (focusHex) {
            hexRef.current?.focus();
            hexRef.current?.select();
        } else ref.current?.querySelector<HTMLElement>('[role="slider"]')?.focus();
    }, [focusHex]);

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

    // drag on the square / hue bar: pointer capture, one update per animation frame
    const frame = useRef<number | null>(null);
    const dragTo = (e: ReactPointerEvent<HTMLDivElement>, apply: (x: number, y: number) => HSV) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = clamp((e.clientX - r.left) / (r.width || 1), 0, 1);
        const y = clamp((e.clientY - r.top) / (r.height || 1), 0, 1);
        const next = apply(x, y);
        setHsv(next);
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
            frame.current = null;
            emit(next);
        });
    };
    useEffect(
        () => () => {
            if (frame.current !== null) cancelAnimationFrame(frame.current);
        },
        [],
    );
    const dragHandlers = (apply: (x: number, y: number) => HSV) => ({
        onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            e.currentTarget.focus();
            dragTo(e, apply);
        },
        onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
            if (e.currentTarget.hasPointerCapture?.(e.pointerId)) dragTo(e, apply);
        },
    });

    const onSvKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        const d = e.shiftKey ? 10 : 1;
        const move: Record<string, [number, number]> = {
            ArrowLeft: [-d, 0],
            ArrowRight: [d, 0],
            ArrowUp: [0, d],
            ArrowDown: [0, -d],
        };
        if (!move[e.key]) return;
        e.preventDefault();
        const [ds, dv] = move[e.key];
        emit({ ...hsv, s: clamp(hsv.s + ds, 0, 100), v: clamp(hsv.v + dv, 0, 100) });
    };

    const onHueKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        const d = e.shiftKey ? 10 : 1;
        const to: Record<string, number> = {
            ArrowLeft: hsv.h - d,
            ArrowDown: hsv.h - d,
            ArrowRight: hsv.h + d,
            ArrowUp: hsv.h + d,
            Home: 0,
            End: 360,
        };
        if (!(e.key in to)) return;
        e.preventDefault();
        emit({ ...hsv, h: clamp(to[e.key], 0, 360) });
    };

    // hex draft: applied on Enter / blur, Escape or invalid input reverts
    const [hexDraft, setHexDraft] = useState<string | null>(null);
    const commitHex = () => {
        if (hexDraft === null) return;
        const n = normalizeHex(hexDraft);
        setHexDraft(null);
        if (n) emitHex(n);
    };

    const setChannel = (key: keyof RGB) => (v: number) => emitHex(rgbToHex({ ...rgb, [key]: v }));

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

    const pureHue = rgbToHex(hsvToRgb({ h: hsv.h, s: 100, v: 100 }));
    const fieldBox =
        'flex h-7 min-w-0 items-center gap-1 rounded-md border border-line-strong bg-surface px-2 text-xs transition-colors hover:border-ink-subtle focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-400/30';

    return (
        <div
            ref={ref}
            role="dialog"
            aria-label="Custom color"
            onKeyDown={(e) => {
                e.stopPropagation(); // Delete / arrows / letters here must not reach the canvas
                if (e.key === 'Escape' && !e.defaultPrevented) {
                    e.preventDefault();
                    onClose(true);
                }
            }}
            className="fixed z-[9999] w-64 rounded-lg border border-line bg-surface p-3 shadow-lg"
            style={pos ?? { top: 8, right: 8, opacity: 0 }}
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

            {/* saturation (x) / brightness (y) */}
            <div
                role="slider"
                tabIndex={0}
                aria-label="Saturation and brightness"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(hsv.s)}
                aria-valuetext={`Saturation ${Math.round(hsv.s)}%, brightness ${Math.round(hsv.v)}%`}
                onKeyDown={onSvKey}
                {...dragHandlers((x, y) => ({ ...hsv, s: x * 100, v: (1 - y) * 100 }))}
                className="relative h-36 cursor-crosshair touch-none select-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                style={{
                    background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${pureHue}`,
                }}
            >
                <span
                    aria-hidden
                    className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_1px_3px_rgba(0,0,0,0.4)]"
                    style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: hex }}
                />
            </div>

            <div className="mt-3 flex items-center gap-2">
                {hasEyeDropper && (
                    <IconButton
                        size="sm"
                        icon={<Icon name="eye-dropper" />}
                        aria-label="Pick a color from the screen"
                        title="Pick from screen"
                        onClick={eyedrop}
                    />
                )}
                {/* hue */}
                <div
                    role="slider"
                    tabIndex={0}
                    aria-label="Hue"
                    aria-valuemin={0}
                    aria-valuemax={360}
                    aria-valuenow={Math.round(hsv.h)}
                    aria-valuetext={`${Math.round(hsv.h)}°`}
                    onKeyDown={onHueKey}
                    {...dragHandlers((x) => ({ ...hsv, h: x * 360 }))}
                    className="relative h-3 flex-1 cursor-pointer touch-none select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                    style={{
                        background:
                            'linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)',
                    }}
                >
                    <span
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45),0_1px_3px_rgba(0,0,0,0.4)]"
                        style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: pureHue }}
                    />
                </div>
            </div>

            {/* original | new */}
            <div className="mt-3 flex h-7 overflow-hidden rounded-md border border-line-strong">
                <button
                    type="button"
                    aria-label={`Original color ${original}`}
                    title="Original (click to go back)"
                    onClick={() => emitHex(original)}
                    className="flex-1 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400"
                    style={{ backgroundColor: original }}
                />
                <span aria-hidden title="New" className="flex-1" style={{ backgroundColor: hex }} />
            </div>

            {/* hex + R G B */}
            <div className="mt-3 grid grid-cols-[1fr_repeat(3,2.5rem)] gap-1.5">
                <label className={fieldBox}>
                    <span aria-hidden className="select-none text-ink-subtle">
                        #
                    </span>
                    <input
                        ref={hexRef}
                        aria-label="Hex"
                        spellCheck={false}
                        maxLength={7}
                        value={hexDraft ?? hex.slice(1)}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => setHexDraft(e.target.value.replace(/^#/, ''))}
                        onBlur={commitHex}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                commitHex();
                                e.currentTarget.select();
                            } else if (e.key === 'Escape' && hexDraft !== null) {
                                e.preventDefault(); // first Escape reverts the field, the next closes
                                setHexDraft(null);
                            }
                        }}
                        className="w-full min-w-0 bg-transparent font-mono uppercase text-ink outline-none"
                    />
                </label>
                {(
                    [
                        ['r', 'Red'],
                        ['g', 'Green'],
                        ['b', 'Blue'],
                    ] as const
                ).map(([key, name]) => (
                    <NumberField
                        key={key}
                        aria-label={name}
                        title={name}
                        value={rgb[key]}
                        min={0}
                        max={255}
                        precision={0}
                        stepper={false}
                        onCommit={setChannel(key)}
                        className="[&_input]:text-center"
                    />
                ))}
                {(['R', 'G', 'B'] as const).map((c, i) => (
                    <span
                        key={c}
                        aria-hidden
                        className={clsx(
                            'text-center text-[10px] text-ink-subtle',
                            i === 0 && 'col-start-2',
                        )}
                    >
                        {c}
                    </span>
                ))}
            </div>

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
        </div>
    );
}

export default ColorPickerPopover;
