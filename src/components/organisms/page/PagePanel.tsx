import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { IconButton } from '@/components/atoms/IconButton';
import { EmptyState } from '@/components/molecules/EmptyState';
import { PanelSection } from '@/components/molecules/PanelSection';

import { canvasKeysBlocked } from '@/lib/keyboard/modalOpen';
import { useStore } from '@store'; // your combined zustand hook
import type { Page } from '@/store/slices/createPagesSlice';
import { PaintTargetSwatch } from '../../molecules/PaintTargetSwatch';
import { PageCard } from './PageCard';

const isTypingTarget = (el: EventTarget | null) => {
    const node = el as HTMLElement | null;
    if (!node) return false;
    const tag = node.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
};

/* -------------------------------- panel -------------------------------- */

export default function PagePanel() {
    const canvas = useStore((s) => s.canvas);

    const pages = useStore((s) => s.pages);
    const currentPageId = useStore((s) => s.currentPageId);
    const isPageSwitching = useStore((s) => s.isPageSwitching);

    const initPages = useStore((s) => s.initPages);
    const addPage = useStore((s) => s.addPage);
    const duplicatePage = useStore((s) => s.duplicatePage);
    const deletePage = useStore((s) => s.deletePage);
    const renamePage = useStore((s) => s.renamePage);
    const movePage = useStore((s) => s.movePage);
    const switchPage = useStore((s) => s.switchPage);
    const goToNextPage = useStore((s) => s.goToNextPage);
    const goToPrevPage = useStore((s) => s.goToPrevPage);
    const saveCurrentPage = useStore((s) => s.saveCurrentPage);
    const clearCurrentPage = useStore((s) => s.clearCurrentPage);
    const confirmDialog = useStore((s) => s.confirmDialog);

    const selectedPreset = useStore((s) => s.selectedPreset);
    const pageBackground = useStore((s) => s.pageBackground);
    const setPageBackground = useStore((s) => s.setPageBackground);

    const [dragId, setDragId] = useState<string | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const currentIndex = pages.findIndex((p) => p.id === currentPageId);

    /* ---- adopt the canvas as Page 1 + debounced autosave (keeps thumbnails fresh) ---- */

    const scheduleSave = useCallback(() => {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => saveCurrentPage(), 500);
    }, [saveCurrentPage]);

    useEffect(() => {
        if (!canvas) return;
        initPages();

        const onChange = () => {
            if (useStore.getState().isPageSwitching) return;
            scheduleSave();
        };
        canvas.on('object:added', onChange);
        canvas.on('object:removed', onChange);
        canvas.on('object:modified', onChange);
        canvas.on('path:created', onChange);
        return () => {
            clearTimeout(saveTimer.current);
            canvas.off('object:added', onChange);
            canvas.off('object:removed', onChange);
            canvas.off('object:modified', onChange);
            canvas.off('path:created', onChange);
        };
    }, [canvas, initPages, scheduleSave]);

    /* ---- PageUp / PageDown to move between pages ---- */

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (isTypingTarget(e.target) || canvasKeysBlocked()) return;
            const active = canvas?.getActiveObject() as { isEditing?: boolean } | undefined;
            if (active?.isEditing) return;
            if (e.key === 'PageDown') {
                e.preventDefault();
                void goToNextPage();
            } else if (e.key === 'PageUp') {
                e.preventDefault();
                void goToPrevPage();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [canvas, goToNextPage, goToPrevPage]);

    /* -------------------------------- handlers -------------------------------- */

    const handleDelete = async (id: string, name: string) => {
        if (pages.length <= 1) return;
        const ok = await confirmDialog({
            title: `Delete "${name}"?`,
            message: "This page and everything on it will be removed. This can't be undone.",
            confirmLabel: 'Delete page',
            tone: 'danger',
        });
        if (!ok) return;
        await deletePage(id);
    };

    const handleClear = async () => {
        const ok = await confirmDialog({
            title: 'Clear this page?',
            message: 'Every object on this page will be removed.',
            confirmLabel: 'Clear page',
            tone: 'danger',
        });
        if (!ok) return;
        clearCurrentPage();
    };

    const bgValue = /^#[0-9a-f]{6}$/i.test(pageBackground) ? pageBackground : '#ffffff';

    /* --------------------------------- render --------------------------------- */

    // the open page's live size; other pages keep the size they were saved with
    const ratioOf = (page: Page, active: boolean) => {
        const size = (!active && page.preset) || selectedPreset || page.preset;
        return size ? `${size.width} / ${size.height}` : '4 / 3';
    };
    const endDrag = () => {
        setDragId(null);
        setOverIndex(null);
    };

    return (
        <div className="flex h-full min-h-0 flex-col">
            {/* Navigation + add */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-3">
                <div className="flex items-center rounded-md bg-surface-strong p-0.5">
                    <IconButton
                        icon={<Icon name="chevron-left" />}
                        title="Previous page (PageUp)"
                        aria-label="Previous page (PageUp)"
                        onClick={() => void goToPrevPage()}
                        disabled={currentIndex <= 0 || isPageSwitching}
                    />
                    <span
                        aria-live="polite"
                        className="min-w-[3.75rem] text-center text-xs font-medium tabular-nums text-ink"
                    >
                        {currentIndex + 1 > 0 ? currentIndex + 1 : '–'} of {pages.length}
                    </span>
                    <IconButton
                        icon={<Icon name="chevron-right" />}
                        title="Next page (PageDown)"
                        aria-label="Next page (PageDown)"
                        onClick={() => void goToNextPage()}
                        disabled={
                            currentIndex === -1 ||
                            currentIndex >= pages.length - 1 ||
                            isPageSwitching
                        }
                    />
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    icon="plus"
                    onClick={() => void addPage()}
                    disabled={isPageSwitching}
                >
                    Add page
                </Button>
            </div>

            {/* Page grid (scrolls; toolbar and page settings stay put) */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                {pages.length === 0 ? (
                    <EmptyState
                        icon="file-lines"
                        title="No pages yet"
                        description="Add a page to start a multi-page project."
                    />
                ) : (
                    <ul
                        aria-label="Pages"
                        aria-busy={isPageSwitching || undefined}
                        className={clsx(
                            'grid grid-cols-2 items-start gap-x-3 gap-y-4',
                            isPageSwitching && 'pointer-events-none opacity-60',
                        )}
                        onDragLeave={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node))
                                setOverIndex(null);
                        }}
                    >
                        {pages.map((page, index) => {
                            const active = page.id === currentPageId;
                            return (
                                <PageCard
                                    key={page.id}
                                    page={page}
                                    index={index}
                                    active={active}
                                    aspectRatio={ratioOf(page, active)}
                                    canDelete={pages.length > 1}
                                    dragging={dragId === page.id}
                                    dropTarget={
                                        overIndex === index && !!dragId && dragId !== page.id
                                    }
                                    onOpen={() => void switchPage(page.id)}
                                    onRename={(name) => renamePage(page.id, name)}
                                    onDuplicate={() => void duplicatePage(page.id)}
                                    onDelete={() => void handleDelete(page.id, page.name)}
                                    onDragStart={(e) => {
                                        setDragId(page.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(e) => {
                                        if (!dragId) return;
                                        e.preventDefault();
                                        setOverIndex(index);
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (dragId) movePage(dragId, index);
                                        endDrag();
                                    }}
                                    onDragEnd={endDrag}
                                />
                            );
                        })}
                    </ul>
                )}
                {pages.length > 1 && (
                    <p className="mt-4 text-caption text-ink-muted">
                        Drag a page to reorder. PageUp / PageDown switch pages.
                    </p>
                )}
            </div>

            {/* The open page. Size: Settings > Canvas; zoom: footer; export: Export tab */}
            <div className="flex shrink-0 flex-col gap-3 border-t border-line px-4 py-3">
                <PanelSection title="This page">
                    <div className="flex items-center justify-between gap-2">
                        <PaintTargetSwatch
                            id="page-background"
                            label="Page background"
                            value={bgValue}
                            showLabel
                            onChange={(hex) => {
                                setPageBackground(hex);
                                scheduleSave();
                            }}
                        />
                        <Button
                            variant="danger-outline"
                            size="sm"
                            icon="eraser"
                            onClick={handleClear}
                        >
                            Clear page
                        </Button>
                    </div>
                </PanelSection>
            </div>
        </div>
    );
}
