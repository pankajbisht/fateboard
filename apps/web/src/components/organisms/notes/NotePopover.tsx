import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { Icon } from '@/components/atoms/Icon';
import IconButton from '@/components/atoms/IconButton';
import Button from '@/components/atoms/Button';
import Swatch from '@/components/atoms/Swatch';
import Textarea from '@/components/atoms/Textarea';
import {
    NOTE_COLORS,
    NOTE_COLOR_HEX,
    NOTE_INK,
    NOTE_LIMITS,
    noteColorName,
} from '@/lib/notes/pageNotes';
import { NoteChecklist } from './NoteChecklist';
import { NoteReplies, noteTime } from './NoteReplies';
import type { PinSpot } from './useNotePins';

const WIDTH = 288;
const GAP = 8;
const PIN = 28; // NotePin size-7

/**
 * The open note, next to its pin. Typing is written to the page at once (`record: false`: a reload or a page
 * switch keeps it) and becomes one undo step when the field is left or the note closes (`saveNoteEdits` /
 * `setActiveNote`); an empty note is dropped when it closes. A click outside closes it (capture phase, before
 * the board or a pin reacts). `role="dialog"` without `aria-modal`: the board keys stay on, and the tools leave
 * Escape to it (`keyIsNotOurs`).
 */
export function NotePopover({
    spot,
    bounds,
}: {
    spot: PinSpot;
    bounds: { width: number; height: number };
}) {
    const { note, number } = spot;
    const a = useStore(
        useShallow((s) => ({
            updateNote: s.updateNote,
            saveNoteEdits: s.saveNoteEdits,
            deleteNote: s.deleteNote,
            setActiveNote: s.setActiveNote,
            linkNoteToSelection: s.linkNoteToSelection,
            unlinkNote: s.unlinkNote,
            selectNoteObject: s.selectNoteObject,
            hasSelection: !!s.hasSelection,
        })),
    );
    const box = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLTextAreaElement>(null);
    const resolved = note.status === 'resolved';
    const close = () => a.setActiveNote(null); // records unsaved typing, drops an empty note

    // a new (empty) note: start typing at once
    const startEmpty = !note.text;
    useEffect(() => {
        if (startEmpty) textRef.current?.focus();
    }, [startEmpty]);

    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            const t = e.target as Element | null;
            if (t && box.current?.contains(t)) return;
            if (t?.closest?.('[data-note-pin]')) return; // the pin's own click opens / switches
            a.setActiveNote(null);
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
    }, [a]);

    // the pin is PIN px wide, drawn up and right of its spot: the pop-over sits clear of it
    const right = spot.x + PIN + GAP;
    const left = right + WIDTH + GAP > bounds.width ? Math.max(GAP, spot.x - WIDTH - GAP) : right;
    const top = Math.max(GAP, Math.min(spot.y - 36, bounds.height - 320));

    return (
        <div
            ref={box}
            role="dialog"
            aria-label={`Note ${number}`}
            data-note-popover
            onKeyDown={(e) => {
                if (e.key !== 'Escape') return;
                e.stopPropagation();
                close();
            }}
            className="pointer-events-auto absolute z-30 flex flex-col gap-2.5 overflow-y-auto rounded-lg border border-line-strong bg-surface-raised p-3 text-ink shadow-lg motion-safe:animate-float-in"
            style={{ left, top, width: WIDTH, maxHeight: Math.max(200, bounds.height - top - GAP) }}
        >
            <header className="flex items-center gap-1">
                <span
                    className="flex size-6 items-center justify-center rounded-[50%_50%_50%_0] text-xs font-semibold"
                    style={{ backgroundColor: NOTE_COLOR_HEX[note.color], color: NOTE_INK }}
                    aria-hidden
                >
                    {number}
                </span>
                <span className="flex-1 truncate pl-1 text-[11px] text-ink-muted">
                    {noteTime(note.updatedAt)}
                </span>
                <IconButton
                    size="sm"
                    aria-label={note.pinned ? 'Unpin' : 'Pin to top'}
                    title={note.pinned ? 'Unpin' : 'Pin to top of the list'}
                    active={note.pinned}
                    icon={<Icon name={note.pinned ? 'pin-off' : 'pin'} />}
                    onClick={() => a.updateNote(note.id, { pinned: !note.pinned })}
                />
                <IconButton
                    size="sm"
                    aria-label={resolved ? 'Reopen' : 'Resolve'}
                    title={resolved ? 'Reopen' : 'Resolve'}
                    active={resolved}
                    icon={<Icon name="circle-check" />}
                    onClick={() =>
                        a.updateNote(note.id, { status: resolved ? 'open' : 'resolved' })
                    }
                />
                <IconButton
                    size="sm"
                    tone="danger"
                    aria-label="Delete note"
                    title="Delete note"
                    icon={<Icon name="trash" />}
                    onClick={() => a.deleteNote(note.id)}
                />
                <IconButton
                    size="sm"
                    aria-label="Close note"
                    title="Close (Esc)"
                    icon={<Icon name="xmark" />}
                    onClick={close}
                />
            </header>

            <Textarea
                ref={textRef}
                aria-label="Note text"
                placeholder="Write a note"
                rows={3}
                maxLength={NOTE_LIMITS.text}
                value={note.text}
                onChange={(e) => a.updateNote(note.id, { text: e.target.value }, { record: false })}
                onBlur={() => a.saveNoteEdits(note.id)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) close();
                }}
            />

            <div
                role="group"
                aria-label="Colour tag"
                className="flex flex-wrap items-center gap-1.5"
            >
                {NOTE_COLORS.map((c) => (
                    <Swatch
                        key={c}
                        color={NOTE_COLOR_HEX[c]}
                        label={noteColorName(c)}
                        state={note.color === c ? 'active' : 'none'}
                        className="rounded-full"
                        onClick={() => a.updateNote(note.id, { color: c })}
                    />
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
                {note.objectId ? (
                    <>
                        <Icon name="link" />
                        <span className="flex-1">
                            {spot.linked ? 'Follows an object' : 'Its object was deleted'}
                        </span>
                        {spot.linked && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => a.selectNoteObject(note.id)}
                            >
                                Select object
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="ghost"
                            icon="unlink"
                            onClick={() => a.unlinkNote(note.id)}
                        >
                            Unlink
                        </Button>
                    </>
                ) : (
                    <Button
                        size="sm"
                        variant="secondary"
                        icon="link"
                        disabled={!a.hasSelection}
                        title={a.hasSelection ? undefined : 'Select an object on the board first'}
                        onClick={() => a.linkNoteToSelection(note.id)}
                    >
                        Link to selection
                    </Button>
                )}
            </div>

            <NoteChecklist note={note} />
            <NoteReplies note={note} />
        </div>
    );
}
