import clsx from 'clsx';
import { PROP_DRAG_TYPE } from '@/props/dragType';
import { propSvg } from '@/props/render/propSvg';
import { defaultPropData } from '@/props/schema/parse';
import type { PropDef } from '@/props/types';
import { Icon } from '../../atoms/Icon';
import { FOCUS_RING } from '../../atoms/control.styles';

/** The prop's drawing as an image source (our own SVG: no user text in it). */
export const propThumb = (p: PropDef) =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(propSvg(p, defaultPropData(p)))}`;

export function PropCard({
    prop,
    src,
    onAdd,
    starred,
    onStar,
    target = 'the page',
}: {
    prop: PropDef;
    src: string;
    onAdd: () => void;
    starred: boolean;
    onStar: () => void;
    /** where a drag drops it, for the tooltip */
    target?: string;
}) {
    return (
        <li className="relative">
            <button
                type="button"
                draggable
                aria-label={`Add ${prop.label}`}
                title={`${prop.label}: click to add, or drag onto ${target}`}
                onClick={onAdd}
                onDragStart={(e) => {
                    e.dataTransfer.setData(PROP_DRAG_TYPE, prop.id);
                    e.dataTransfer.effectAllowed = 'copy';
                }}
                className={clsx(
                    'flex w-full cursor-grab flex-col items-center gap-0.5 rounded-md border border-line p-1 text-[11px] text-ink transition-colors hover:bg-surface-strong active:cursor-grabbing',
                    FOCUS_RING,
                )}
            >
                <img
                    src={src}
                    alt=""
                    width={64}
                    height={56}
                    loading="lazy"
                    draggable={false}
                    className="h-14 w-16 object-contain"
                />
                <span className="w-full truncate">{prop.label}</span>
            </button>
            {/* always visible (no hover-only controls): touch screens star too */}
            <button
                type="button"
                aria-label={`Favorite ${prop.label}`}
                aria-pressed={starred}
                title={starred ? 'Remove from favorites' : 'Add to favorites'}
                onClick={onStar}
                className={clsx(
                    'absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-md text-[11px] hover:bg-surface-strong',
                    starred ? 'text-primary-500' : 'text-ink-muted',
                    FOCUS_RING,
                )}
            >
                <Icon name="star" filled={starred} />
            </button>
        </li>
    );
}
