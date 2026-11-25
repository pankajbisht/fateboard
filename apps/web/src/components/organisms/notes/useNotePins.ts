/**
 * Where the note pins sit on screen (px inside the pins layer), kept in step with the board: recomputed once
 * per frame after a canvas render (move, zoom, pan, undo) or a window resize. Linked notes follow their
 * object (`notePoint`). Shown: open notes, resolved ones only when the Notes filter shows them, and the
 * open note always.
 */
import { useEffect, useState, type RefObject } from 'react';
import type { Canvas } from 'fabric';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { sceneToClient } from '@/lib/canvas/deepZoom';
import { notePoint, shapeIdIndex } from '@/lib/notes/noteTargets';
import type { NoteFilter, PageNote } from '@/lib/notes/pageNotes';

export interface PinSpot {
    note: PageNote;
    /** 1-based, page order. */
    number: number;
    x: number;
    y: number;
    /** Linked and its object is on the page. */
    linked: boolean;
}

export interface PinLayout {
    spots: PinSpot[];
    /** The layer's size (the pop-over stays inside it). */
    width: number;
    height: number;
}

const EMPTY: PinLayout = { spots: [], width: 0, height: 0 };

export const showsPin = (n: PageNote, status: NoteFilter['status'], activeId: string | null) =>
    n.id === activeId || status === 'all' || n.status === status;

const sameLayout = (a: PinLayout, b: PinLayout) =>
    a.width === b.width &&
    a.height === b.height &&
    a.spots.length === b.spots.length &&
    a.spots.every((s, i) => {
        const t = b.spots[i]!;
        return s.note === t.note && s.x === t.x && s.y === t.y && s.linked === t.linked;
    });

export function useNotePins(layer: RefObject<HTMLDivElement | null>): PinLayout {
    const { canvas, notes, visible, status, activeId } = useStore(
        useShallow((s) => ({
            canvas: s.canvas as Canvas | null,
            notes: s.pageNotes,
            visible: s.notesVisible,
            status: s.noteFilter.status,
            activeId: s.activeNoteId,
        })),
    );
    const [layout, setLayout] = useState<PinLayout>(EMPTY);
    const live = !!canvas && visible && notes.length > 0;

    useEffect(() => {
        const el = layer.current;
        if (!live || !canvas || !el) return;
        const shown = notes
            .map((note, i) => ({ note, number: i + 1 }))
            .filter(({ note }) => showsPin(note, status, activeId));
        let raf = 0;
        const compute = () => {
            raf = 0;
            const box = el.getBoundingClientRect();
            const index = shown.some((s) => s.note.objectId) ? shapeIdIndex(canvas) : new Map();
            const spots: PinSpot[] = [];
            for (const s of shown) {
                const at = sceneToClient(canvas, notePoint(s.note, index));
                if (!at) continue;
                spots.push({
                    ...s,
                    x: Math.round(at.x - box.left),
                    y: Math.round(at.y - box.top),
                    linked: !!s.note.objectId && index.has(s.note.objectId),
                });
            }
            const next = { spots, width: el.clientWidth, height: el.clientHeight };
            setLayout((prev) => (sameLayout(prev, next) ? prev : next));
        };
        const schedule = () => {
            if (!raf) raf = requestAnimationFrame(compute);
        };
        compute();
        // after:render fires for every move / scale / zoom / pan / undo; one compute per frame
        const off = canvas.on('after:render', schedule);
        window.addEventListener('resize', schedule);
        return () => {
            off();
            window.removeEventListener('resize', schedule);
            cancelAnimationFrame(raf);
        };
    }, [live, canvas, notes, status, activeId, layer]);

    return live ? layout : EMPTY;
}
