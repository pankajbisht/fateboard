import { useEffect, useRef, useState } from 'react';
import { useHarmonyBase } from '@hooks/useHarmonyBase';
import {
    HARMONIES,
    harmonyColors,
    harmonyGradient,
    hasHue,
    type HarmonyId,
} from '@/lib/colorHarmony';
import { formatColor, hexToRgb, normalizeHex } from '@/lib/colorMath';
import type { FillSnapshot, GradientFill } from '@/lib/fillStyle';
import { Button } from '../atoms/Button';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';

type Props = {
    /** The selection's fill (the base is its solid color, or the first gradient stop). */
    fill: FillSnapshot;
    /** Fill the selection with one color. */
    onSolid: (hex: string) => void;
    /** Fill the selection with a gradient. */
    onGradient: (gradient: GradientFill) => void;
};

const COPIED_MS = 1200;

/** Black or white, whichever reads better on `hex` (the check mark on the current swatch). */
const inkOn = (hex: string) => {
    const { r, g, b } = hexToRgb(hex) ?? { r: 0, g: 0, b: 0 };
    return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#000000' : '#ffffff';
};

/**
 * Fill & Shadow "Color harmony": the five schemes of the fill color, one card each (name, hint,
 * swatch strip with hex values). A swatch fills the selection; Gradient makes the scheme the fill
 * gradient; copy puts the hex values on the clipboard. Grays show Monochromatic only.
 */
export function FillHarmony({ fill, onSolid, onGradient }: Props) {
    const current = normalizeHex(fill.color ?? fill.gradient?.stops[0]?.color ?? '');
    const [base, markPicked] = useHarmonyBase(fill.kind === 'none' ? null : current);

    const [copied, setCopied] = useState<HarmonyId | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );
    const copy = async (id: HarmonyId, colors: string[]) => {
        try {
            await navigator.clipboard.writeText(
                colors.map((c) => formatColor(c, 'hex')).join(', '),
            );
            setCopied(id);
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(null), COPIED_MS);
        } catch (err) {
            console.error('[FillHarmony] copy failed', err);
        }
    };

    if (!base) {
        return (
            <p className="text-caption text-ink-muted">
                Give it a fill color to see its harmonies.
            </p>
        );
    }
    const gray = !hasHue(base);
    const rows = gray ? HARMONIES.filter((h) => h.id === 'monochromatic') : HARMONIES;

    return (
        <div role="group" aria-label="Color harmony" className="flex flex-col gap-2">
            {gray && (
                <p className="text-caption text-ink-muted">
                    Grays have no hue: give it a color to see the other harmonies.
                </p>
            )}
            {rows.map((h) => {
                const colors = harmonyColors(base, h.id);
                return (
                    <div key={h.id} className="rounded-md border border-line p-2">
                        <div className="flex items-start gap-1">
                            <div className="min-w-0 flex-1 leading-tight">
                                <div className="truncate text-xs font-medium text-ink">
                                    {h.label}
                                </div>
                                <div className="truncate text-caption text-ink-muted">{h.hint}</div>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                aria-label={`Gradient from ${h.label}`}
                                title={`Fill with a gradient of the ${h.label} colors`}
                                onClick={() => {
                                    markPicked(colors[0]);
                                    onGradient(harmonyGradient(colors, fill.gradient));
                                }}
                            >
                                Gradient
                            </Button>
                            <IconButton
                                size="sm"
                                icon={<Icon name={copied === h.id ? 'check' : 'copy'} />}
                                aria-label={`Copy ${h.label} colors`}
                                title={copied === h.id ? 'Copied' : 'Copy the hex values'}
                                onClick={() => copy(h.id, colors)}
                            />
                        </div>
                        <div className="mt-1.5 flex overflow-hidden rounded-md border border-line-strong">
                            {colors.map((c, i) => {
                                const active = c === current && fill.kind === 'solid';
                                return (
                                    <button
                                        key={`${c}-${i}`}
                                        type="button"
                                        aria-label={`${h.label} color ${c}`}
                                        title={`Fill with ${formatColor(c, 'hex')}`}
                                        aria-pressed={active}
                                        onClick={() => {
                                            markPicked(c);
                                            onSolid(c);
                                        }}
                                        className="flex h-8 flex-1 cursor-pointer items-center justify-center hover:ring-2 hover:ring-inset hover:ring-surface/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400"
                                        style={{ backgroundColor: c, color: inkOn(c) }}
                                    >
                                        {active && <Icon name="check" />}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-0.5 flex">
                            {colors.map((c, i) => (
                                <span
                                    key={`${c}-${i}`}
                                    className="flex-1 truncate text-center font-mono text-[10px] uppercase text-ink-muted"
                                >
                                    {c.slice(1)}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default FillHarmony;
