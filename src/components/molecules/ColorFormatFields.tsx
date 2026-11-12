import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import {
    cmykToRgb,
    formatColor,
    hexToRgb,
    hslToHsv,
    hsvToHsl,
    normalizeHex,
    rgbToCmyk,
    rgbToHex,
    type ColorFormat,
    type HSV,
} from '@/lib/colorMath';
import { Icon } from '../atoms/Icon';
import { NumberField } from '../atoms/NumberField';
import { SegmentedControl } from './SegmentedControl';

type Props = {
    /** Current color, #rrggbb. */
    hex: string;
    /** The picker's own exact HSV (HSL / HSB fields + copy text; keeps typed values and gray hues). */
    hsv: HSV;
    /** Apply a color typed as hex / RGB / CMYK (the picker keeps its hue on grays). */
    onHex: (hex: string) => void;
    /** Apply a color typed as HSL / HSB (exact, the hue survives on grays). */
    onHsv: (hsv: HSV) => void;
};

type Channel = { key: string; letter: string; name: string; max: number; value: number };

const FORMAT_LABEL: Record<ColorFormat, string> = {
    hex: 'HEX',
    rgb: 'RGB',
    hsl: 'HSL',
    hsb: 'HSB',
    cmyk: 'CMYK',
};
const COPIED_MS = 1200;

const fieldBox =
    'flex h-7 min-w-0 items-center gap-1 rounded-md border border-line-strong bg-surface px-2 text-xs transition-colors hover:border-ink-subtle focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-400/30';

/** The channels of `format` for the color, with how to apply an edited one. */
function channelsOf(
    format: ColorFormat,
    hex: string,
    hsv: HSV,
): { list: Channel[]; apply: (key: string, v: number) => { hex: string } | { hsv: HSV } } {
    const rgb = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
    const ch = (key: string, letter: string, name: string, max: number, value: number) => ({
        key,
        letter,
        name,
        max,
        value: Math.round(value),
    });
    if (format === 'rgb') {
        return {
            list: [
                ch('r', 'R', 'Red', 255, rgb.r),
                ch('g', 'G', 'Green', 255, rgb.g),
                ch('b', 'B', 'Blue', 255, rgb.b),
            ],
            apply: (k, v) => ({ hex: rgbToHex({ ...rgb, [k]: v }) }),
        };
    }
    if (format === 'hsl') {
        const hsl = hsvToHsl(hsv);
        return {
            list: [
                ch('h', 'H', 'Hue', 360, hsl.h),
                ch('s', 'S', 'Saturation', 100, hsl.s),
                ch('l', 'L', 'Lightness', 100, hsl.l),
            ],
            apply: (k, v) => ({ hsv: hslToHsv({ ...hsl, [k]: v }) }),
        };
    }
    if (format === 'hsb') {
        return {
            list: [
                ch('h', 'H', 'Hue', 360, hsv.h),
                ch('s', 'S', 'Saturation', 100, hsv.s),
                ch('v', 'B', 'Brightness', 100, hsv.v),
            ],
            apply: (k, v) => ({ hsv: { ...hsv, [k]: v } }),
        };
    }
    if (format === 'cmyk') {
        const cmyk = rgbToCmyk(rgb);
        return {
            list: [
                ch('c', 'C', 'Cyan', 100, cmyk.c),
                ch('m', 'M', 'Magenta', 100, cmyk.m),
                ch('y', 'Y', 'Yellow', 100, cmyk.y),
                ch('k', 'K', 'Black', 100, cmyk.k),
            ],
            apply: (k, v) => ({ hex: rgbToHex(cmykToRgb({ ...cmyk, [k]: v })) }),
        };
    }
    return { list: [], apply: () => ({ hex }) };
}

/**
 * Hex field + the color in one of HEX / RGB / HSL / HSB / CMYK (switch, editable channels) +
 * a copy button with the color written in that format.
 */
export function ColorFormatFields({ hex, hsv, onHex, onHsv }: Props) {
    const [format, setFormat] = useState<ColorFormat>('rgb');
    const { list, apply } = channelsOf(format, hex, hsv);
    const text = formatColor(hex, format, hsv);

    // hex draft: applied on Enter / blur, Escape or invalid input reverts
    const [hexDraft, setHexDraft] = useState<string | null>(null);
    const commitHex = () => {
        if (hexDraft === null) return;
        const n = normalizeHex(hexDraft);
        setHexDraft(null);
        if (n) onHex(n);
    };

    const [copied, setCopied] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), COPIED_MS);
        } catch (err) {
            console.error('[ColorFormatFields] copy failed', err);
        }
    };

    return (
        <div className="mt-3 flex flex-col gap-1.5">
            <SegmentedControl
                size="sm"
                aria-label="Color format"
                value={format}
                onChange={setFormat}
                options={(Object.keys(FORMAT_LABEL) as ColorFormat[]).map((f) => ({
                    value: f,
                    label: FORMAT_LABEL[f],
                }))}
                className="[&_button]:px-1"
            />
            <div
                className="grid gap-1.5"
                style={{
                    gridTemplateColumns: list.length
                        ? `1fr repeat(${list.length}, ${list.length > 3 ? '2.25rem' : '2.5rem'})`
                        : '1fr',
                }}
            >
                <label className={fieldBox}>
                    <span aria-hidden className="select-none text-ink-subtle">
                        #
                    </span>
                    <input
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
                {list.map((c) => (
                    <NumberField
                        key={`${format}-${c.key}`}
                        aria-label={c.name}
                        title={c.name}
                        value={c.value}
                        min={0}
                        max={c.max}
                        precision={0}
                        stepper={false}
                        onCommit={(v) => {
                            const out = apply(c.key, v);
                            if ('hsv' in out) onHsv(out.hsv);
                            else onHex(out.hex);
                        }}
                        className="[&_input]:text-center"
                    />
                ))}
                {list.map((c, i) => (
                    <span
                        key={c.key}
                        aria-hidden
                        className={clsx(
                            'text-center text-[10px] text-ink-subtle',
                            i === 0 && 'col-start-2',
                        )}
                    >
                        {c.letter}
                    </span>
                ))}
            </div>
            <button
                type="button"
                aria-label={`Copy ${text}`}
                title={`Copy ${text}`}
                onClick={copy}
                className="flex h-7 min-w-0 items-center gap-2 rounded-md border border-line bg-surface-strong px-2 text-left text-xs text-ink transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            >
                <span className="min-w-0 flex-1 truncate font-mono">{text}</span>
                <span aria-live="polite" className="shrink-0 text-[11px] text-ink-muted">
                    {copied ? 'Copied' : ''}
                </span>
                <Icon name={copied ? 'check' : 'copy'} className="shrink-0 text-ink-muted" />
            </button>
        </div>
    );
}

export default ColorFormatFields;
