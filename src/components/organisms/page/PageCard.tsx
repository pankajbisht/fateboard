import { useEffect, useRef, useState, type DragEvent } from 'react';
import clsx from 'clsx';

import { Icon } from '@/components/atoms/Icon';
import { IconButton } from '@/components/atoms/IconButton';
import { Input } from '@/components/atoms/Input';
import { FOCUS_RING } from '@/components/atoms/control.styles';
import type { Page } from '@/store/slices/createPagesSlice';

export type PageCardProps = {
    page: Page;
    index: number;
    active: boolean;
    /** CSS aspect-ratio of the page ("1920 / 1080"), so the thumbnail has the page's shape. */
    aspectRatio: string;
    canDelete: boolean;
    /** This card is being dragged / another card is dragged over it. */
    dragging: boolean;
    dropTarget: boolean;
    onOpen: () => void;
    onRename: (name: string) => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onDragStart: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
    onDragEnd: () => void;
};

/**
 * One page in the Pages panel grid: a thumbnail in the page's own shape (click = open), a floating
 * action pill (rename / duplicate / delete; shown on hover and focus, always on the open page so it
 * works on touch), and the number + name (double-click or Rename to edit). Drag to reorder.
 */
export function PageCard({
    page,
    index,
    active,
    aspectRatio,
    canDelete,
    dragging,
    dropTarget,
    onOpen,
    onRename,
    onDuplicate,
    onDelete,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: PageCardProps) {
    const [editing, setEditing] = useState(false);
    // Escape unmounts the input; a blur fired on the way out must not save the cancelled name
    const cancelled = useRef(false);
    // a rename finished from the keyboard puts focus back on Rename (not <body>)
    const refocus = useRef(false);
    const pill = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editing || !refocus.current) return;
        refocus.current = false;
        pill.current?.querySelector<HTMLButtonElement>('button')?.focus();
    }, [editing]);

    const startEditing = () => {
        cancelled.current = false;
        setEditing(true);
    };
    const commit = (value: string) => {
        if (cancelled.current) return;
        setEditing(false);
        if (value.trim() && value !== page.name) onRename(value);
    };

    return (
        <li
            aria-label={page.name}
            draggable={!editing}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className={clsx(
                'group relative flex min-w-0 flex-col gap-1.5 rounded-lg',
                dropTarget && 'outline-2 outline-offset-4 outline-dashed outline-primary-400',
                dragging && 'opacity-40',
            )}
        >
            <button
                type="button"
                onClick={onOpen}
                aria-current={active ? 'page' : undefined}
                aria-label={`Open ${page.name}`}
                style={{ aspectRatio, backgroundColor: page.background }}
                className={clsx(
                    'relative block w-full cursor-pointer overflow-hidden rounded-md border transition-shadow',
                    active
                        ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-2 ring-offset-surface focus-visible:outline-2 focus-visible:outline-offset-[6px] focus-visible:outline-primary-400'
                        : ['border-line-strong hover:shadow-md', FOCUS_RING],
                )}
            >
                {page.thumbnail ? (
                    <img
                        src={page.thumbnail}
                        alt=""
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-contain"
                    />
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                        <span className="rounded-sm bg-surface/85 px-1.5 text-caption text-ink-muted">
                            Empty
                        </span>
                    </span>
                )}
            </button>

            <div
                ref={pill}
                className={clsx(
                    'absolute right-1.5 top-1.5 flex rounded-md border border-line bg-surface-raised p-0.5 shadow-sm transition-opacity',
                    active
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100',
                )}
            >
                <IconButton
                    size="sm"
                    icon={<Icon name="pencil" />}
                    title="Rename page"
                    aria-label={`Rename ${page.name}`}
                    onClick={startEditing}
                />
                <IconButton
                    size="sm"
                    icon={<Icon name="copy" />}
                    title="Duplicate page"
                    aria-label={`Duplicate ${page.name}`}
                    onClick={onDuplicate}
                />
                <IconButton
                    size="sm"
                    tone="danger"
                    icon={<Icon name="trash-can" />}
                    title={canDelete ? 'Delete page' : 'A project needs at least one page'}
                    aria-label={`Delete ${page.name}`}
                    disabled={!canDelete}
                    onClick={onDelete}
                />
            </div>

            <div className="flex h-7 min-w-0 items-center gap-1.5">
                <span
                    className={clsx(
                        'flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm px-1 text-[11px] font-semibold tabular-nums',
                        active ? 'bg-primary-600 text-white' : 'bg-surface-strong text-ink-muted',
                    )}
                >
                    {index + 1}
                </span>
                {editing ? (
                    <Input
                        autoFocus
                        size="sm"
                        defaultValue={page.name}
                        aria-label="Page name"
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={(e) => commit(e.currentTarget.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                refocus.current = true;
                                commit(e.currentTarget.value);
                            }
                            if (e.key === 'Escape') {
                                refocus.current = true;
                                cancelled.current = true;
                                setEditing(false);
                            }
                        }}
                    />
                ) : (
                    <span
                        className={clsx(
                            'min-w-0 flex-1 truncate text-xs',
                            active ? 'font-semibold text-primary-ink' : 'font-medium text-ink',
                        )}
                        title={`${page.name} (double-click to rename)`}
                        onDoubleClick={startEditing}
                    >
                        {page.name}
                    </span>
                )}
            </div>
        </li>
    );
}

export default PageCard;
