import clsx from 'clsx';
import { useMemo } from 'react';
import { castRecipes } from '@/character/data/cast';
import { RECIPES, fromRecipe } from '@/character/data/recipes';
import type { Character } from '@/character/schema/types';
import { FOCUS_RING } from '../../atoms/control.styles';
import { CharacterThumb } from './CharacterView';

/** The 12 recipe characters as cards (thumbnails rendered once). */
export function useRecipeCast(): Character[] {
    return useMemo(() => RECIPES.map((r) => fromRecipe(r, `recipe-${r.id}`)), []);
}

/** All 100 people as characters (built once). */
export function useCastCharacters(): Character[] {
    return useMemo(() => castRecipes().map((r) => fromRecipe(r, `recipe-${r.id}`)), []);
}

/** Character cards: thumbnail, name, role or age. */
export function CastGrid({
    cast,
    onPick,
    label,
    columns = 3,
    activeId,
    renderAction,
}: {
    cast: Character[];
    onPick: (c: Character) => void;
    label: (c: Character) => string;
    columns?: 2 | 3;
    activeId?: string;
    renderAction?: (c: Character) => React.ReactNode;
}) {
    const recipes = useMemo(() => new Map(castRecipes().map((r) => [r.id, r])), []);
    return (
        <ul className={clsx('grid gap-1.5', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
            {cast.map((c) => {
                const recipe = recipes.get(c.recipeRef ?? '');
                return (
                    <li key={c.id} className="relative">
                        <button
                            type="button"
                            onClick={() => onPick(c)}
                            title={label(c)}
                            aria-pressed={activeId === c.id ? true : undefined}
                            className={clsx(
                                'flex w-full flex-col items-center rounded-md border p-1 text-[11px] text-ink transition-colors hover:bg-surface-strong',
                                FOCUS_RING,
                                activeId === c.id
                                    ? 'border-primary-500 bg-surface-strong'
                                    : 'border-line',
                            )}
                        >
                            <span className="h-20 w-full">
                                <CharacterThumb character={c} />
                            </span>
                            <span className="w-full truncate font-medium">{c.name}</span>
                            <span className="w-full truncate text-ink-muted">
                                {recipe?.role ?? `${Math.round(c.body.age)} years`}
                            </span>
                        </button>
                        {renderAction?.(c)}
                    </li>
                );
            })}
        </ul>
    );
}

export default CastGrid;
