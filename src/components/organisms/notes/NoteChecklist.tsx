import { useState } from 'react';
import clsx from 'clsx';
import { useStore } from '@store';
import { Icon } from '@/components/atoms/Icon';
import IconButton from '@/components/atoms/IconButton';
import Input from '@/components/atoms/Input';
import { NOTE_LIMITS, type PageNote } from '@/lib/notes/pageNotes';

/** A note's checklist: tick, remove, and add an item with Enter. */
export function NoteChecklist({ note }: { note: PageNote }) {
    const toggle = useStore((s) => s.toggleNoteCheckItem);
    const remove = useStore((s) => s.removeNoteCheckItem);
    const add = useStore((s) => s.addNoteCheckItem);
    const [draft, setDraft] = useState('');
    const done = note.checklist.filter((c) => c.done).length;

    return (
        <section aria-label="Checklist" className="flex flex-col gap-1">
            {note.checklist.length > 0 && (
                <p className="text-[11px] font-medium text-ink-muted">
                    Checklist {done}/{note.checklist.length}
                </p>
            )}
            {note.checklist.map((item) => (
                <div key={item.id} className="group flex items-center gap-1">
                    <button
                        type="button"
                        role="checkbox"
                        aria-checked={item.done}
                        onClick={() => toggle(note.id, item.id)}
                        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 py-0.5 text-left text-xs hover:bg-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
                    >
                        <Icon
                            name={item.done ? 'check-done' : 'check-empty'}
                            className={clsx('shrink-0', item.done && 'text-primary-ink')}
                        />
                        <span
                            className={clsx(
                                'break-words',
                                item.done && 'text-ink-muted line-through',
                            )}
                        >
                            {item.text}
                        </span>
                    </button>
                    <IconButton
                        size="sm"
                        aria-label={`Remove ${item.text}`}
                        title="Remove item"
                        icon={<Icon name="xmark" />}
                        onClick={() => remove(note.id, item.id)}
                    />
                </div>
            ))}
            <Input
                size="sm"
                leadingIcon="list-checks"
                aria-label="Add checklist item"
                placeholder="Add a checklist item"
                maxLength={NOTE_LIMITS.itemText}
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
