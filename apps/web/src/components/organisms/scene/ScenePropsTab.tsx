import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { PROP_CATEGORIES, getProp, searchProps } from '@/props/catalog';
import { sceneHeightOf, sceneReady } from '@/props/sceneSize';
import type { PropCategory, PropDef } from '@/props/types';
import { MAX_SCENE_PROPS, SCENE_PROP_HEIGHT } from '@/scene/schema/types';
import { Button } from '../../atoms/Button';
import { Chip } from '../../atoms/Chip';
import Input from '../../atoms/Input';
import { SliderField } from '../../molecules/LabeledSlider';
import { PanelSection } from '../../molecules/PanelSection';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { PropCard, propThumb } from '../props/PropCard';

/** Categories that stand in a place (Sky, Effects and Backdrops stay on the page). */
const CATEGORIES = PROP_CATEGORIES.filter((c) => sceneReady({ category: c.id }));
type View = PropCategory | 'favorites';

const thumbs = new Map<string, string>();
const thumb = (p: PropDef) => {
    let src = thumbs.get(p.id);
    if (!src) thumbs.set(p.id, (src = propThumb(p)));
    return src;
};

/** The selected prop: size, look, copy, remove. */
function SelectedProp() {
    const { scene, selectedId, actor, edit, duplicate, select, undo, toast } = useStore(
        useShallow((s) => ({
            scene: s.studioScene,
            selectedId: s.sceneSelectedProp,
            actor: s.sceneSelectedActor,
            edit: s.editStudioScene,
            duplicate: s.duplicateSceneProp,
            select: s.selectSceneProp,
            undo: s.sceneUndo,
            toast: s.showToast,
        })),
    );
    const prop = !actor ? scene?.props.find((p) => p.id === selectedId) : undefined;
    const def = prop && getProp(prop.propId);
    if (!prop || !def) return null;
    const base = sceneHeightOf(def);
    const min = Math.max(SCENE_PROP_HEIGHT.min, Math.round(base / 4));
    const max = Math.min(SCENE_PROP_HEIGHT.max, Math.round(base * 3));
    const remove = () => {
        edit({ kind: 'removeProp', id: prop.id });
        select(null);
        toast({ message: `Removed ${def.label}`, actionLabel: 'Undo', onAction: undo });
    };
    return (
        <PanelSection
            title={def.label}
            description="Drag it on the stage. Arrow keys move it, [ and ] resize it, Delete removes it."
        >
            <SliderField
                label="Height"
                unit=" cm"
                min={min}
                max={Math.max(max, prop.height)}
                step={1}
                value={prop.height}
                defaultValue={base}
                onChange={(height) =>
                    edit(
                        { kind: 'updateProp', id: prop.id, patch: { height } },
                        `prop-size-${prop.id}`,
                    )
                }
            />
            {def.variants && def.variants.length > 1 && (
                <SegmentedControl<string>
                    aria-label={`${def.label} look`}
                    value={String(Math.min(prop.variant, def.variants.length - 1))}
                    onChange={(v) =>
                        edit({ kind: 'updateProp', id: prop.id, patch: { variant: Number(v) } })
                    }
                    options={def.variants.map((label, i) => ({ value: String(i), label }))}
                />
            )}
            <div className="flex gap-2">
                <Button
                    variant="secondary"
                    size="sm"
                    icon="copy"
                    disabled={(scene?.props.length ?? 0) >= MAX_SCENE_PROPS}
                    onClick={() => duplicate(prop.id)}
                >
                    Duplicate
                </Button>
                <Button variant="secondary" size="sm" icon="trash" onClick={remove}>
                    Remove
                </Button>
            </div>
        </PanelSection>
    );
}

/** What stands in the scene, to pick one that is hidden or out of the frame. */
function InScene() {
    const { props, selectedId, actor, select } = useStore(
        useShallow((s) => ({
            props: s.studioScene?.props ?? [],
            selectedId: s.sceneSelectedProp,
            actor: s.sceneSelectedActor,
            select: s.selectSceneProp,
        })),
    );
    if (!props.length) return null;
    return (
        <PanelSection title={`In this scene (${props.length} of ${MAX_SCENE_PROPS})`}>
            <div role="group" aria-label="Props in this scene" className="flex flex-wrap gap-1.5">
                {props.map((p) => (
                    <Chip
                        key={p.id}
                        active={!actor && p.id === selectedId}
                        onClick={() => select(p.id)}
                    >
                        {getProp(p.propId)?.label ?? 'Unknown prop'}
                    </Chip>
                ))}
            </div>
        </PanelSection>
    );
}

/**
 * Scene mode "Props" (docs/PROPS.md §9): the Scene Objects catalogue in 3D. A prop stands on the ground at its
 * real size, faces the camera from every angle and sorts in depth with the characters.
 */
export function ScenePropsTab() {
    const { add, count, favorites, toggleFavorite } = useStore(
        useShallow((s) => ({
            add: s.addSceneProp,
            count: s.studioScene?.props.length ?? 0,
            favorites: s.propFavorites,
            toggleFavorite: s.togglePropFavorite,
        })),
    );
    const favList = useMemo(
        () =>
            (favorites ?? [])
                .map((id) => getProp(id))
                .filter((p): p is PropDef => !!p && sceneReady(p)),
        [favorites],
    );
    const [picked, setPicked] = useState<View>(CATEGORIES[0].id);
    const view = picked === 'favorites' && !favList.length ? CATEGORIES[0].id : picked;
    const [query, setQuery] = useState('');
    const searching = query.trim().length > 0;
    const list = useMemo(() => {
        if (searching) return searchProps(query).filter(sceneReady);
        if (view === 'favorites') return favList;
        return searchProps('', view);
    }, [query, searching, view, favList]);
    const starred = useMemo(() => new Set(favorites ?? []), [favorites]);
    const full = count >= MAX_SCENE_PROPS;

    return (
        <div className="flex flex-col gap-4">
            <SelectedProp />
            <InScene />
            <PanelSection
                title="Props"
                description={
                    full
                        ? `This scene holds ${MAX_SCENE_PROPS} props, the most it can. Remove one to add another.`
                        : 'Click to stand a prop in front of the camera, or drag it onto the stage.'
                }
            >
                <Input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search trees, desks, cars…"
                    aria-label="Search props"
                    leadingIcon="magnifying-glass"
                />
                {!searching && (
                    <div role="group" aria-label="Prop category" className="flex flex-wrap gap-1.5">
                        {favList.length > 0 && (
                            <Chip
                                icon="star"
                                active={view === 'favorites'}
                                onClick={() => setPicked('favorites')}
                            >
                                Favorites
                            </Chip>
                        )}
                        {CATEGORIES.map((c) => (
                            <Chip key={c.id} active={c.id === view} onClick={() => setPicked(c.id)}>
                                {c.label}
                            </Chip>
                        ))}
                    </div>
                )}
                {list.length ? (
                    <ul aria-label="Props to add" className="grid grid-cols-3 gap-1.5">
                        {list.map((p) => (
                            <PropCard
                                key={p.id}
                                prop={p}
                                src={thumb(p)}
                                onAdd={() => {
                                    if (!full) void add(p.id);
                                }}
                                starred={starred.has(p.id)}
                                onStar={() => toggleFavorite(p.id)}
                                target="the stage"
                            />
                        ))}
                    </ul>
                ) : (
                    <p className="text-caption text-ink-muted">No props match “{query.trim()}”.</p>
                )}
            </PanelSection>
        </div>
    );
}

export default ScenePropsTab;
