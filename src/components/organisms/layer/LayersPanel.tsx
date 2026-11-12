import clsx from 'clsx';
import { IconButton as AtomIconButton } from '@/components/atoms/IconButton';
import { Select } from '@/components/atoms/Select';
import { Slider } from '@/components/atoms/Slider';
import { Badge } from '@/components/atoms/Badge';
import { Field } from '@/components/molecules/Field';
import { EmptyState } from '@/components/molecules/EmptyState';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    AlignCenterHorizontal,
    AlignCenterVertical,
    AlignEndHorizontal,
    AlignEndVertical,
    AlignHorizontalSpaceBetween,
    AlignStartHorizontal,
    AlignStartVertical,
    AlignVerticalSpaceBetween,
    Box,
    ChevronDown,
    ChevronRight,
    Circle,
    Copy,
    Eye,
    EyeOff,
    Folder,
    FolderOpen,
    Group as GroupIcon,
    Hexagon,
    Image as ImageIcon,
    Lock,
    LockOpen,
    Minus,
    Spline,
    Square,
    Trash2,
    Triangle,
    Type,
    Ungroup,
} from 'lucide-react';
import { useStore } from '@store';
import type {
    AlignKey,
    LayerItem as Layer,
    ReorderPosition,
} from '@/store/slices/createLayersSlice';
import { Input } from '@/components/atoms/Input';
import { visibleRange } from './visibleRange';
import { useArrangeCan } from '@/hooks/useArrangeState';
import { KEYS } from './layerKeys';

/** `Group (Ctrl+G)`, or just the name when the command has no key. */
const withKeys = (label: string, keys?: string) => (keys ? `${label} (${keys})` : label);

/* All logic lives in layersSlice. This file only reads `layers` / `selectedLayerIds`
 * and calls slice actions. */

/** Row height in px: must match `h-11` on LayerRow. */
const ROW_HEIGHT = 44;
/** Extra rows mounted past each edge, so scrolling and Tab never reach an unmounted row. */
const ROW_OVERSCAN = 6;
/** List height assumed until it has been measured. */
const INITIAL_LIST_HEIGHT = 600;

const BLEND_MODES: [string, string][] = [
    ['source-over', 'Normal'],
    ['multiply', 'Multiply'],
    ['screen', 'Screen'],
    ['overlay', 'Overlay'],
    ['darken', 'Darken'],
    ['lighten', 'Lighten'],
    ['color-dodge', 'Color dodge'],
    ['color-burn', 'Color burn'],
    ['hard-light', 'Hard light'],
    ['soft-light', 'Soft light'],
    ['difference', 'Difference'],
    ['exclusion', 'Exclusion'],
];

const ALIGN_TOOLS: { key: AlignKey; label: string; Icon: typeof Copy; min: number }[] = [
    { key: 'align-left', label: 'Align left', Icon: AlignStartVertical, min: 1 },
    { key: 'align-hcenter', label: 'Align horizontal centers', Icon: AlignCenterVertical, min: 1 },
    { key: 'align-right', label: 'Align right', Icon: AlignEndVertical, min: 1 },
    { key: 'align-top', label: 'Align top', Icon: AlignStartHorizontal, min: 1 },
    { key: 'align-vcenter', label: 'Align vertical centers', Icon: AlignCenterHorizontal, min: 1 },
    { key: 'align-bottom', label: 'Align bottom', Icon: AlignEndHorizontal, min: 1 },
    {
        key: 'distribute-h',
        label: 'Distribute horizontally',
        Icon: AlignHorizontalSpaceBetween,
        min: 3,
    },
    {
        key: 'distribute-v',
        label: 'Distribute vertically',
        Icon: AlignVerticalSpaceBetween,
        min: 3,
    },
];

const TYPE_ICONS: Record<string, typeof Box> = {
    rect: Square,
    circle: Circle,
    ellipse: Circle,
    triangle: Triangle,
    polygon: Hexagon,
    polyline: Spline,
    path: Spline,
    line: Minus,
    text: Type,
    itext: Type,
    textbox: Type,
    image: ImageIcon,
};

/* ───────────── small pieces ───────────── */

function IconButton({
    label,
    onClick,
    disabled,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
}) {
    return (
        <AtomIconButton
            icon={children}
            title={label}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
        />
    );
}

interface MenuItem {
    label: string;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    dividerBefore?: boolean;
}

function ContextMenu({
    x,
    y,
    items,
    onClose,
}: {
    x: number;
    y: number;
    items: MenuItem[];
    onClose: () => void;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x, y });

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const { width, height } = el.getBoundingClientRect();
        setPos({
            x: Math.min(x, window.innerWidth - width - 8),
            y: Math.min(y, window.innerHeight - height - 8),
        });
    }, [x, y]);

    useEffect(() => {
        const close = () => onClose();
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('pointerdown', close);
        window.addEventListener('blur', close);
        window.addEventListener('keydown', onKey);
        window.addEventListener('wheel', close, { passive: true });
        return () => {
            window.removeEventListener('pointerdown', close);
            window.removeEventListener('blur', close);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('wheel', close);
        };
    }, [onClose]);

    return (
        <div
            ref={ref}
            role="menu"
            style={{ left: pos.x, top: pos.y }}
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed z-50 min-w-52 rounded-lg border border-line bg-surface py-1 text-sm shadow-lg"
        >
            {items.map((item) => (
                <div key={item.label}>
                    {item.dividerBefore && <div className="my-1 h-px bg-surface-muted" />}
                    <button
                        role="menuitem"
                        disabled={item.disabled}
                        onClick={() => {
                            item.onClick();
                            onClose();
                        }}
                        className={`flex w-full items-center justify-between gap-6 px-3 py-1.5 text-left outline-none
                            focus-visible:bg-surface-muted enabled:hover:bg-surface-muted disabled:opacity-40
                            ${item.danger ? 'text-danger' : 'text-ink'}`}
                    >
                        <span>{item.label}</span>
                        {item.shortcut && (
                            <span className="text-xs text-ink-subtle">{item.shortcut}</span>
                        )}
                    </button>
                </div>
            ))}
        </div>
    );
}

/** Finished thumbnails per object, for the panel's lifetime: rows remount as the list scrolls. */
type ThumbCache = WeakMap<object, { key: string; url: string | null }>;

function Thumbnail({ layer, cache }: { layer: Layer; cache: ThumbCache }) {
    const url = useMemo(() => {
        const o = layer.object;
        // thumbRev changes whenever the object is modified
        const key = `${layer.thumbRev}|${layer.visible}|${layer.opacity}|${layer.blendMode}`;
        const cached = cache.get(o);
        if (cached?.key === key) return cached.url;
        let made: string | null;
        try {
            const size = Math.max(o.getScaledWidth?.() ?? 1, o.getScaledHeight?.() ?? 1, 1);
            made = o.toDataURL({
                format: 'png',
                multiplier: Math.min(2, 64 / size),
                enableRetinaScaling: false,
            }) as string;
        } catch {
            made = null;
        }
        cache.set(o, { key, url: made });
        return made;
    }, [cache, layer.object, layer.thumbRev, layer.visible, layer.opacity, layer.blendMode]);

    const Icon = layer.isGroup ? Folder : (TYPE_ICONS[layer.type] ?? Box);
    return (
        <span
            className={clsx(
                'flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-line',
                // light checker = the page behind a content preview; plain token bg behind an icon
                url && !layer.isGroup
                    ? 'bg-[conic-gradient(#f4f4f5_25%,#fff_0_50%,#f4f4f5_0_75%,#fff_0)] bg-[length:8px_8px]'
                    : 'bg-surface-strong',
            )}
        >
            {url && !layer.isGroup ? (
                <img
                    src={url}
                    alt=""
                    draggable={false}
                    className="max-h-full max-w-full object-contain"
                />
            ) : (
                <Icon size={15} className="text-ink-muted" />
            )}
        </span>
    );
}

interface RowProps {
    layer: Layer;
    /** Position in the list being shown (rows are absolutely placed, see LayersPanel). */
    index: number;
    total: number;
    thumbCache: ThumbCache;
    selected: boolean;
    collapsed: boolean;
    dropPos: ReorderPosition | null;
    onSelect: (e: React.MouseEvent) => void;
    onToggleCollapse: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onRename: (name: string) => void;
    onToggleVisible: () => void;
    onToggleLock: () => void;
    onDragStart: () => void;
    onDragOver: (pos: ReorderPosition) => void;
    onDrop: () => void;
    onDragEnd: () => void;
}

const LayerRow = memo(function LayerRow(p: RowProps) {
    const { layer } = p;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(layer.name);
    const inputRef = useRef<HTMLInputElement>(null);
    const topLevel = layer.depth === 0;

    useEffect(() => {
        if (editing) inputRef.current?.select();
    }, [editing]);

    const startEdit = () => {
        setDraft(layer.name);
        setEditing(true);
    };
    const finishEdit = (save: boolean) => {
        setEditing(false);
        if (save) p.onRename(draft);
    };

    return (
        <div
            role="option"
            aria-selected={p.selected}
            aria-posinset={p.index + 1}
            aria-setsize={p.total}
            tabIndex={0}
            draggable={topLevel && !editing}
            onClick={p.onSelect}
            onDoubleClick={startEdit}
            onContextMenu={p.onContextMenu}
            onKeyDown={(e) => {
                if (e.key === 'F2') startEdit();
                if (e.key === 'Enter' && !editing) p.onSelect(e as unknown as React.MouseEvent);
            }}
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                p.onDragStart();
            }}
            onDragOver={(e) => {
                if (!topLevel) return;
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                p.onDragOver(e.clientY < r.top + r.height / 2 ? 'above' : 'below');
            }}
            onDrop={(e) => {
                e.preventDefault();
                p.onDrop();
            }}
            onDragEnd={p.onDragEnd}
            style={{
                paddingLeft: 8 + layer.depth * 16,
                position: 'absolute',
                top: p.index * ROW_HEIGHT,
                left: 0,
                right: 0,
            }}
            className={`group flex h-11 cursor-default select-none items-center gap-1.5 pr-2 outline-none
                focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400/60
                ${p.selected ? 'bg-primary-50 shadow-[inset_2px_0_0_theme(colors.teal.600)]' : 'hover:bg-surface-muted'}`}
        >
            {p.dropPos && (
                <span
                    className={`pointer-events-none absolute inset-x-2 h-0.5 rounded bg-primary-600 ${
                        p.dropPos === 'above' ? 'top-0' : 'bottom-0'
                    }`}
                />
            )}

            {layer.isGroup ? (
                <AtomIconButton
                    size="sm"
                    icon={p.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    aria-label={p.collapsed ? 'Expand group' : 'Collapse group'}
                    aria-expanded={!p.collapsed}
                    onClick={(e) => {
                        e.stopPropagation();
                        p.onToggleCollapse();
                    }}
                />
            ) : (
                <span className="size-5 shrink-0" />
            )}

            <div className={layer.visible ? '' : 'opacity-40'}>
                {layer.isGroup && !p.collapsed ? (
                    <span className="flex size-8 items-center justify-center rounded border border-line bg-surface">
                        <FolderOpen size={15} className="text-ink-muted" />
                    </span>
                ) : (
                    <Thumbnail layer={layer} cache={p.thumbCache} />
                )}
            </div>

            <div className={`min-w-0 flex-1 ${layer.visible ? '' : 'opacity-40'}`}>
                {editing ? (
                    <Input
                        ref={inputRef}
                        size="sm"
                        aria-label="Layer name"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={() => finishEdit(true)}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') finishEdit(true);
                            if (e.key === 'Escape') finishEdit(false);
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className="block truncate text-sm text-ink" title={layer.name}>
                        {layer.name}
                    </span>
                )}
            </div>

            {topLevel && (
                <AtomIconButton
                    size="sm"
                    icon={layer.locked ? <Lock size={14} /> : <LockOpen size={14} />}
                    aria-label={layer.locked ? 'Unlock layer' : 'Lock layer'}
                    title={layer.locked ? 'Unlock' : 'Lock'}
                    onClick={(e) => {
                        e.stopPropagation();
                        p.onToggleLock();
                    }}
                    className={
                        layer.locked
                            ? undefined
                            : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100'
                    }
                />
            )}

            <AtomIconButton
                size="sm"
                icon={layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                aria-label={layer.visible ? 'Hide layer' : 'Show layer'}
                title={layer.visible ? 'Hide' : 'Show'}
                onClick={(e) => {
                    e.stopPropagation();
                    p.onToggleVisible();
                }}
            />
        </div>
    );
});

/* ───────────── panel ───────────── */

export default function LayersPanel() {
    const canvas = useStore((s: any) => s.canvas);
    const layers = useStore((s: any) => s.layers) as Layer[];
    const selectedIds = useStore((s: any) => s.selectedLayerIds) as (string | number)[];
    const store = useStore.getState() as any; // actions are stable

    const [query, setQuery] = useState('');
    const [collapsed, setCollapsed] = useState<Set<string | number>>(new Set());
    const [menu, setMenu] = useState<{ x: number; y: number; id: string | number } | null>(null);
    const [dragId, setDragId] = useState<string | number | null>(null);
    const [hint, setHint] = useState<{ id: string | number; pos: ReorderPosition } | null>(null);
    const [opacityDraft, setOpacityDraft] = useState<number | null>(null);
    const [firstRow, setFirstRow] = useState(0);
    const [listHeight, setListHeight] = useState(INITIAL_LIST_HEIGHT);
    const listRef = useRef<HTMLDivElement>(null);
    const thumbCache = useRef<ThumbCache>(new WeakMap()).current;

    // The slice owns the logic; the panel just asks it to listen to the canvas while mounted.
    // (Safe to also call store.bindLayerEvents() once in your canvas setup instead.)
    useEffect(() => {
        if (!canvas) return;
        return (useStore.getState() as any).bindLayerEvents(canvas);
    }, [canvas]);

    const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
    const selected = useMemo(
        () => layers.filter((l) => selectedSet.has(String(l.id))),
        [layers, selectedSet],
    );
    const single = selected.length === 1 ? selected[0] : null;
    const allLocked = selected.length > 0 && selected.every((l) => l.locked);
    const can = useArrangeCan(); // same Group / Ungroup rules as the header (BUG-192)

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q) return layers.filter((l) => l.name.toLowerCase().includes(q));
        const byId = new Map(layers.map((l) => [l.id, l]));
        return layers.filter((l) => {
            let p = l.parentId;
            while (p !== null && p !== undefined) {
                if (collapsed.has(p)) return false;
                p = byId.get(p)?.parentId ?? null;
            }
            return true;
        });
    }, [layers, query, collapsed]);

    useLayoutEffect(() => {
        const el = listRef.current;
        if (!el) return;
        const measure = () => setListHeight(el.clientHeight);
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        measure();
        return () => observer.disconnect();
    }, []);

    // Only the rows near the viewport are mounted: a row costs a thumbnail render and its DOM, so
    // doing it per layer froze the tab on big boards.
    const shownRows = useMemo(() => {
        const { start, end } = visibleRange({
            firstRow,
            viewportRows: Math.ceil(listHeight / ROW_HEIGHT),
            count: rows.length,
            overscan: ROW_OVERSCAN,
        });
        const shown = rows.slice(start, end).map((layer, i) => ({ layer, index: start + i }));
        // the row being dragged stays mounted: removing a drag source cancels the drag
        const dragIndex = dragId === null ? -1 : rows.findIndex((layer) => layer.id === dragId);
        if (dragIndex !== -1 && (dragIndex < start || dragIndex >= end))
            shown.push({ layer: rows[dragIndex]!, index: dragIndex });
        return shown;
    }, [rows, firstRow, listHeight, dragId]);

    const onListScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const next = Math.floor(e.currentTarget.scrollTop / ROW_HEIGHT);
        if (next === firstRow) return;
        // a rename in progress commits, as when clicking away, before its row can unmount
        const focused = document.activeElement;
        if (focused instanceof HTMLInputElement && e.currentTarget.contains(focused))
            focused.blur();
        setFirstRow(next);
    };

    const toggleCollapse = useCallback((id: string | number) => {
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const endDrag = () => {
        setDragId(null);
        setHint(null);
    };

    const commitOpacity = () => {
        if (!single) return;
        store.setLayerOpacity(single.id, (opacityDraft ?? single.opacity * 100) / 100, true);
        setOpacityDraft(null);
    };

    const menuItems = (id: string | number): MenuItem[] => {
        const layer = layers.find((l) => l.id === id);
        return [
            {
                label: 'Duplicate',
                shortcut: KEYS.duplicate,
                onClick: () => store.duplicateLayer(id),
            },
            { label: 'Copy', shortcut: KEYS.copy, onClick: store.copy },
            {
                label: 'Paste',
                shortcut: KEYS.paste,
                onClick: store.paste,
                disabled: !store.canPaste(),
            },
            {
                label: 'Group',
                shortcut: KEYS.group,
                onClick: () => store.groupLayers(),
                disabled: !can('group'),
                dividerBefore: true,
            },
            {
                label: 'Ungroup',
                shortcut: KEYS.ungroup,
                onClick: store.ungroupSelected,
                disabled: !can('ungroup'),
            },
            {
                label: 'Bring to front',
                shortcut: KEYS.toFront,
                onClick: store.bringToFront,
                dividerBefore: true,
            },
            { label: 'Bring forward', shortcut: KEYS.forward, onClick: store.bringForward },
            { label: 'Send backward', shortcut: KEYS.backward, onClick: store.sendBackward },
            { label: 'Send to back', shortcut: KEYS.toBack, onClick: store.sendToBack },
            {
                label: layer?.locked ? 'Unlock' : 'Lock',
                shortcut: layer?.locked ? KEYS.unlock : KEYS.lock,
                onClick: () => store.toggleLayerLock(id),
                dividerBefore: true,
            },
            { label: layer?.visible ? 'Hide' : 'Show', onClick: () => store.toggleVisibility(id) },
            { label: 'Show only this layer', onClick: () => store.soloLayer(id) },
            { label: 'Show all layers', onClick: store.showAllLayers },
            {
                label: 'Delete',
                shortcut: KEYS.delete,
                onClick: () => store.removeLayer(),
                danger: true,
                dividerBefore: true,
            },
        ];
    };

    return (
        <aside className="flex h-full w-full min-w-64 flex-col bg-surface text-ink">
            <div className="flex items-center gap-2 px-4 pt-4">
                <Input
                    type="search"
                    leadingIcon="magnifying-glass"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find a layer"
                    aria-label="Find a layer"
                    className="min-w-0 flex-1"
                />
                <Badge>{layers.length}</Badge>
            </div>

            <div className="flex items-center gap-0.5 px-3 pt-2">
                <IconButton
                    label={withKeys('Group', KEYS.group)}
                    disabled={!can('group')}
                    onClick={() => store.groupLayers()}
                >
                    <GroupIcon size={15} />
                </IconButton>
                <IconButton
                    label={withKeys('Ungroup', KEYS.ungroup)}
                    disabled={!can('ungroup')}
                    onClick={store.ungroupSelected}
                >
                    <Ungroup size={15} />
                </IconButton>
                <IconButton
                    label={withKeys('Duplicate', KEYS.duplicate)}
                    disabled={!selected.length}
                    onClick={store.duplicate}
                >
                    <Copy size={15} />
                </IconButton>
                <IconButton
                    label={
                        allLocked ? withKeys('Unlock', KEYS.unlock) : withKeys('Lock', KEYS.lock)
                    }
                    disabled={!selected.length}
                    onClick={() => store.toggleLayerLock()}
                >
                    {allLocked ? <LockOpen size={15} /> : <Lock size={15} />}
                </IconButton>
                <span className="flex-1" />
                <IconButton
                    label={withKeys('Delete', KEYS.delete)}
                    disabled={!selected.length || allLocked}
                    onClick={() => store.removeLayer()}
                >
                    <Trash2 size={15} />
                </IconButton>
            </div>

            <div className="flex items-center gap-0.5 border-b border-line px-3 pb-2">
                {ALIGN_TOOLS.map(({ key, label, Icon, min }) => (
                    <IconButton
                        key={key}
                        label={label}
                        disabled={selected.length < min}
                        onClick={() => store.alignObjects(key)}
                    >
                        <Icon size={15} />
                    </IconButton>
                ))}
            </div>

            {single && (
                <div className="flex flex-col gap-3 border-b border-line px-4 py-3">
                    <Field label="Blend" inline>
                        <div className="w-36">
                            <Select
                                aria-label="Blend mode"
                                size="sm"
                                value={single.blendMode}
                                onChange={(v) => store.setLayerBlendMode(single.id, v)}
                                options={BLEND_MODES.map(([value, label]) => ({ value, label }))}
                            />
                        </div>
                    </Field>
                    <Field
                        label="Opacity"
                        trailing={
                            <span className="font-semibold tabular-nums text-ink">
                                {opacityDraft ?? Math.round(single.opacity * 100)}%
                            </span>
                        }
                    >
                        <Slider
                            aria-label="Layer opacity"
                            min={0}
                            max={100}
                            value={opacityDraft ?? Math.round(single.opacity * 100)}
                            onChange={(v) => {
                                setOpacityDraft(v);
                                store.setLayerOpacity(single.id, v / 100, false);
                            }}
                            onCommit={commitOpacity}
                        />
                    </Field>
                </div>
            )}

            <div
                role="listbox"
                aria-multiselectable
                aria-label="Layers"
                ref={listRef}
                className="min-h-0 flex-1 overflow-y-auto"
                onScroll={onListScroll}
                onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setHint(null);
                }}
            >
                {rows.length === 0 ? (
                    <EmptyState
                        icon="layer-group"
                        title={query ? `No layer named “${query}”` : 'No layers yet'}
                        description={
                            query
                                ? undefined
                                : 'Add a shape, text or image and it will appear here.'
                        }
                    />
                ) : (
                    <div
                        role="presentation"
                        className="relative"
                        style={{ height: rows.length * ROW_HEIGHT }}
                    >
                        {shownRows.map(({ layer, index }) => (
                            <LayerRow
                                key={layer.id}
                                layer={layer}
                                index={index}
                                total={rows.length}
                                thumbCache={thumbCache}
                                selected={selectedSet.has(String(layer.id))}
                                collapsed={collapsed.has(layer.id)}
                                dropPos={
                                    hint?.id === layer.id && dragId !== layer.id ? hint.pos : null
                                }
                                onSelect={(e) =>
                                    store.selectLayer(
                                        layer.id,
                                        e.shiftKey
                                            ? 'range'
                                            : e.metaKey || e.ctrlKey
                                              ? 'toggle'
                                              : 'replace',
                                    )
                                }
                                onToggleCollapse={() => toggleCollapse(layer.id)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    if (!selectedSet.has(String(layer.id)))
                                        store.selectLayer(layer.id, 'replace');
                                    setMenu({ x: e.clientX, y: e.clientY, id: layer.id });
                                }}
                                onRename={(name) => store.renameLayer(layer.id, name)}
                                onToggleVisible={() => store.toggleVisibility(layer.id)}
                                onToggleLock={() => store.toggleLayerLock(layer.id)}
                                onDragStart={() => setDragId(layer.id)}
                                onDragOver={(pos) => setHint({ id: layer.id, pos })}
                                onDrop={() => {
                                    if (dragId !== null && hint)
                                        store.reorderLayer(dragId, hint.id, hint.pos);
                                    endDrag();
                                }}
                                onDragEnd={endDrag}
                            />
                        ))}
                    </div>
                )}
            </div>

            {menu && (
                <ContextMenu
                    x={menu.x}
                    y={menu.y}
                    items={menuItems(menu.id)}
                    onClose={() => setMenu(null)}
                />
            )}
        </aside>
    );
}
