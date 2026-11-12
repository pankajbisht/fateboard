import { useHarmonyBase } from '@hooks/useHarmonyBase';
import { HARMONIES, harmonyColors, hasHue } from '@/lib/colorHarmony';
import { Swatch } from '../atoms/Swatch';

type Props = {
    /** Current color, #rrggbb. */
    color: string;
    /** Apply a harmony color. */
    onPick: (hex: string) => void;
};

/**
 * The five color harmonies of a base color, one row each; a click applies that color.
 * The base follows the picker, except for a pick made here: then the rows stay put, so the other
 * colors of the scheme (and the base) are still one click away.
 */
export function ColorHarmonies({ color, onPick }: Props) {
    const [base, markPicked] = useHarmonyBase(color);
    const gray = !base || !hasHue(base);
    const rows = gray ? HARMONIES.filter((h) => h.id === 'monochromatic') : HARMONIES;

    return (
        <div role="group" aria-label="Color harmonies" className="mt-3 border-t border-line pt-2">
            <div className="mb-1.5 text-[11px] text-ink-muted">Harmonies</div>
            {gray && (
                <p className="mb-1.5 text-[11px] text-ink-muted">
                    Grays have no hue: pick a color to see the other harmonies.
                </p>
            )}
            <div className="flex flex-col gap-1.5">
                {rows.map((h) => (
                    <div key={h.id} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1 leading-tight">
                            <div className="truncate text-[11px] text-ink">{h.label}</div>
                            <div className="truncate text-[10px] text-ink-muted">{h.hint}</div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                            {harmonyColors(base ?? '', h.id).map((c, i) => (
                                <Swatch
                                    key={`${c}-${i}`}
                                    color={c}
                                    label={`${h.label} color ${c}`}
                                    state={c === color ? 'active' : 'none'}
                                    className="size-5 rounded-sm"
                                    onClick={() => {
                                        markPicked(c);
                                        onPick(c);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ColorHarmonies;
