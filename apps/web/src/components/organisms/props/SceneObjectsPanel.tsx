import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { PROP_CATEGORIES, getProp, searchProps } from '@/props/catalog';
import type { PropCategory, PropDef } from '@/props/types';
import { Chip } from '../../atoms/Chip';
import Input from '../../atoms/Input';
import { PanelSection } from '../../molecules/PanelSection';
import { MyProps } from './MyProps';
import { PropCard, propThumb } from './PropCard';
import { PropInspector } from './PropInspector';
import { PropSceneTools } from './PropSceneTools';

/**
 * Left rail "Scene Objects" (docs/PROPS.md): manga scenery by category, with search across all of them.
 * A click places the prop at the view centre; dragging a card drops it where it lands.
 */
type View = PropCategory | 'favorites' | 'recent' | 'mine';

/** Saved ids that are still in the catalogue, in order. */
const known = (ids: readonly string[]) =>
    ids.map((id) => getProp(id)).filter((p): p is PropDef => !!p);

export default function SceneObjectsPanel() {
    const { addProp, favorites, recent, toggleFavorite } = useStore(
        useShallow((s) => ({
            addProp: s.addProp,
            favorites: s.propFavorites,
            recent: s.propRecent,
            toggleFavorite: s.togglePropFavorite,
        })),
    );
    const favList = useMemo(() => known(favorites ?? []), [favorites]);
    const recentList = useMemo(() => known(recent ?? []), [recent]);
    const [picked, setPicked] = useState<View>(() =>
        favList.length ? 'favorites' : PROP_CATEGORIES[0].id,
    );
    // an emptied Favorites / Recent view falls back to the first category
    const view: View =
        (picked === 'favorites' && !favList.length) || (picked === 'recent' && !recentList.length)
            ? PROP_CATEGORIES[0].id
            : picked;
    const [query, setQuery] = useState('');
    const searching = query.trim().length > 0;
    const list = useMemo(() => {
        if (searching) return searchProps(query);
        if (view === 'favorites') return favList;
        if (view === 'recent') return recentList;
        if (view === 'mine') return [];
        return searchProps('', view);
    }, [query, searching, view, favList, recentList]);
    const starred = useMemo(() => new Set(favorites ?? []), [favorites]);
    // thumbnails drawn once per panel visit
    const thumbs = useMemo(() => new Map<string, string>(), []);
    const src = (p: PropDef) => {
        if (!thumbs.has(p.id)) thumbs.set(p.id, propThumb(p));
        return thumbs.get(p.id)!;
    };

    return (
        <div className="flex flex-col gap-4">
            <PropInspector />
            <PanelSection
                title="Scene Objects"
                description="Manga scenery: click to add, or drag onto the page. Move, scale, turn and animate it like any object."
            >
                <Input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search trees, clouds, moon…"
                    aria-label="Search scene objects"
                    leadingIcon="magnifying-glass"
                />
                {!searching && (
                    <div role="group" aria-label="Category" className="flex flex-wrap gap-1.5">
                        {favList.length > 0 && (
                            <Chip
                                icon="star"
                                active={view === 'favorites'}
                                onClick={() => setPicked('favorites')}
                            >
                                Favorites
                            </Chip>
                        )}
                        {recentList.length > 0 && (
                            <Chip active={view === 'recent'} onClick={() => setPicked('recent')}>
                                Recent
                            </Chip>
                        )}
                        <Chip
                            icon="upload"
                            active={view === 'mine'}
                            onClick={() => setPicked('mine')}
                        >
                            My props
                        </Chip>
                        {PROP_CATEGORIES.map((c) => (
                            <Chip key={c.id} active={c.id === view} onClick={() => setPicked(c.id)}>
                                {c.label}
                            </Chip>
                        ))}
                    </div>
                )}
                {!searching && view === 'mine' ? (
                    <MyProps />
                ) : list.length ? (
                    <ul aria-label="Scene objects" className="grid grid-cols-3 gap-1.5">
                        {list.map((p) => (
                            <PropCard
                                key={p.id}
                                prop={p}
                                src={src(p)}
                                onAdd={() => void addProp(p.id)}
                                starred={starred.has(p.id)}
                                onStar={() => toggleFavorite(p.id)}
                            />
                        ))}
                    </ul>
                ) : (
                    <p className="text-caption text-ink-muted">
                        No scene objects match “{query.trim()}”.
                    </p>
                )}
            </PanelSection>
            <PropSceneTools />
        </div>
    );
}
