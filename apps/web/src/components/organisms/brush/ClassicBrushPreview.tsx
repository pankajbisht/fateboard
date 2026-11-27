import { useStore } from '@store';
import {
    clamp,
    getEngine,
    isStrokeBrush,
    isVariableBrush,
    mixWithWhite,
    toHex6,
    toRgba,
    type LineCap,
} from '@store/brushConfig';

/** Live preview of a classic brush with its current settings (an approximation of the real engine). */
export function ClassicBrushPreview() {
    const brush = useStore((s) => s.brush);
    const width = useStore((s) => s.width);
    const color = toHex6(useStore((s) => s.color));
    const opacity = useStore((s) => s.brushOpacity);
    const lineCap = useStore((s) => s.lineCap);
    const lineJoin = useStore((s) => s.lineJoin);
    const lineStyle = useStore((s) => s.lineStyle);
    const blend = useStore((s) => s.blend);
    const shadowBlur = useStore((s) => s.shadowBlur);
    const shadowOffsetX = useStore((s) => s.shadowOffsetX);
    const shadowOffsetY = useStore((s) => s.shadowOffsetY);
    const shadowColor = toHex6(useStore((s) => s.brushShadowColor));
    const shadowOpacity = useStore((s) => s.shadowOpacity);
    const shadowMatchColor = useStore((s) => s.shadowMatchColor);
    const fillEnabled = useStore((s) => s.fillEnabled);
    const fillColor = toHex6(useStore((s) => s.fillColor));
    const fillOpacity = useStore((s) => s.fillOpacity);

    const engine = getEngine(brush);
    const strokeBrush = isStrokeBrush(brush);
    const shadowActive = shadowBlur > 0 || shadowOffsetX !== 0 || shadowOffsetY !== 0;
    const pw = clamp(width, 1, 36);
    const previewColor = engine === 'neon' ? mixWithWhite(color, 0.7) : color;

    const previewStroke = (() => {
        if (strokeBrush && engine !== 'pattern') {
            return {
                strokeWidth: pw,
                strokeLinecap: (lineStyle === 'dotted' || lineStyle === 'dashdot'
                    ? 'round'
                    : lineCap) as LineCap,
                strokeLinejoin: lineJoin,
                strokeDasharray:
                    lineStyle === 'dashed'
                        ? `${pw * 2} ${pw * 1.5}`
                        : lineStyle === 'dotted'
                          ? `0.1 ${pw * 2}`
                          : lineStyle === 'dashdot'
                            ? `${pw * 3} ${pw * 1.5} 0.1 ${pw * 1.5}`
                            : undefined,
            };
        }
        if (isVariableBrush(brush))
            return {
                strokeWidth: pw,
                strokeLinecap: (engine === 'ink' ? 'round' : 'butt') as LineCap,
            };
        if (engine === 'pattern')
            return {
                strokeWidth: clamp(pw, 4, 20),
                strokeLinecap: 'butt' as const,
                strokeDasharray: '3 3',
            };
        return {
            strokeWidth: clamp(pw / 5, 2, 7),
            strokeLinecap: 'round' as const,
            strokeDasharray: '0.1 7',
        }; // spray / dots
    })();

    const previewShadow = (() => {
        if (engine === 'neon' && !shadowActive) return `drop-shadow(0 0 7px ${color})`;
        if (!shadowActive) return undefined;
        const c = toRgba(shadowMatchColor ? color : shadowColor, shadowOpacity);
        return `drop-shadow(${shadowOffsetX / 2}px ${shadowOffsetY / 2}px ${shadowBlur / 3}px ${c})`;
    })();

    return (
        <div
            className="relative h-16 overflow-hidden rounded-md border border-line-strong"
            style={{
                backgroundImage: 'conic-gradient(#e5e7eb 25%, #fff 0 50%, #e5e7eb 0 75%, #fff 0)',
                backgroundSize: '12px 12px',
            }}
            aria-hidden="true"
        >
            {engine === 'eraser' ? (
                <div className="flex h-full items-center justify-center">
                    <div
                        className="rounded-full border-2 border-dashed border-ink-muted"
                        style={{ width: clamp(width, 6, 56), height: clamp(width, 6, 56) }}
                    />
                </div>
            ) : (
                <svg
                    viewBox="0 0 200 64"
                    className="h-full w-full"
                    preserveAspectRatio="none"
                    style={{ overflow: 'visible' }}
                >
                    <path
                        d="M12 34 C 40 6, 70 58, 100 32 S 160 8, 188 34"
                        fill={strokeBrush && fillEnabled ? toRgba(fillColor, fillOpacity) : 'none'}
                        stroke={previewColor}
                        opacity={opacity}
                        style={{
                            mixBlendMode:
                                blend === 'source-over'
                                    ? undefined
                                    : (blend as React.CSSProperties['mixBlendMode']),
                            filter: previewShadow,
                        }}
                        {...previewStroke}
                    />
                </svg>
            )}
        </div>
    );
}
