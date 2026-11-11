import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { IconButton } from '@/components/atoms/IconButton';
import { Input } from '@/components/atoms/Input';
import { EmptyState } from '@/components/molecules/EmptyState';
import { PanelSection } from '@/components/molecules/PanelSection';

import { canvasKeysBlocked } from '@/lib/keyboard/modalOpen';
import { useStore } from '@store'; // your combined zustand hook
import { PaintTargetSwatch } from '../../molecules/PaintTargetSwatch';

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

    const pageBackground = useStore((s) => s.pageBackground);
    const setPageBackground = useStore((s) => s.setPageBackground);

    const [editingId, setEditingId] = useState<string | null>(null);
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

    const commitRename = (id: string, value: string) => {
        renamePage(id, value);
        setEditingId(null);
    };

    const bgValue = /^#[0-9a-f]{6}$/i.test(pageBackground) ? pageBackground : '#ffffff';

    /* --------------------------------- render --------------------------------- */

    return (
        <>
            {/* Navigation */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                    <IconButton
                        icon={<Icon name="chevron-left" />}
                        title="Previous page (PageUp)"
                        aria-label="Previous page (PageUp)"
                        onClick={() => void goToPrevPage()}
                        disabled={currentIndex <= 0 || isPageSwitching}
                    />
                    <span className="min-w-[4.5rem] text-center text-xs font-medium tabular-nums text-ink">
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
                    icon="file-plus"
                    onClick={() => void addPage()}
                    disabled={isPageSwitching}
                >
                    Add page
                </Button>
            </div>

            {/* Page list */}
            <div
                className={clsx(
                    'flex flex-col gap-2',
                    isPageSwitching && 'pointer-events-none opacity-60',
                )}
                onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverIndex(null);
                }}
            >
                {pages.length === 0 && (
                    <EmptyState
                        icon="file-lines"
                        title="No pages yet"
                        description="Add a page to start a multi-page project."
                    />
                )}

                {pages.map((page, index) => {
                    const active = page.id === currentPageId;
                    return (
                        <div
                            key={page.id}
                            draggable={editingId !== page.id}
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
                                setDragId(null);
                                setOverIndex(null);
                            }}
                            onDragEnd={() => {
                                setDragId(null);
                                setOverIndex(null);
                            }}
                            className={clsx(
                                'group rounded-lg border p-2 transition-colors',
                                active
                                    ? 'border-primary-500 bg-primary-50'
                                    : 'border-line bg-surface hover:border-line-strong',
                                overIndex === index &&
                                    dragId &&
                                    dragId !== page.id &&
                                    'ring-2 ring-primary-400/50',
                                dragId === page.id && 'opacity-50',
                            )}
                        >
                            <button
                                type="button"
                                onClick={() => void switchPage(page.id)}
                                aria-current={active ? 'page' : undefined}
                                aria-label={`Open ${page.name}`}
                                className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-md bg-surface-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60"
                            >
                                {page.thumbnail ? (
                                    <img
                                        src={page.thumbnail}
                                        alt=""
                                        draggable={false}
                                        className="max-h-full max-w-full object-contain shadow-sm"
                                        style={{ backgroundColor: page.background }}
                                    />
                                ) : (
                                    <span className="text-caption text-ink-subtle">Empty</span>
                                )}
                                <span className="absolute left-1.5 top-1.5 rounded bg-surface/90 px-1.5 text-[11px] font-semibold tabular-nums text-ink-muted shadow-sm">
                                    {index + 1}
                                </span>
                            </button>

                            <div className="mt-2 flex items-center gap-1">
                                <Icon
                                    name="grip-lines-vertical"
                                    className="shrink-0 cursor-grab text-ink-subtle"
                                />
                                {editingId === page.id ? (
                                    <Input
                                        autoFocus
                                        size="sm"
                                        defaultValue={page.name}
                                        aria-label="Page name"
                                        onFocus={(e) => e.currentTarget.select()}
                                        onBlur={(e) => commitRename(page.id, e.currentTarget.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter')
                                                commitRename(page.id, e.currentTarget.value);
                                            if (e.key === 'Escape') setEditingId(null);
                                        }}
                                    />
                                ) : (
                                    <span
                                        className="min-w-0 flex-1 truncate text-xs font-medium text-ink"
                                        title="Double-click to rename"
                                        onDoubleClick={() => setEditingId(page.id)}
                                    >
                                        {page.name}
                                    </span>
                                )}
                                <div className="flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                    <IconButton
                                        size="sm"
                                        icon={<Icon name="copy" />}
                                        title="Duplicate page"
                                        aria-label="Duplicate page"
                                        onClick={() => void duplicatePage(page.id)}
                                    />
                                    <IconButton
                                        size="sm"
                                        tone="danger"
                                        icon={<Icon name="trash-can" />}
                                        title="Delete page"
                                        aria-label="Delete page"
                                        disabled={pages.length <= 1}
                                        onClick={() => void handleDelete(page.id, page.name)}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* canvas size lives in Settings > Canvas; zoom in the footer (one place each) */}
            <PanelSection title="Page">
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
            </PanelSection>

            {/* export: right dock "Export" tab; save / open: top bar File (whole project) */}
            <PanelSection title="Page actions">
                <Button variant="danger-outline" size="sm" icon="eraser" onClick={handleClear}>
                    Clear page
                </Button>
            </PanelSection>
        </>
    );
}
