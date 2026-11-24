import clsx from 'clsx';
import { memo, useId, useMemo } from 'react';
import { drawables } from '@/character/render/parts';
import { renderCharacter, type RenderModel } from '@/character/render/renderCharacter';
import { DEFAULT_CAMERA } from '@/character/schema/parse';
import type { Character, CharacterCamera, Pose } from '@/character/schema/types';
import type { StudioPart } from '@/character/studio/edit';
import { svgPaint } from './svgPaint';

/**
 * A rendered character as SVG paths (the same model the board gets). Paths keep stable keys, so a slider only
 * updates attributes; nothing is rebuilt. With `onSelect`, pressing a part selects its body part. Gradients and
 * the manga screentone (an SVG pattern here; a Comic tone fill on the page) live in this view's own <defs>
 * (svgPaint, shared with the scene view).
 */
export function CharacterView({
    model,
    label,
    selected,
    onSelect,
    className,
}: {
    model: RenderModel;
    /** empty = decorative (a thumbnail next to its name) */
    label: string;
    selected?: StudioPart | null;
    onSelect?: (part: StudioPart | null) => void;
    className?: string;
}) {
    const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
    const [x, y, w, h] = model.viewBox;
    const items = useMemo(() => drawables(model.parts), [model]);
    const { fills, defs } = svgPaint(items, uid, model.height * 0.014);

    return (
        <svg
            viewBox={`${x} ${y} ${w} ${h}`}
            {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
            preserveAspectRatio="xMidYMid meet"
            className={clsx('h-full w-full', className)}
            onPointerDown={
                onSelect ? (e) => e.target === e.currentTarget && onSelect(null) : undefined
            }
        >
            {defs}
            {items.map((d, i) => (
                <path
                    key={d.key}
                    d={d.d}
                    fill={fills[i]}
                    fillOpacity={d.opacity}
                    stroke={d.stroke ?? 'none'}
                    strokeWidth={d.strokeWidth}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    data-part={d.main ? d.group : undefined}
                    className={onSelect ? 'cursor-pointer' : undefined}
                    onPointerDown={onSelect ? () => onSelect(d.group) : undefined}
                />
            ))}
            {selected != null &&
                items
                    .filter((d) => d.main && d.group === selected)
                    .map((d) => (
                        <path
                            key={`sel-${d.key}`}
                            d={d.d}
                            fill="none"
                            strokeWidth={Math.max(d.outlineWidth, model.height * 0.004) * 1.8}
                            style={{ stroke: 'var(--color-primary-500)' }}
                            pointerEvents="none"
                        />
                    ))}
        </svg>
    );
}

/** A small front view (cards); rendered once per character. */
export const CharacterThumb = memo(function CharacterThumb({
    character,
    camera = DEFAULT_CAMERA,
}: {
    character: Character;
    camera?: CharacterCamera;
}) {
    const model = useMemo(() => renderCharacter(character, camera), [character, camera]);
    return <CharacterView model={model} label="" className="pointer-events-none" />;
});

/** A pose on a plain mannequin (pose thumbnails stay cheap and neutral). */
export const PoseThumb = memo(function PoseThumb({
    mannequin,
    pose,
}: {
    mannequin: Character;
    pose: Pose;
}) {
    const model = useMemo(
        () => renderCharacter({ ...mannequin, rig: { pose } }, { ...DEFAULT_CAMERA, yaw: 25 }),
        [mannequin, pose],
    );
    return <CharacterView model={model} label="" className="pointer-events-none" />;
});
