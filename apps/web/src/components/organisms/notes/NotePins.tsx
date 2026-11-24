/**
 * Note pins over the board (2026-11-17): a layer the size of the board area, mounted by CanvasBoard in both
 * layouts. DOM, never drawn on the canvas, so pins are never exported. Pins: `NotePin`; the open note:
 * `NotePopover`. Data and actions: `createNotesSlice`.
 */
import { useRef } from 'react';
import type { Canvas } from 'fabric';
import { useStore } from '@store';
import { NotePin } from './NotePin';
import { NotePopover } from './NotePopover';
import { useNotePins } from './useNotePins';

export default function NotePins() {
    const layer = useRef<HTMLDivElement>(null);
    const { spots, width, height } = useNotePins(layer);
    const canvas = useStore((s) => s.canvas) as Canvas | null;
    const activeNoteId = useStore((s) => s.activeNoteId);
    const setActiveNote = useStore((s) => s.setActiveNote);
    const open = spots.find((s) => s.note.id === activeNoteId);

    return (
        <div
            ref={layer}
            data-note-pins
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
        >
            {canvas &&
                spots.map((spot) => (
                    <NotePin
                        key={spot.note.id}
                        spot={spot}
                        canvas={canvas}
                        active={spot.note.id === activeNoteId}
                        onToggle={() =>
                            setActiveNote(spot.note.id === activeNoteId ? null : spot.note.id)
                        }
                    />
                ))}
            {open && <NotePopover key={open.note.id} spot={open} bounds={{ width, height }} />}
        </div>
    );
}
