import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type * as fabric from 'fabric';
import { useStore } from '@store';
import { paintState, type PaintKind } from '@/lib/paintToggle';
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
 * Footer toggle (after the Fill / Stroke label) for the selection's fill or stroke, 16 px.
 * Fill = solid square, stroke = outlined square; a red slash means "none" (click adds the
 * default), hovering a present one previews the slash (click removes). Name + tooltip (above)
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
                    'group relative size-4 shrink-0 overflow-hidden rounded-[3px] border border-line-strong transition-colors',
                    'hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                )}
            >
                {/* glyph: solid square = fill, outlined square = stroke */}
                <span
                    aria-hidden
                    className={clsx(
                        'absolute rounded-[2px] transition-colors',
                        paint === 'fill' ? 'inset-[24%]' : 'inset-[22%] border-[1.5px]',
                        paint === 'fill'
                            ? none
                                ? 'border border-dashed border-ink-subtle group-hover:border-solid group-hover:border-primary-500 group-hover:bg-primary-500'
                                : 'bg-ink-muted group-hover:bg-ink-subtle'
                            : none
                              ? 'border-dashed border-ink-subtle group-hover:border-solid group-hover:border-primary-500'
                              : 'border-ink-muted group-hover:border-ink-subtle',
                    )}
                />
                {/* red slash: always when there is none; as a preview on hover when there is */}
                <span
                    aria-hidden
                    className={clsx(
                        'pointer-events-none absolute left-1/2 top-1/2 h-[1.5px] w-[125%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-danger transition-opacity',
                        none
                            ? 'opacity-100 group-hover:opacity-0'
                            : applicable
                              ? 'opacity-0 group-hover:opacity-100'
                              : 'opacity-0',
                    )}
                />
            </button>
        </Tooltip>
    );
}

export default PaintToggle;
