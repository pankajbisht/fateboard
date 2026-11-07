import { useStore } from '@store';
import { FLOAT_BAR_CLASS, FLOAT_SEP_CLASS } from '@/lib/floatChrome';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';
import { NumberField } from '../atoms/NumberField';
import { SegmentedControl } from '../molecules/SegmentedControl';
import type { NodeSelectionInfo, NodeType } from '@/store/slices/createNodeEditorSlice';

/* eslint-disable @typescript-eslint/no-explicit-any */

const FIELD_CLASS =
    'w-[84px] rounded-full! border-transparent! bg-surface-strong! [&_button]:rounded-full!';

/**
 * Floating bar while editing nodes (CanvasBoard places it above the shape, like the text float):
 * Add / Delete node | Corner / Smooth | Straight / Curved segments | Close or Open path, Break |
 * node X / Y | Cancel, Done. Every control acts on the selected node.
 */
export function NodeToolbar() {
    const nodeMode = useStore((s: any) => s.nodeMode as boolean);
    const node = useStore((s: any) => s.selectedNode as NodeSelectionInfo | null);
    const addNodeToPath = useStore((s: any) => s.addNodeToPath);
    const deleteSelectedNode = useStore((s: any) => s.deleteSelectedNode);
    const setSelectedNodeType = useStore((s: any) => s.setSelectedNodeType);
    const setSelectedSegments = useStore((s: any) => s.setSelectedSegments);
    const setPathClosed = useStore((s: any) => s.setPathClosed);
    const breakPathAtSelectedNode = useStore((s: any) => s.breakPathAtSelectedNode);
    const moveSelectedNode = useStore((s: any) => s.moveSelectedNode);
    const exitNodeMode = useStore((s: any) => s.exitNodeMode);
    const cancelNodeMode = useStore((s: any) => s.cancelNodeMode);

    if (!nodeMode) return null;
    const none = !node;

    return (
        <div
            role="toolbar"
            aria-label="Node editing"
            data-node-float
            className={FLOAT_BAR_CLASS}
            // clicks on the bar chrome must not move the keyboard focus away from the canvas
            onMouseDown={(e) => {
                if (!(e.target as HTMLElement).closest('input')) e.preventDefault();
            }}
        >
            <IconButton
                icon={<Icon name="node-add" />}
                aria-label="Add node"
                title="Add node (or double-click the outline)"
                disabled={none}
                onClick={() => addNodeToPath()}
            />
            <IconButton
                icon={<Icon name="node-delete" />}
                aria-label="Delete node"
                title="Delete node (⌫ / double-click the node)"
                tone="danger"
                disabled={none || !node.canDelete}
                onClick={() => deleteSelectedNode()}
            />

            <span className={FLOAT_SEP_CLASS} />

            <SegmentedControl<NodeType>
                aria-label="Node type"
                size="sm"
                block={false}
                value={node?.type ?? 'corner'}
                onChange={(type) => setSelectedNodeType(type)}
                options={[
                    { value: 'corner', icon: 'node-corner', title: 'Corner node', disabled: none },
                    { value: 'smooth', icon: 'node-smooth', title: 'Smooth node', disabled: none },
                ]}
                className="rounded-full! [&>button]:w-7 [&>button]:flex-none [&>button]:rounded-full! [&>button]:px-0"
            />
            <IconButton
                icon={<Icon name="segment-line" />}
                aria-label="Straight segments"
                title="Straight segments on both sides of the node"
                disabled={none}
                onClick={() => setSelectedSegments('line')}
            />
            <IconButton
                icon={<Icon name="segment-curve" />}
                aria-label="Curved segments"
                title="Curved segments on both sides of the node (drag the new handles)"
                disabled={none}
                onClick={() => setSelectedSegments('curve')}
            />

            <span className={FLOAT_SEP_CLASS} />

            {node && !node.closed ? (
                <IconButton
                    icon={<Icon name="path-close" />}
                    aria-label="Close path"
                    title="Close path (join the two ends)"
                    onClick={() => setPathClosed(true)}
                />
            ) : (
                <IconButton
                    icon={<Icon name="path-open" />}
                    aria-label="Open path"
                    title="Open path at this node"
                    disabled={none}
                    onClick={() => setPathClosed(false)}
                />
            )}
            <IconButton
                icon={<Icon name="scissors" />}
                aria-label="Break path at node"
                title="Break path at this node"
                disabled={none || !node.canBreak}
                onClick={() => breakPathAtSelectedNode()}
            />

            <span className={FLOAT_SEP_CLASS} />

            <NumberField
                label="X"
                aria-label="Node X"
                title="Node X (px)"
                value={node?.x ?? 0}
                disabled={none}
                stepper={false}
                onCommit={(x) => node && moveSelectedNode(x, node.y)}
                className={FIELD_CLASS}
            />
            <NumberField
                label="Y"
                aria-label="Node Y"
                title="Node Y (px)"
                value={node?.y ?? 0}
                disabled={none}
                stepper={false}
                onCommit={(y) => node && moveSelectedNode(node.x, y)}
                className={FIELD_CLASS}
            />

            <span className={FLOAT_SEP_CLASS} />

            <IconButton
                icon={<Icon name="xmark" />}
                aria-label="Cancel"
                title="Cancel: undo every node change"
                onClick={() => cancelNodeMode()}
            />
            <IconButton
                icon={<Icon name="check" />}
                aria-label="Done"
                title="Done (Enter)"
                tone="primary"
                onClick={() => exitNodeMode()}
            />
        </div>
    );
}

export default NodeToolbar;
