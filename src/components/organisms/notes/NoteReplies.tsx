import { useState } from 'react';
import { useStore } from '@store';
import { Icon } from '@/components/atoms/Icon';
import IconButton from '@/components/atoms/IconButton';
import Input from '@/components/atoms/Input';
import { NOTE_LIMITS, type PageNote } from '@/lib/notes/pageNotes';

const when = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
export const noteTime = (ms: number) => (ms > 0 ? when.format(ms) : '');

/** A note's replies (a running log under the note), newest last; add one with Enter. */
export function NoteReplies({ note }: { note: PageNote }) {
    const add = useStore((s) => s.addNoteReply);
    const remove = useStore((s) => s.removeNoteReply);
    const [draft, setDraft] = useState('');

    return (
        <section aria-label="Replies" className="flex flex-col gap-1.5">
            {note.replies.length > 0 && (
                <ul className="flex flex-col gap-1.5 border-l-2 border-line pl-2">
                    {note.replies.map((r) => (
                        <li key={r.id} className="group flex items-start gap-1">
                            <div className="min-w-0 flex-1">
                                <p className="whitespace-pre-wrap break-words text-xs text-ink">
                                    {r.text}
                                </p>
                                <p className="text-[11px] text-ink-muted">{noteTime(r.at)}</p>
                            </div>
                            <IconButton
                                size="sm"
                                aria-label="Delete reply"
                                title="Delete reply"
                                icon={<Icon name="trash" />}
                                onClick={() => remove(note.id, r.id)}
                            />
                        </li>
                    ))}
                </ul>
            )}
            <Input
                size="sm"
                leadingIcon="reply"
                aria-label="Reply"
                placeholder="Reply"
                maxLength={NOTE_LIMITS.text}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key !== 'Enter' || !draft.trim()) return;
                    e.preventDefault();
                    if (add(note.id, draft)) setDraft('');
                }}
            />
        </section>
    );
}
