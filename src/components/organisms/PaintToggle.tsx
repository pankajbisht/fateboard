import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type * as fabric from 'fabric';
import { useStore } from '@store';
import { paintState, type PaintKind } from '@/lib/paintToggle';
import { Icon } from '../atoms/Icon';
import { Tooltip } from '../molecules/Tooltip';

const EVENTS = [
    'selection:created',
    'selection:updated',
    'selection:cleared',
    'object:modified',
    'object:added',
    'object:removed',
] as const;

/** Live fill / stroke state of the selection (canvas = source of truth). */
function usePaintState(paint: PaintKind) {
    const canvas = useStore((s) => s.canvas) as fabric.Canvas | null;
    // store mirrors that change when a palette pick, undo / redo or the footer repaints the selection
    const fill = useStore((s) => s.fill);
    const stroke = useStore((s) => s.stroke);
    const strokeWidth = useStore((s) => s.strokeWidth);
    const history = useStore(
        (s) =>
            `${(s as { undoStack?: unknown[] }).undoStack?.length ?? 0}/${(s as { redoStack?: unknown[] }).redoStack?.length ?? 0}`,
    );
    const [version, setVersion] = useState(0);
    const refresh = useCallback(() => setVersion((v) => v + 1), []);

    useEffect(() => {
        if (!canvas?.on) return;
        EVENTS.forEach((name) => canvas.on(name, refresh));
        return () => EVENTS.forEach((name) => canvas.off?.(name, refresh));
    }, [canvas, refresh]);

    return useMemo(
        () => paintState(canvas?.getActiveObjects?.() ?? [], paint),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- the rest are change signals
        [canvas, paint, version, fill, stroke, strokeWidth, history],
    );
}

const NOUN: Record<PaintKind, string> = { fill: 'fill', stroke: 'stroke' };

/**
 * Footer toggle (after the Fill / Stroke label) for the selection's fill or stroke, 20 px.
 * Icons (`atoms/customIcons.ts`): fill = solid swatch, stroke = thick outlined swatch; a dashed swatch with a red
 * slash means "none" (hover shows the swatch with a + : click adds the default); hovering a present one shows the
 * red slash (click removes). Name + tooltip (above)
 * say what the click does. Disabled with nothing to paint.
 */
export function PaintToggle({ paint }: { paint: PaintKind }) {
    const toggle = useStore((s) => (paint === 'fill' ? s.toggleFill : s.toggleStroke)) as
        (() => boolean) | undefined;
    const { applicable, present } = usePaintState(paint);
    const noun = NOUN[paint];
    const label = !applicable
        ? `Add or remove ${noun}`
        : present
          ? `Remove ${noun}`
          : `Add ${noun}`;
    const tip = applicable ? label : `${label} (select an object first)`;
    const none = applicable && !present;

    return (
        <Tooltip content={tip} position="top">
            <button
                type="button"
                data-paint={paint}
                data-state={!applicable ? 'disabled' : present ? 'on' : 'off'}
                aria-label={label}
                disabled={!applicable}
                onClick={() => toggle?.()}
                className={clsx(
                    'group relative grid size-5 shrink-0 place-items-center rounded-[4px] text-ink-muted transition-colors',
                    'hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                )}
            >
                {/* the state (solid fill / outlined stroke, dashed + red slash = none) … */}
                <Icon
                    name={`${paint}-${none ? 'none' : 'on'}`}
                    size="1rem"
                    className={clsx('col-start-1 row-start-1', applicable && 'group-hover:hidden')}
                />
                {/* … and on hover, what a click does: add (+) or remove (red slash) */}
                {applicable && (
                    <Icon
                        name={`${paint}-${none ? 'add' : 'remove'}`}
                        size="1rem"
                        className={clsx(
                            'col-start-1 row-start-1 hidden group-hover:inline-block',
                            none && 'text-primary-ink',
                        )}
                    />
                )}
            </button>
        </Tooltip>
    );
}

export default PaintToggle;
