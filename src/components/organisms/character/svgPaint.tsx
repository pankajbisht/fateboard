import type { ReactNode } from 'react';
import type { Paint } from '@/character/render/parts';
import { MANGA_INK } from '@/character/render/styles';
import { gradientEnds, gradientRegistry } from '@/character/render/toSvg';

/**
 * Fills for a list of drawn paths plus the <defs> they need: linear gradients and three screentone densities
 * (light tone, shadow, dark skin shadow). Shared by the character and scene views; `uid` keeps ids unique when
 * several SVGs share the page, `cell` is the tone's dot spacing in the SVG's units.
 */
const LEVELS = [
    ['tone', 0.25],
    ['shade', 0.45],
    ['deep', 0.65],
] as const;

const level = (t: number) => (t >= 0.55 ? 'deep' : t >= 0.35 ? 'shade' : 'tone');

export function svgPaint(
    items: readonly { fill: Paint; tone?: number }[],
    uid: string,
    cell: number,
): { fills: string[]; defs: ReactNode } {
    const grads = gradientRegistry(`${uid}g`);
    const fills = items.map((d) => (d.tone ? `url(#${uid}${level(d.tone)})` : grads.url(d.fill)));
    const dot = (density: number) => cell * Math.sqrt(density / Math.PI) * 0.75;
    const defs = (
        <defs>
            {grads.list().map(({ id, paint }) => {
                const e = gradientEnds(paint.angle);
                return (
                    <linearGradient key={id} id={id} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}>
                        {paint.stops.map(([o, c]) => (
                            <stop key={o} offset={o} stopColor={c} />
                        ))}
                    </linearGradient>
                );
            })}
            {LEVELS.map(([name, density]) => (
                <pattern
                    key={name}
                    id={`${uid}${name}`}
                    patternUnits="userSpaceOnUse"
                    width={cell}
                    height={cell}
                    patternTransform="rotate(45)"
                >
                    <rect width={cell} height={cell} fill="#ffffff" />
                    <circle cx={cell / 2} cy={cell / 2} r={dot(density)} fill={MANGA_INK} />
                </pattern>
            ))}
        </defs>
    );
    return { fills, defs };
}
