import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { Icon } from '@/components/atoms/Icon';
import { IconButton } from '@/components/atoms/IconButton';
import { childrenOf, leafOrder, mergeTarget, type DocLayer } from '@/lib/canvas/docLayers';
import { PageLayerRow } from './PageLayerRow';
import { PageLayerSettings } from './PageLayerSettings';

type Row = { layer: DocLayer; depth: number };

/** Top-first rows; children of a closed folder are left out. */
function rowsOf(layers: DocLayer[], parentId: string | null = null, depth = 0): Row[] {
    return childrenOf(layers, parentId)
        .reverse()
        .flatMap((l) => [
            { layer: l, depth },
            ...(l.kind === 'folder' && !l.collapsed ? rowsOf(layers, l.id, depth + 1) : []),
        ]);
}

/**
 * Page layers (2026-11-17): the layers and folders of the current page, top of the Layers tab (the object
 * list stays below). New objects go to the active layer. Store: createPageLayersSlice.
 */
export function PageLayersSection() {
    const layers = useStore((s) => s.pageLayers);
    const activeId = useStore((s) => s.activeLayerId);
    const hasSelection = useStore((s) => !!s.hasSelection);
    const objects = useStore((s) => s.layers);
    const a = useStore(
        useShallow((s) => ({
            setActive: s.setActiveLayer,
            add: s.addPageLayer,
            update: s.updatePageLayer,
            remove: s.removePageLayer,
            move: s.movePageLayer,
            shift: s.shiftPageLayer,
            moveSelection: s.moveSelectionToLayer,
            mergeDown: s.mergeLayerDown,
            flatten: s.flattenLayers,
        })),
    );

    const rows = useMemo(() => rowsOf(layers), [layers]);
    const counts = useMemo(() => {
        const bottom = leafOrder(layers)[0];
        const leaves = new Set(leafOrder(layers));
        const out = new Map<string, number>();
        for (const item of objects ?? []) {
            if (item.parentId) continue; // inside a group: counted with the group
            const id = item.object?.layerId;
            const leaf = typeof id === 'string' && leaves.has(id) ? id : bottom;
            out.set(leaf, (out.get(leaf) ?? 0) + 1);
        }
        return out;
    }, [layers, objects]);
    const active = layers.find((l) => l.id === activeId) ?? null;

    /** Drop on a folder = inside it, on top; on a layer = just above it. */
    const dropOn = (target: DocLayer, dragged: string) => {
        if (target.kind === 'folder')
            return a.move(dragged, target.id, childrenOf(layers, target.id).length);
        const siblings = childrenOf(layers, target.parentId).filter((l) => l.id !== dragged);
        a.move(dragged, target.parentId, siblings.indexOf(target) + 1);
    };

    return (
        <section
            aria-label="Page layers panel"
            className="flex max-h-[60%] min-h-0 shrink-0 flex-col"
        >
            <div className="flex items-center gap-0.5 px-3 pt-3 pb-1">
                <h2 className="mr-auto text-sm font-semibold text-ink">Layers</h2>
                <IconButton
                    size="sm"
                    icon={<Icon name="plus" />}
                    aria-label="New layer"
                    title="New layer"
                    onClick={() => a.add('layer')}
                />
                <IconButton
                    size="sm"
                    icon={<Icon name="folder-plus" />}
                    aria-label="New folder"
                    title="New folder"
                    onClick={() => a.add('folder')}
                />
                <IconButton
                    size="sm"
                    icon={<Icon name="move-to-layer" />}
                    aria-label="Move selection to this layer"
                    title="Move selection to this layer"
                    disabled={!hasSelection || active?.kind !== 'layer'}
                    onClick={() => active && a.moveSelection(active.id)}
                />
                <IconButton
                    size="sm"
                    icon={<Icon name="merge-down" />}
                    aria-label="Merge down"
                    title="Merge down"
                    disabled={!active || !mergeTarget(layers, active.id)}
                    onClick={() => active && a.mergeDown(active.id)}
                />
                <IconButton
                    size="sm"
                    icon={<Icon name="flatten" />}
                    aria-label="Flatten shown layers"
                    title="Flatten shown layers"
                    disabled={leafOrder(layers).length < 2}
                    onClick={() => a.flatten()}
                />
                <IconButton
                    size="sm"
                    icon={<Icon name="angle-up" />}
                    aria-label="Move layer up"
                    title="Move layer up"
                    disabled={!active}
                    onClick={() => active && a.shift(active.id, 1)}
                />
                <IconButton
                    size="sm"
                    icon={<Icon name="angle-down" />}
                    aria-label="Move layer down"
                    title="Move layer down"
                    disabled={!active}
                    onClick={() => active && a.shift(active.id, -1)}
                />
                <IconButton
                    size="sm"
                    tone="danger"
                    icon={<Icon name="trash" />}
                    aria-label="Delete layer"
                    title="Delete layer (and what is on it)"
                    disabled={!active}
                    onClick={() => active && a.remove(active.id)}
                />
            </div>
            <ul aria-label="Page layers" className="min-h-24 overflow-y-auto">
                {rows.map(({ layer, depth }) => (
                    <PageLayerRow
                        key={layer.id}
                        layer={layer}
                        depth={depth}
                        count={layer.kind === 'layer' ? (counts.get(layer.id) ?? 0) : undefined}
                        active={layer.id === activeId}
                        onSelect={() => a.setActive(layer.id)}
                        onUpdate={(patch) => a.update(layer.id, patch)}
                        onDropLayer={(dragged) => dropOn(layer, dragged)}
                    />
                ))}
            </ul>
            {active && (
                <PageLayerSettings
                    layer={active}
                    onUpdate={(patch) => a.update(active.id, patch)}
                />
            )}
        </section>
    );
}
