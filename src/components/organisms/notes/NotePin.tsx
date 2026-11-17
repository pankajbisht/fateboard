import { useRef, useState, type PointerEvent } from 'react';
import clsx from 'clsx';
import type { Canvas } from 'fabric';
import { useStore } from '@store';
import { clientToScene, sceneToClient } from '@/lib/canvas/deepZoom';
import { NOTE_COLOR_HEX, NOTE_INK, pinLabel } from '@/lib/notes/pageNotes';
import type { PinSpot } from './useNotePins';

const DRAG_PX = 4;

/**
 * One pin: a bubble whose square corner points at the note's spot. Click (or Enter) opens the note; a free
 * pin can be dragged to a new spot (one undo step). A linked pin follows its object instead.
 */
export function NotePin({
    spot,
    active,
    canvas,
    onToggle,
}: {
    spot: PinSpot;
    active: boolean;
    canvas: Canvas;
    onToggle: () => void;
}) {
    const updateNote = useStore((s) => s.updateNote);
    const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
    const dragged = useRef(false);
    const [offset, setOffset] = useState<{ dx: number; dy: number } | null>(null);
    const { note } = spot;
    const free = !note.objectId;

    const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        drag.current = { x: e.clientX, y: e.clientY, moved: false };
        e.currentTarget.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
        const d = drag.current;
        if (!d || !free) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < DRAG_PX) return;
        d.moved = true;
        setOffset({ dx, dy });
    };
    const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
        const d = drag.current;
        drag.current = null;
        setOffset(null);
        if (!d?.moved) return;
        dragged.current = true; // the click that follows is the end of the drag, not "open"
        const at = sceneToClient(canvas, { x: note.x, y: note.y });
        const to =
            at && clientToScene(canvas, { x: at.x + e.clientX - d.x, y: at.y + e.clientY - d.y });
        const r2 = (v: number) => Math.round(v * 100) / 100; // no snapping at high zoom
        if (to) updateNote(note.id, { x: r2(to.x), y: r2(to.y) });
    };

    const resolved = note.status === 'resolved';
    return (
        <button
            type="button"
            data-note-pin
            aria-label={pinLabel(note, spot.number)}
            title={pinLabel(note, spot.number)}
            aria-expanded={active}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
                drag.current = null;
                setOffset(null);
            }}
            onClick={() => {
                if (dragged.current) dragged.current = false;
                else onToggle();
            }}
            className={clsx(
                'pointer-events-auto absolute flex size-7 -translate-y-full items-center justify-center rounded-[50%_50%_50%_0] text-xs font-semibold shadow-md ring-2 motion-safe:transition-transform',
                'focus-visible:outline-none focus-visible:ring-primary-500 motion-safe:hover:scale-110',
                active ? 'z-10 scale-110 ring-primary-500' : 'ring-surface',
                resolved && !active && 'opacity-60',
                free ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
            )}
            style={{
                left: spot.x + (offset?.dx ?? 0),
                top: spot.y + (offset?.dy ?? 0),
                backgroundColor: NOTE_COLOR_HEX[note.color],
                color: NOTE_INK,
            }}
        >
            {spot.number}
        </button>
    );
}
