import clsx from 'clsx';
import { useStore } from '@store';
import { Icon } from '@/components/atoms/Icon';
import IconButton from '@/components/atoms/IconButton';
import { NOTE_COLOR_HEX, NOTE_INK, noteSummary, type NoteRow as Row } from '@/lib/notes/pageNotes';

/** One note in the Notes panel: click to jump to its pin (and page); the check resolves / reopens it. */
export function NoteRow({ row, showPage }: { row: Row; showPage: boolean }) {
    const focusNote = useStore((s) => s.focusNote);
    const updateNote = useStore((s) => s.updateNote);
    const { note, number } = row;
    const resolved = note.status === 'resolved';
    const done = note.checklist.filter((c) => c.done).length;
    const summary = noteSummary(note.text, 120);

    return (
        <li className="flex items-start gap-1 rounded-md border border-line bg-surface p-1.5 hover:border-primary-300">
            <button
                type="button"
                onClick={() => void focusNote(note.id, row.pageId)}
                className="flex min-w-0 flex-1 items-start gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
            >
                <span
                    className={clsx(
                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[50%_50%_50%_0] text-xs font-semibold',
                        resolved && 'opacity-60',
                    )}
                    style={{ backgroundColor: NOTE_COLOR_HEX[note.color], color: NOTE_INK }}
                >
                    {number}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                        className={clsx(
                            'line-clamp-2 break-words text-xs',
                            summary ? 'text-ink' : 'italic text-ink-muted',
                            resolved && 'line-through',
                        )}
                    >
                        {summary || 'Empty note'}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-ink-muted">
                        {showPage && <span>{row.pageName}</span>}
                        {note.checklist.length > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                                <Icon name="list-checks" /> {done}/{note.checklist.length}
                            </span>
                        )}
                        {note.replies.length > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                                <Icon name="reply" /> {note.replies.length}
                                <span className="sr-only"> replies</span>
                            </span>
                        )}
                        {note.objectId && (
                            <span className="inline-flex items-center gap-0.5">
                                <Icon name="link" />
                                <span className="sr-only">linked</span>
                            </span>
                        )}
                        {note.pinned && (
                            <span className="inline-flex items-center gap-0.5">
                                <Icon name="pin" />
                                <span className="sr-only">pinned</span>
                            </span>
                        )}
                    </span>
                </span>
            </button>
            <IconButton
                size="sm"
                aria-label={`${resolved ? 'Reopen' : 'Resolve'} note ${number}`}
                title={resolved ? 'Reopen' : 'Resolve'}
                active={resolved}
                icon={<Icon name="circle-check" />}
                onClick={() => updateNote(note.id, { status: resolved ? 'open' : 'resolved' })}
            />
        </li>
    );
}
