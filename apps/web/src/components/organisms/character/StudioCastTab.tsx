import { useMemo, useState } from 'react';
import { useStore } from '@store';
import { NO_FILTER, castRecipes, filterCast, type CastFilter } from '@/character/data/cast';
import { AGE_GROUPS, type AgeGroup } from '@/character/data/castGenerator';
import { newId } from '@/character/schema/parse';
import type { Character } from '@/character/schema/types';
import { Button } from '../../atoms/Button';
import { Chip } from '../../atoms/Chip';
import { Icon } from '../../atoms/Icon';
import { Input } from '../../atoms/Input';
import { IconButton } from '../../atoms/IconButton';
import { EmptyState } from '../../molecules/EmptyState';
import { PanelSection } from '../../molecules/PanelSection';
import { CastGrid, useCastCharacters } from './CastGrid';
import { focusStudio } from './studioFocus';

const PAGE = 24;
const LOOKS: [CastFilter['look'], string][] = [
    ['any', 'Any look'],
    ['masculine', 'Masculine'],
    ['feminine', 'Feminine'],
];

/** Start from a cast member or one of your saved characters (replacing the current one: undoable). */
export function StudioCastTab() {
    const [filter, setFilter] = useState<CastFilter>(NO_FILTER);
    // 100 thumbnails at once would be slow to draw: a page at a time
    const [limit, setLimit] = useState(PAGE);
    const everyone = useCastCharacters();
    const matches = useMemo(() => {
        const ids = new Set(filterCast(castRecipes(), filter).map((r) => r.id));
        return everyone.filter((c) => ids.has(c.recipeRef ?? ''));
    }, [everyone, filter]);
    const shown = matches.slice(0, limit);
    const cast = everyone;
    const change = (patch: Partial<CastFilter>) => {
        setFilter({ ...filter, ...patch });
        setLimit(PAGE);
    };
    const library = useStore((s) => s.characterLibrary);
    const status = useStore((s) => s.characterLibraryStatus);
    const load = useStore((s) => s.loadStudioCharacter);
    const remove = useStore((s) => s.deleteFromLibrary);
    const confirmDialog = useStore((s) => s.confirmDialog);
    const activeId = useStore((s) => s.studioCharacter?.id);

    const ask = async (c: Character) => {
        const ok = await confirmDialog({
            title: `Delete "${c.name}"?`,
            message: 'It is removed from your saved characters. Characters already on pages stay.',
            confirmLabel: 'Delete',
            tone: 'danger',
        });
        if (ok) await remove(c.id);
        // the deleted card's button is gone: keep the keyboard in the studio (Esc, undo)
        focusStudio();
    };

    return (
        <>
            <PanelSection title="Your characters">
                {status === 'error' ? (
                    <p role="alert" className="text-caption text-danger">
                        Your saved characters could not be read.
                    </p>
                ) : library.length === 0 ? (
                    <EmptyState
                        icon="character"
                        title="No saved characters yet"
                        description="Use “Save to my characters” in the top bar."
                    />
                ) : (
                    <CastGrid
                        cast={library}
                        activeId={activeId}
                        onPick={load}
                        label={(c) => `Edit ${c.name}`}
                        renderAction={(c) => (
                            <IconButton
                                size="sm"
                                tone="danger"
                                icon={<Icon name="trash-can" />}
                                aria-label={`Delete ${c.name}`}
                                title="Delete"
                                className="absolute right-0.5 top-0.5 bg-surface"
                                onClick={() => void ask(c)}
                            />
                        )}
                    />
                )}
            </PanelSection>
            <PanelSection
                title={`Cast (${cast.length})`}
                description="Start from someone, then change anything."
            >
                <Input
                    size="sm"
                    aria-label="Search the cast"
                    placeholder="Search (name, job, shy, teacher…)"
                    value={filter.query}
                    onChange={(e) => change({ query: e.target.value })}
                />
                <div className="flex flex-wrap gap-1" role="group" aria-label="Age">
                    <Chip active={filter.age === 'any'} onClick={() => change({ age: 'any' })}>
                        All ages
                    </Chip>
                    {(Object.keys(AGE_GROUPS) as AgeGroup[]).map((g) => (
                        <Chip key={g} active={filter.age === g} onClick={() => change({ age: g })}>
                            {AGE_GROUPS[g].label}
                        </Chip>
                    ))}
                </div>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Look">
                    {LOOKS.map(([value, label]) => (
                        <Chip
                            key={value}
                            active={filter.look === value}
                            onClick={() => change({ look: value })}
                        >
                            {label}
                        </Chip>
                    ))}
                </div>
                <p role="status" className="text-caption text-ink-muted">
                    {shown.length === 0
                        ? 'Nobody matches.'
                        : `${matches.length} ${matches.length === 1 ? 'person' : 'people'}`}
                </p>
                <CastGrid
                    cast={shown}
                    onPick={(c) => load({ ...c, id: newId() })}
                    label={(c) => `Start from ${c.name}`}
                />
                {matches.length > shown.length && (
                    <Button variant="secondary" size="sm" onClick={() => setLimit(limit + PAGE)}>
                        Show more ({matches.length - shown.length} left)
                    </Button>
                )}
            </PanelSection>
        </>
    );
}

export default StudioCastTab;
