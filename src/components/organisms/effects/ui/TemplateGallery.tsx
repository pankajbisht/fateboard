import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { SIZE_PRESETS } from '../sizePresets';
import { useStore } from '@/store';
import type { DesignTemplate, DesignTemplateCategory } from '../designTemplate.types';
import Button from '@/components/atoms/Button';

/* -------------------------------------------------------------------------- */
/* Constants & helpers                                                        */
/* -------------------------------------------------------------------------- */

const CATEGORIES: Array<DesignTemplateCategory | 'All'> = [
    'All',
    'YouTube',
    'Instagram',
    'Social',
    'Poster',
    'Presentation',
    'Marketing',
];

const SEARCH_DEBOUNCE_MS = 250;

// Built once instead of calling SIZE_PRESETS.find() on every render/card.
const SIZE_BY_ID = new Map(SIZE_PRESETS.map((preset) => [preset.id, preset]));

const getSizeLabel = (sizeId: string) => {
    const size = SIZE_BY_ID.get(sizeId);
    return size ? `${size.width} × ${size.height}` : sizeId;
};

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* -------------------------------------------------------------------------- */
/* Template Gallery                                                           */
/* -------------------------------------------------------------------------- */

interface TemplateGalleryProps {
    className?: string;
    /** Pass true while templates are being fetched to show a skeleton. */
    loading?: boolean;
}

export default function TemplateGallery({ className = '', loading = false }: TemplateGalleryProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<DesignTemplate | null>(null);
    const [showFavorites, setShowFavorites] = useState(false);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [applyError, setApplyError] = useState<string | null>(null);

    const {
        designTemplates,
        designTemplateSearch,
        setDesignTemplateSearch,
        designTemplateCategory,
        setDesignTemplateCategory,
        designTemplateSizeId,
        setDesignTemplateSize,
        favoriteDesignTemplateIds,
        toggleFavoriteDesignTemplate,
        applyDesignTemplate,
    } = useStore(
        useShallow((state) => ({
            designTemplates: state.designTemplates,
            designTemplateSearch: state.designTemplateSearch,
            setDesignTemplateSearch: state.setDesignTemplateSearch,
            designTemplateCategory: state.designTemplateCategory,
            setDesignTemplateCategory: state.setDesignTemplateCategory,
            designTemplateSizeId: state.designTemplateSizeId,
            setDesignTemplateSize: state.setDesignTemplateSize,
            favoriteDesignTemplateIds: state.favoriteDesignTemplateIds,
            toggleFavoriteDesignTemplate: state.toggleFavoriteDesignTemplate,
            applyDesignTemplate: state.applyDesignTemplate,
        })),
    );

    /* ----------------------------- Debounced search ---------------------------- */

    const [searchInput, setSearchInput] = useState(designTemplateSearch);

    useEffect(() => {
        if (searchInput === designTemplateSearch) return;

        const timer = window.setTimeout(
            () => setDesignTemplateSearch(searchInput),
            SEARCH_DEBOUNCE_MS,
        );

        return () => window.clearTimeout(timer);
    }, [searchInput, designTemplateSearch, setDesignTemplateSearch]);

    const clearSearch = () => {
        setSearchInput('');
        setDesignTemplateSearch('');
    };

    /* -------------------------------- Filtering -------------------------------- */

    const favoriteSet = useMemo(
        () => new Set(favoriteDesignTemplateIds),
        [favoriteDesignTemplateIds],
    );

    const filteredTemplates = useMemo(() => {
        const search = designTemplateSearch.trim().toLowerCase();

        const matches = designTemplates.filter((template) => {
            const tags = template.tags ?? [];

            const matchesSearch =
                !search ||
                template.name.toLowerCase().includes(search) ||
                template.description?.toLowerCase().includes(search) ||
                tags.some((tag) => tag.toLowerCase().includes(search));

            const matchesCategory =
                designTemplateCategory === 'All' || template.category === designTemplateCategory;

            const matchesSize =
                designTemplateSizeId === 'All' || template.sizeId === designTemplateSizeId;

            const matchesFavorite = !showFavorites || favoriteSet.has(template.id);

            return matchesSearch && matchesCategory && matchesSize && matchesFavorite;
        });

        // Featured first (Array.prototype.sort is stable, so other order is kept).
        return [...matches].sort(
            (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
        );
    }, [
        designTemplates,
        designTemplateSearch,
        designTemplateCategory,
        designTemplateSizeId,
        showFavorites,
        favoriteSet,
    ]);

    /* --------------------------------- Handlers -------------------------------- */

    const handleApplyTemplate = async (template: DesignTemplate) => {
        if (applyingId) return;

        setApplyingId(template.id);
        setApplyError(null);

        try {
            await applyDesignTemplate(template.id);
            setSelectedTemplate(null);
        } catch (error) {
            console.error('Failed to apply template', error);
            setApplyError('Could not apply this template. Please try again.');
        } finally {
            setApplyingId(null);
        }
    };

    const closePreview = useCallback(() => {
        setSelectedTemplate(null);
        setApplyError(null);
    }, []);

    const clearAllFilters = () => {
        clearSearch();
        setShowFavorites(false);
        setDesignTemplateCategory('All');
        setDesignTemplateSize('All');
    };

    const count = filteredTemplates.length;

    const getTemplateCode = () => {
        const template = useStore.getState().saveCanvasAsTemplate({
            id: crypto.randomUUID(),
            name: 'My Design',
            category: 'Social',
            sizeId: 'instagram-square',
            thumbnail: '',
            tags: ['custom'],
        });

        console.log(template);
    };

    return (
        <section className={`flex h-full min-h-0 flex-col bg-white ${className}`}>
            {
                // <Button onClick={getTemplateCode}>Convert<Button>
            }
            {/* Header */}
            <div className="shrink-0 border-b border-gray-200 bg-white">
                <div className="px-5 pb-4 pt-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                                <i className="fa-solid fa-layer-group text-sm" aria-hidden />
                            </div>

                            <div>
                                <h2 className="text-[15px] font-semibold text-gray-900">
                                    Design Templates
                                </h2>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    Start with a professionally designed layout
                                </p>
                            </div>
                        </div>

                        <div
                            className="hidden shrink-0 items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 sm:flex"
                            aria-live="polite"
                        >
                            <i className="fa-solid fa-star text-[10px]" aria-hidden />
                            <span>
                                {count} {count === 1 ? 'template' : 'templates'}
                            </span>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative mt-4">
                        <i
                            className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400"
                            aria-hidden
                        />

                        <input
                            type="search"
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
                            placeholder="Search templates..."
                            aria-label="Search templates"
                            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-9 text-[13px] text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 [&::-webkit-search-cancel-button]:appearance-none"
                        />

                        {searchInput && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                                aria-label="Clear search"
                            >
                                <i className="fa-solid fa-xmark text-[11px]" aria-hidden />
                            </button>
                        )}
                    </div>
                </div>

                {/* Category filters */}
                <div
                    className="flex items-center gap-2 overflow-x-auto px-5 pb-4"
                    role="group"
                    aria-label="Filter by category"
                >
                    {CATEGORIES.map((category) => {
                        const active = designTemplateCategory === category;

                        return (
                            <button
                                key={category}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setDesignTemplateCategory(category)}
                                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                                    active
                                        ? 'bg-gray-900 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                                }`}
                            >
                                {category}
                            </button>
                        );
                    })}
                </div>

                {/* Secondary filters */}
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <label
                            htmlFor="template-size-filter"
                            className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-gray-500"
                        >
                            Size
                        </label>

                        <select
                            id="template-size-filter"
                            value={designTemplateSizeId}
                            onChange={(event) => setDesignTemplateSize(event.target.value)}
                            className="h-8 min-w-0 max-w-[180px] rounded-lg border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                        >
                            <option value="All">All sizes</option>

                            {SIZE_PRESETS.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                    {preset.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="button"
                        aria-pressed={showFavorites}
                        onClick={() => setShowFavorites((value) => !value)}
                        className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                            showFavorites
                                ? 'border-red-200 bg-red-50 text-red-500'
                                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'
                        }`}
                    >
                        <i
                            className={`${
                                showFavorites ? 'fa-solid fa-heart' : 'fa-regular fa-heart'
                            } text-[11px]`}
                            aria-hidden
                        />
                        <span>Favorites</span>
                    </button>
                </div>
            </div>

            {/* Gallery */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {applyError && !selectedTemplate && (
                    <div
                        role="alert"
                        className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
                    >
                        {applyError}
                    </div>
                )}

                {loading ? (
                    <GallerySkeleton />
                ) : count === 0 ? (
                    <EmptyState
                        search={designTemplateSearch}
                        favorites={showFavorites}
                        onClear={clearAllFilters}
                    />
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4 p-5">
                        {filteredTemplates.map((template) => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                isFavorite={favoriteSet.has(template.id)}
                                sizeLabel={getSizeLabel(template.sizeId)}
                                applying={applyingId === template.id}
                                disabled={applyingId !== null}
                                onPreview={() => setSelectedTemplate(template)}
                                onFavorite={() => toggleFavoriteDesignTemplate(template.id)}
                                onUse={() => handleApplyTemplate(template)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {selectedTemplate && (
                <TemplatePreviewModal
                    template={selectedTemplate}
                    isFavorite={favoriteSet.has(selectedTemplate.id)}
                    sizeLabel={getSizeLabel(selectedTemplate.sizeId)}
                    applying={applyingId === selectedTemplate.id}
                    disabled={applyingId !== null}
                    error={applyError}
                    onClose={closePreview}
                    onFavorite={() => toggleFavoriteDesignTemplate(selectedTemplate.id)}
                    onUse={() => handleApplyTemplate(selectedTemplate)}
                />
            )}
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Template Image (with error fallback)                                       */
/* -------------------------------------------------------------------------- */

interface TemplateImageProps {
    src: string;
    alt: string;
    /** Fill the parent (cards) instead of sizing to the image (modal). */
    fill?: boolean;
    className?: string;
}

function TemplateImage({ src, alt, fill = false, className = '' }: TemplateImageProps) {
    const [failed, setFailed] = useState(false);

    if (failed) {
        return (
            <div
                className={`flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 ${
                    fill ? 'absolute inset-0' : 'min-h-[240px] w-full min-w-[240px]'
                }`}
            >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-400 shadow-sm">
                    <i className="fa-solid fa-image text-sm" aria-hidden />
                </div>
                <span className="mt-2 text-[11px] font-medium text-gray-500">
                    Preview unavailable
                </span>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className={`${fill ? 'absolute inset-0 h-full w-full' : 'block'} ${className}`}
        />
    );
}

/* -------------------------------------------------------------------------- */
/* Template Card                                                              */
/* -------------------------------------------------------------------------- */

interface TemplateCardProps {
    template: DesignTemplate;
    isFavorite: boolean;
    sizeLabel: string;
    applying: boolean;
    disabled: boolean;
    onPreview: () => void;
    onFavorite: () => void;
    onUse: () => void;
}

function TemplateCard({
    template,
    isFavorite,
    sizeLabel,
    applying,
    disabled,
    onPreview,
    onFavorite,
    onUse,
}: TemplateCardProps) {
    const tags = template.tags ?? [];

    return (
        <div className="group min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg">
            {/* Preview: fixed ratio so every card in a row has the same height */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-gray-100">
                <TemplateImage fill src={template.thumbnail} alt="" className="object-contain" />

                {/* Whole-area preview trigger (a real button, keyboard accessible) */}
                <button
                    type="button"
                    onClick={onPreview}
                    aria-label={`Preview ${template.name}`}
                    className="absolute inset-0 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-400"
                />

                {/* Hover overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" />

                {/* Featured */}
                {template.featured && (
                    <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-gray-700 shadow-sm backdrop-blur">
                        <i className="fa-solid fa-star text-[10px] text-indigo-500" aria-hidden />
                        Featured
                    </div>
                )}

                {/* Favorite: visible on hover/focus, and always on touch devices */}
                <button
                    type="button"
                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    aria-pressed={isFavorite}
                    onClick={onFavorite}
                    className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                        isFavorite
                            ? 'bg-white text-red-500 shadow-sm'
                            : 'bg-black/35 text-white opacity-0 hover:bg-white hover:text-red-500 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100'
                    }`}
                >
                    <i
                        className={`${
                            isFavorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart'
                        } text-xs`}
                        aria-hidden
                    />
                </button>

                {/* Preview hint (visual only; the button above handles the click) */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                    <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-[11px] font-semibold text-gray-800 shadow-lg">
                        <i className="fa-solid fa-image text-[11px]" aria-hidden />
                        Preview
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-3.5">
                <h3 className="truncate text-[13px] font-semibold text-gray-900">
                    {template.name}
                </h3>

                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500">
                    <span>{template.category}</span>
                    <span className="text-gray-300" aria-hidden>
                        •
                    </span>
                    <span>{sizeLabel}</span>
                </div>

                {template.description && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">
                        {template.description}
                    </p>
                )}

                {tags.length > 0 && (
                    <div className="mt-3 flex gap-1 overflow-hidden">
                        {tags.slice(0, 2).map((tag) => (
                            <span
                                key={tag}
                                className="truncate rounded-md bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-500"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <button
                    type="button"
                    onClick={onUse}
                    disabled={disabled}
                    aria-busy={applying}
                    className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 text-[11px] font-semibold text-white transition hover:bg-gray-800 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <i
                        className={`${
                            applying
                                ? 'fa-solid fa-spinner fa-spin'
                                : 'fa-solid fa-wand-magic-sparkles'
                        } text-[11px]`}
                        aria-hidden
                    />
                    {applying ? 'Applying…' : 'Use template'}
                </button>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Loading skeleton                                                           */
/* -------------------------------------------------------------------------- */

function GallerySkeleton() {
    return (
        <div
            className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4 p-5"
            aria-busy="true"
            aria-label="Loading templates"
        >
            {Array.from({ length: 8 }).map((_, index) => (
                <div
                    key={index}
                    className="animate-pulse overflow-hidden rounded-2xl border border-gray-200 bg-white"
                >
                    <div className="aspect-[4/3] w-full bg-gray-100" />
                    <div className="space-y-2 p-3.5">
                        <div className="h-3 w-2/3 rounded bg-gray-100" />
                        <div className="h-3 w-1/3 rounded bg-gray-100" />
                        <div className="mt-3 h-9 w-full rounded-lg bg-gray-100" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Empty State                                                                */
/* -------------------------------------------------------------------------- */

interface EmptyStateProps {
    search: string;
    favorites: boolean;
    onClear: () => void;
}

function EmptyState({ search, favorites, onClear }: EmptyStateProps) {
    return (
        <div className="flex h-full min-h-[400px] items-center justify-center p-8">
            <div className="max-w-sm text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                    <i
                        className={`fa-solid ${
                            favorites ? 'fa-heart' : 'fa-magnifying-glass'
                        } text-lg`}
                        aria-hidden
                    />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-gray-900">No templates found</h3>

                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                    {favorites
                        ? 'You have not saved any templates to your favorites yet.'
                        : search
                          ? `No templates match "${search}".`
                          : 'Try changing your filters to find more templates.'}
                </p>

                <button
                    type="button"
                    onClick={onClear}
                    className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
                >
                    Clear filters
                </button>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Preview Modal                                                              */
/* -------------------------------------------------------------------------- */

interface TemplatePreviewModalProps {
    template: DesignTemplate;
    isFavorite: boolean;
    sizeLabel: string;
    applying: boolean;
    disabled: boolean;
    error: string | null;
    onClose: () => void;
    onFavorite: () => void;
    onUse: () => void;
}

function TemplatePreviewModal({
    template,
    isFavorite,
    sizeLabel,
    applying,
    disabled,
    error,
    onClose,
    onFavorite,
    onUse,
}: TemplatePreviewModalProps) {
    const titleId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Keep the latest onClose without re-running the focus/scroll effect.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const tags = template.tags ?? [];
    const preset = SIZE_BY_ID.get(template.sizeId);

    useEffect(() => {
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = 'hidden';
        closeButtonRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onCloseRef.current();
                return;
            }

            if (event.key !== 'Tab') return;

            const root = dialogRef.current;
            if (!root) return;

            const focusable = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = previousOverflow;
            previouslyFocused?.focus?.();
        };
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-y-auto rounded-2xl bg-white shadow-2xl md:flex-row md:overflow-hidden"
            >
                {/* Large preview */}
                <div className="flex min-h-[200px] min-w-0 flex-1 items-center justify-center bg-gray-100 p-4 md:p-6">
                    <div className="relative max-h-full max-w-full overflow-hidden rounded-xl shadow-lg">
                        <TemplateImage
                            src={template.preview ?? template.thumbnail}
                            alt={template.name}
                            className="max-h-[50vh] max-w-full object-contain md:max-h-[78vh]"
                        />
                    </div>
                </div>

                {/* Details */}
                <div className="flex w-full shrink-0 flex-col border-t border-gray-200 bg-white md:w-[320px] md:border-l md:border-t-0">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                            Template details
                        </span>

                        <button
                            ref={closeButtonRef}
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400"
                            aria-label="Close preview"
                        >
                            <i className="fa-solid fa-xmark text-sm" aria-hidden />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="min-h-0 flex-1 p-5 md:overflow-y-auto">
                        <div className="flex items-center gap-2">
                            <span className="rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-600">
                                {template.category}
                            </span>

                            {template.featured && (
                                <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-600">
                                    <i className="fa-solid fa-star text-[10px]" aria-hidden />
                                    Featured
                                </span>
                            )}
                        </div>

                        <h2
                            id={titleId}
                            className="mt-3 text-lg font-semibold tracking-tight text-gray-900"
                        >
                            {template.name}
                        </h2>

                        {template.description && (
                            <p className="mt-2 text-xs leading-relaxed text-gray-500">
                                {template.description}
                            </p>
                        )}

                        {/* Size */}
                        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-3.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
                                    Canvas size
                                </span>
                                <i
                                    className="fa-solid fa-ruler-combined text-[11px] text-gray-400"
                                    aria-hidden
                                />
                            </div>

                            <div className="mt-1.5 text-sm font-semibold text-gray-800">
                                {sizeLabel}
                            </div>

                            {preset && (
                                <div className="mt-1 text-[11px] text-gray-500">{preset.label}</div>
                            )}
                        </div>

                        {/* Tags */}
                        {tags.length > 0 && (
                            <div className="mt-5">
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                    Tags
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-md bg-gray-100 px-2 py-1 text-[11px] font-medium text-gray-600"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Editable info */}
                        <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5">
                            <div className="flex items-start gap-2.5">
                                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-indigo-600">
                                    <i
                                        className="fa-solid fa-pen-to-square text-[11px]"
                                        aria-hidden
                                    />
                                </div>

                                <div>
                                    <div className="text-xs font-semibold text-gray-800">
                                        Fully editable
                                    </div>
                                    <p className="mt-1 text-[11px] leading-relaxed text-gray-500">
                                        Text, images, shapes and other elements can be edited after
                                        applying the template.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-100 p-4">
                        {error && (
                            <div
                                role="alert"
                                className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600"
                            >
                                {error}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={onUse}
                            disabled={disabled}
                            aria-busy={applying}
                            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gray-900 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <i
                                className={`${
                                    applying
                                        ? 'fa-solid fa-spinner fa-spin'
                                        : 'fa-solid fa-wand-magic-sparkles'
                                } text-[11px]`}
                                aria-hidden
                            />
                            {applying ? 'Applying…' : 'Use this template'}
                        </button>

                        <button
                            type="button"
                            onClick={onFavorite}
                            aria-pressed={isFavorite}
                            className={`mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-xl border text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400 ${
                                isFavorite
                                    ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <i
                                className={`${
                                    isFavorite ? 'fa-solid fa-heart' : 'fa-regular fa-heart'
                                } text-[11px]`}
                                aria-hidden
                            />
                            {isFavorite ? 'Saved to favorites' : 'Save to favorites'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
