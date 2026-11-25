import clsx from 'clsx';
import { useState, type DragEvent } from 'react';
import { Icon } from '@/components/atoms/Icon';
import { IconButton } from '@/components/atoms/IconButton';
import { Input } from '@/components/atoms/Input';
import type { DocLayer } from '@/lib/canvas/docLayers';

/** Drag data type for a page layer row. */
export const LAYER_DRAG_TYPE = 'text/x-fate-layer';

export interface PageLayerRowProps {
    layer: DocLayer;
    depth: number;
    /** Objects on the layer (leaf layers only). */
    count?: number;
    active: boolean;
    onSelect: () => void;
    onUpdate: (patch: Partial<DocLayer>) => void;
    onDropLayer: (draggedId: string) => void;
}

/**
 * One row of the page layers list: fold (folders), show / hide, lock, the name (click = make active, double-click
 * = rename), clip and reference marks, object count. Rows drag onto other rows (PageLayersSection decides where).
 */
export function PageLayerRow({
    layer,
    depth,
    count,
    active,
    onSelect,
    onUpdate,
    onDropLayer,
}: PageLayerRowProps) {
    const [renaming, setRenaming] = useState(false);
    const folder = layer.kind === 'folder';
    const { name } = layer;

    const finish = (value: string | null) => {
        setRenaming(false);
        if (value !== null && value.trim() && value.trim() !== name)
            onUpdate({ name: value.trim() });
    };
    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        const dragged = e.dataTransfer.getData(LAYER_DRAG_TYPE);
        if (dragged && dragged !== layer.id) onDropLayer(dragged);
    };

    return (
        <li
            draggable={!renaming}
            onDragStart={(e) => {
                e.dataTransfer.setData(LAYER_DRAG_TYPE, layer.id);
                e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            style={{ paddingLeft: 6 + depth * 14 }}
            className={clsx(
                'flex h-8 items-center gap-0.5 pr-2 text-xs',
                active ? 'bg-primary-100 text-primary-ink' : 'text-ink hover:bg-surface-muted',
                !layer.visible && 'opacity-60',
            )}
        >
            {folder ? (
                <IconButton
                    size="sm"
                    icon={<Icon name={layer.collapsed ? 'chevron-right' : 'chevron-down'} />}
                    aria-label={`${layer.collapsed ? 'Open' : 'Close'} ${name}`}
                    aria-expanded={!layer.collapsed}
                    onClick={() => onUpdate({ collapsed: !layer.collapsed })}
                />
            ) : (
                <span className="w-6 shrink-0" />
            )}
            <IconButton
                size="sm"
                icon={<Icon name={layer.visible ? 'eye' : 'eye-slash'} />}
                aria-label={`${layer.visible ? 'Hide' : 'Show'} ${name}`}
                onClick={() => onUpdate({ visible: !layer.visible })}
            />
            <IconButton
                size="sm"
                icon={<Icon name={layer.locked ? 'lock' : 'lock-open'} />}
                aria-label={`${layer.locked ? 'Unlock' : 'Lock'} ${name}`}
                onClick={() => onUpdate({ locked: !layer.locked })}
            />
            {layer.clip && (
                <Icon
                    name="clip-below"
                    aria-label="Clipped to the layer below"
                    className="shrink-0"
                />
            )}
            {renaming ? (
                <Input
                    autoFocus
                    aria-label="Layer name"
                    defaultValue={name}
                    className="h-6 min-w-0 flex-1"
                    onBlur={(e) => finish(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') finish(e.currentTarget.value);
                        if (e.key === 'Escape') finish(null);
                    }}
                />
            ) : (
                <button
                    type="button"
                    aria-current={active || undefined}
                    title="Click to draw on this layer · double-click to rename"
                    onClick={onSelect}
                    onDoubleClick={() => setRenaming(true)}
                    className="flex min-w-0 flex-1 items-center gap-1.5 truncate rounded-sm px-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400"
                >
                    <Icon name={folder ? 'folder' : 'layer-group'} className="shrink-0" />
                    <span data-layer-name className="truncate">
                        {name}
                    </span>
                </button>
            )}
            {layer.reference && (
                <Icon name="crosshairs" aria-label="Reference layer" className="shrink-0" />
            )}
            {!folder && count !== undefined && (
                <span
                    className="shrink-0 tabular-nums text-ink-muted"
                    aria-label={`${count} objects`}
                >
                    {count}
                </span>
            )}
        </li>
    );
}
