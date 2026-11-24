/**
 * The picture of a Help example at one step: the board as it looks after that step. Shapes added
 * by the step draw themselves in (strokes) or pop in, a cursor glides to where the step happens,
 * and a label names the control the step uses. See `helpScene.ts` for the picture language.
 */
import clsx from 'clsx';
import { useId, type CSSProperties } from 'react';

import { Icon } from '@/components/atoms/Icon';

import type { HelpExample } from '../helpExamples';
import { type Paint, SCENE_TOKENS, type SceneItem, visibleAt } from '../helpScene';
import { RichText } from './RichText';

const TOKEN_VAR: Record<(typeof SCENE_TOKENS)[number], string> = {
    ink: 'var(--color-ink)',
    muted: 'var(--color-ink-subtle)',
    page: 'var(--color-surface)',
    line: 'var(--color-line-strong)',
    primary: 'var(--color-primary-600)',
    accent: 'var(--color-accent-500)',
};

const paint = (value: Paint | undefined): string | undefined =>
    value && value in TOKEN_VAR ? TOKEN_VAR[value as keyof typeof TOKEN_VAR] : value;

const FONTS = {
    sans: 'inherit',
    script: '"Brush Script MT", "Segoe Script", "Snell Roundhand", cursive',
    serif: 'Georgia, "Times New Roman", serif',
};

type Tone = 'light' | 'mid' | 'dark';

function Photo({ item, clipId }: { item: Extract<SceneItem, { kind: 'photo' }>; clipId: string }) {
    const scale = `translate(${item.x} ${item.y}) scale(${item.w / 100} ${item.h / 100})`;
    const { tones } = item.style;
    // a duotone repaints every part in one of the two colors (mid = the dark one, see-through)
    const paintOf = (color: string, tone: Tone) =>
        tones
            ? {
                  fill: paint(tone === 'light' ? tones[1] : tones[0]),
                  fillOpacity: tone === 'mid' ? 0.45 : 1,
              }
            : { fill: color };
    return (
        <g transform={scale} style={{ filter: item.style.filter }}>
            <clipPath id={clipId}>
                {item.round ? (
                    <circle cx={50} cy={50} r={50} />
                ) : (
                    <rect width={100} height={100} rx={4} />
                )}
            </clipPath>
            <g clipPath={`url(#${clipId})`}>
                {item.subject === 'landscape' ? (
                    <>
                        <rect width={100} height={100} {...paintOf('#8ec5ff', 'light')} />
                        <circle cx={72} cy={30} r={11} {...paintOf('#ffd166', 'mid')} />
                        <path
                            d="M0 70 L28 38 L52 64 L70 46 L100 74 V100 H0Z"
                            {...paintOf('#5b8c5a', 'mid')}
                        />
                        <path
                            d="M0 84 Q30 66 60 82 T100 80 V100 H0Z"
                            {...paintOf('#2f5d3a', 'dark')}
                        />
                    </>
                ) : (
                    <>
                        <rect width={100} height={100} {...paintOf('#9ad1d4', 'light')} />
                        <path
                            d="M14 100 Q16 70 50 68 Q84 70 86 100Z"
                            {...paintOf('#355c7d', 'dark')}
                        />
                        <circle cx={50} cy={44} r={20} {...paintOf('#f1c27d', 'mid')} />
                        <path
                            d="M30 42 Q32 20 50 20 Q70 20 71 42 Q62 30 50 30 Q38 30 30 42Z"
                            {...paintOf('#4a3426', 'dark')}
                        />
                    </>
                )}
            </g>
        </g>
    );
}

function Shape({ item, id, animate }: { item: SceneItem; id: string; animate: boolean }) {
    const { style } = item;
    const drawIn = animate && !!style.draw && item.kind !== 'text' && item.kind !== 'photo';
    const filters = [
        style.glow &&
            `drop-shadow(0 0 3px ${paint(style.glow)}) drop-shadow(0 0 6px ${paint(style.glow)})`,
        style.shadow && 'drop-shadow(0 3px 3px rgb(0 0 0 / 0.28))',
        item.kind !== 'photo' && style.filter,
    ].filter(Boolean);
    const css: CSSProperties = {
        fill: style.grad
            ? `url(#${id}-grad)`
            : (paint(style.fill) ?? (item.kind === 'text' ? TOKEN_VAR.ink : 'none')),
        stroke: paint(style.stroke),
        strokeWidth: style.w ?? (style.stroke ? 2 : undefined),
        strokeDasharray: drawIn ? 1 : style.dash,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        opacity: style.op,
        filter: filters.length ? filters.join(' ') : undefined,
        transform: style.rot ? `rotate(${style.rot}deg)` : undefined,
        transformBox: 'fill-box',
        transformOrigin: 'center',
    };
    const props = {
        style: css,
        className: drawIn ? 'animate-scene-draw motion-reduce:animate-none' : undefined,
        pathLength: drawIn ? 1 : undefined,
    };

    let shape;
    switch (item.kind) {
        case 'rect':
            shape = (
                <rect
                    x={item.x}
                    y={item.y}
                    width={item.w}
                    height={item.h}
                    rx={style.rx}
                    {...props}
                />
            );
            break;
        case 'circle':
            shape = <circle cx={item.cx} cy={item.cy} r={item.r} {...props} />;
            break;
        case 'ellipse':
            shape = <ellipse cx={item.cx} cy={item.cy} rx={item.rx} ry={item.ry} {...props} />;
            break;
        case 'path':
            shape = <path d={item.d} {...props} />;
            break;
        case 'text':
            shape = (
                <text
                    x={item.x}
                    y={item.y}
                    fontSize={style.size ?? 12}
                    fontWeight={style.weight ?? 500}
                    textAnchor={style.anchor ?? 'start'}
                    fontFamily={FONTS[style.font ?? 'sans']}
                    letterSpacing={style.spacing}
                    {...props}
                >
                    {item.text}
                </text>
            );
            break;
        case 'photo':
            shape = <Photo item={item} clipId={`${id}-clip`} />;
    }

    return (
        <g
            className={clsx(
                'origin-center [transform-box:fill-box]',
                animate && !drawIn && 'animate-scene-in motion-reduce:animate-none',
            )}
        >
            {style.grad && (
                <defs>
                    {style.grad.radial ? (
                        <radialGradient id={`${id}-grad`}>
                            <stop offset="0" stopColor={paint(style.grad.from)} />
                            <stop offset="1" stopColor={paint(style.grad.to)} />
                        </radialGradient>
                    ) : (
                        <linearGradient
                            id={`${id}-grad`}
                            gradientTransform={`rotate(${style.grad.angle ?? 90} .5 .5)`}
                        >
                            <stop offset="0" stopColor={paint(style.grad.from)} />
                            <stop offset="1" stopColor={paint(style.grad.to)} />
                        </linearGradient>
                    )}
                </defs>
            )}
            {shape}
        </g>
    );
}

export function ExampleScene({
    example,
    step,
    still = false,
    bare = false,
}: {
    example: HelpExample;
    step: number;
    /** No entry animations: for a frame blended over another, or a zoomed copy. */
    still?: boolean;
    /** No cursor and no label: for a frame layered over another one. */
    bare?: boolean;
}) {
    const uid = useId();
    const current = example.steps[step];
    const items = visibleAt(example.scene, step);
    const cursor = bare ? undefined : current?.at;
    const fresh = (item: SceneItem) => !still && item.from === step;

    return (
        <div className="relative overflow-hidden rounded-md border border-line bg-surface-strong">
            <svg
                viewBox="0 0 320 180"
                role="img"
                aria-label={current ? `The board at step ${step + 1}` : 'The finished board'}
                className="block w-full"
            >
                <rect x={6} y={6} width={308} height={168} rx={4} className="fill-surface" />
                {example.scene.map((item, i) =>
                    items.includes(item) ? (
                        <Shape
                            key={`${i}-${fresh(item) ? step : 'still'}`}
                            item={item}
                            id={`${uid}-${i}`}
                            animate={fresh(item)}
                        />
                    ) : null,
                )}
                {cursor && (
                    <g
                        data-testid="scene-cursor"
                        style={{ transform: `translate(${cursor[0]}px, ${cursor[1]}px)` }}
                        className="transition-transform duration-500 ease-out motion-reduce:transition-none"
                    >
                        <circle
                            key={step}
                            r={10}
                            className="origin-center fill-primary-400 [transform-box:fill-box] animate-scene-click motion-reduce:hidden"
                        />
                        <path
                            d="M0 0 L0 13 L3.5 9.8 L6 15 L8.2 14 L5.8 9 L10 9 Z"
                            className="fill-surface stroke-ink"
                            strokeWidth={1.2}
                            strokeLinejoin="round"
                        />
                    </g>
                )}
            </svg>
            {bare ? null : current?.ui ? (
                <span
                    key={step}
                    className="absolute left-2 top-2 inline-flex max-w-[calc(100%-1rem)] motion-safe:animate-float-in items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-caption text-ink shadow-sm"
                >
                    <Icon name="arrow-pointer" className="shrink-0 text-primary-ink" />
                    <span className="truncate">
                        <RichText text={current.ui} />
                    </span>
                </span>
            ) : (
                !current && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary-600 px-2 py-0.5 text-caption font-semibold text-white">
                        <Icon name="check" />
                        Finished
                    </span>
                )
            )}
        </div>
    );
}
