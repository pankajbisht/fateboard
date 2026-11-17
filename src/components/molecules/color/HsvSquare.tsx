import type { ReactNode } from 'react';
import { hsvToRgb, rgbToHex, type HSV } from '@/lib/colorMath';
import { hueFromKey, svFromKey } from '@/lib/colorWheel';
import { SLIDER_FOCUS, THUMB, useHsvDrag } from './hsvDrag';

type Props = {
    hsv: HSV;
    hex: string;
    /** Local preview while dragging. */
    onPreview: (next: HSV) => void;
    /** The colour to apply (also used for keyboard steps). */
    onCommit: (next: HSV) => void;
    /** Shown left of the hue bar (the eyedropper). */
    leading?: ReactNode;
};

/** Custom colour "Square" view: saturation (x) / brightness (y) square and the hue bar. */
export function HsvSquare({ hsv, hex, onPreview, onCommit, leading }: Props) {
    const drag = useHsvDrag(onPreview, onCommit);
    const pureHue = rgbToHex(hsvToRgb({ h: hsv.h, s: 100, v: 100 }));

    return (
        <>
            <div
                role="slider"
                tabIndex={0}
                aria-label="Saturation and brightness"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(hsv.s)}
                aria-valuetext={`Saturation ${Math.round(hsv.s)}%, brightness ${Math.round(hsv.v)}%`}
                onKeyDown={(e) => {
                    const next = svFromKey(hsv, e.key, e.shiftKey);
                    if (!next) return;
                    e.preventDefault();
                    onCommit(next);
                }}
                {...drag(({ x, y }) => ({ ...hsv, s: x * 100, v: (1 - y) * 100 }))}
                className={`relative h-36 cursor-crosshair rounded-md ${SLIDER_FOCUS}`}
                style={{
                    background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), ${pureHue}`,
                }}
            >
                <span
                    aria-hidden
                    className={THUMB}
                    style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: hex }}
                />
            </div>

            <div className="mt-3 flex items-center gap-2">
                {leading}
                <div
                    role="slider"
                    tabIndex={0}
                    aria-label="Hue"
                    aria-valuemin={0}
                    aria-valuemax={360}
                    aria-valuenow={Math.round(hsv.h)}
                    aria-valuetext={`${Math.round(hsv.h)}°`}
                    onKeyDown={(e) => {
                        const next = hueFromKey(hsv, e.key, e.shiftKey);
                        if (!next) return;
                        e.preventDefault();
                        onCommit(next);
                    }}
                    {...drag(({ x }) => ({ ...hsv, h: x * 360 }))}
                    className={`relative h-3 flex-1 cursor-pointer rounded-full ${SLIDER_FOCUS}`}
                    style={{
                        background:
                            'linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)',
                    }}
                >
                    <span
                        aria-hidden
                        className={`${THUMB} top-1/2`}
                        style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: pureHue }}
                    />
                </div>
            </div>
        </>
    );
}
