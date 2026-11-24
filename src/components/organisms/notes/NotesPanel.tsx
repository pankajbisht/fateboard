/**
 * Notes panel (left rail, lazy chunk, 2026-11-17): add notes (Note tool, N), show / hide the pins, search,
 * filter by status and colour tag, this page or every page; a row jumps to its pin. Data: `createNotesSlice`
 * (`lib/notes/pageNotes`); pins on the board: `NotePins`.
 */
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import Chip from '@/components/atoms/Chip';
import Input from '@/components/atoms/Input';
import Switch from '@/components/atoms/Switch';
import EmptyState from '@/components/molecules/EmptyState';
import Field from '@/components/molecules/Field';
import PanelAction from '@/components/molecules/PanelAction';
import PanelSection from '@/components/molecules/PanelSection';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import {
    NOTE_COLORS,
    NOTE_COLOR_HEX,
    collectNotes,
    matchesNoteFilter,
    noteColorName,
    type NoteColor,
    type NoteFilter,
} from '@/lib/notes/pageNotes';
import type { NoteScope } from '@/store/slices/createNotesSlice';
import { NoteRow } from './NoteRow';

const STATUS: { value: NoteFilter['status']; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'all', label: 'All' },
];
const SCOPE: { value: NoteScope; label: string }[] = [
    { value: 'page', label: 'This page' },
    { value: 'all', label: 'All pages' },
];

const toggled = (list: NoteColor[], c: NoteColor) =>
    list.includes(c) ? list.filter((x) => x !== c) : [...list, c];

export default function NotesPanel() {
    const s = useStore(
        useShallow((st) => ({
            notes: st.pageNotes,
            pages: st.pages,
            currentPageId: st.currentPageId,
            filter: st.noteFilter,
            scope: st.notesScope,
            visible: st.notesVisible,
            toolOn: st.activeTool === 'note',
            setNoteFilter: st.setNoteFilter,
            setNotesScope: st.setNotesScope,
            setNotesVisible: st.setNotesVisible,
            setActiveTool: st.setActiveTool,
        })),
    );
    const { filter, scope } = s;

    const rows = useMemo(() => {
        const all =
            scope === 'all'
                ? collectNotes(s.pages ?? [], s.currentPageId ?? null, s.notes)
                : collectNotes([], s.currentPageId ?? null, s.notes);
        return all.filter((r) => matchesNoteFilter(r.note, filter));
    }, [scope, s.pages, s.currentPageId, s.notes, filter]);

    const anyNotes = scope === 'all' || s.notes.length > 0;

    return (
        <div className="flex flex-col gap-4">
            <PanelSection>
                <PanelAction
                    icon="note"
                    aria-pressed={s.toolOn}
                    onClick={() => s.setActiveTool(s.toolOn ? 'select' : 'note')}
                >
                    Add note
                </PanelAction>
                <p className="text-xs text-ink-muted">
                    {s.toolOn
                        ? 'Click the board to place a note, or an object to attach one to it. Esc stops.'
                        : 'Press N, then click the board.'}
                </p>
                <Field label="Show pins" inline>
                    <Switch
                        checked={s.visible}
                        onChange={s.setNotesVisible}
                        aria-label="Show pins"
                    />
                </Field>
            </PanelSection>

            <PanelSection title="Find">
                <Input
                    leadingIcon="magnifying-glass"
                    aria-label="Search notes"
                    placeholder="Search notes"
                    value={filter.query}
                    onChange={(e) => s.setNoteFilter({ query: e.target.value })}
                />
                <SegmentedControl
                    aria-label="Status"
                    options={STATUS}
                    value={filter.status}
                    onChange={(status) => s.setNoteFilter({ status })}
                    block
                />
                <div role="group" aria-label="Colour tags" className="flex flex-wrap gap-1.5">
                    {NOTE_COLORS.map((c) => (
                        <Chip
                            key={c}
                            active={filter.colors.includes(c)}
                            onClick={() => s.setNoteFilter({ colors: toggled(filter.colors, c) })}
                        >
                            <span
                                aria-hidden
                                className="size-2.5 rounded-full"
                                style={{ backgroundColor: NOTE_COLOR_HEX[c] }}
                            />
                            {noteColorName(c)}
                        </Chip>
                    ))}
                </div>
                <SegmentedControl
                    aria-label="Show notes from"
                    options={SCOPE}
                    value={scope}
                    onChange={s.setNotesScope}
                    block
                />
            </PanelSection>

            <PanelSection title={`Notes (${rows.length})`}>
                {rows.length ? (
                    <ul aria-label="Notes" className="flex flex-col gap-1.5">
                        {rows.map((r) => (
                            <NoteRow
                                key={`${r.pageId}:${r.note.id}`}
                                row={r}
                                showPage={scope === 'all'}
                            />
                        ))}
                    </ul>
                ) : (
                    <EmptyState
                        icon="note"
                        title={anyNotes ? 'No notes match' : 'No notes yet'}
                        description={
                            anyNotes
                                ? 'Change the search or the filters.'
                                : 'Add a note, then click the board to pin it.'
                        }
                    />
                )}
            </PanelSection>
        </div>
    );
}
