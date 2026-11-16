import { useEffect, useState } from 'react';
import { useStore } from '@store';
import { Icon, type IconName } from '../atoms/Icon';
import { ToolbarPopover } from '../molecules/ToolbarPopover';

const TEXT = ['text', 'i-text', 'itext', 'textbox'];

/** Number of selected shapes a boolean operation can use (text is not supported). */
function useSelectedShapeCount(): number {
    const canvas = useStore((s) => s.canvas) as {
        getActiveObject?: () =>
            { type?: string; getObjects?: () => { type?: string }[] } | undefined;
        on?: (e: string, h: () => void) => void;
        off?: (e: string, h: () => void) => void;
    } | null;
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!canvas?.on) return;
        const read = () => {
            const a = canvas.getActiveObject?.();
            const objs = a?.type === 'activeselection' ? (a.getObjects?.() ?? []) : a ? [a] : [];
            setCount(objs.filter((o) => !TEXT.includes(String(o.type).toLowerCase())).length);
        };
        const events = ['selection:created', 'selection:updated', 'selection:cleared'];
        events.forEach((e) => canvas.on!(e, read));
        read();
        return () => events.forEach((e) => canvas.off?.(e, read));
    }, [canvas]);

    return count;
}

const OPERATIONS: {
    value: string;
    label: string;
    icon: IconName;
    description: string;
    action: string;
}[] = [
    {
        value: 'union',
        label: 'Union',
        icon: 'boolean-union',
        description: 'Merge the shapes into one',
        action: 'unionSelected',
    },
    {
        value: 'subtract',
        label: 'Subtract',
        icon: 'boolean-subtract',
        description: 'Cut the front shapes out of the bottom one',
        action: 'subtractSelected',
    },
    {
        value: 'intersect',
        label: 'Intersect',
        icon: 'boolean-intersect',
        description: 'Keep only where the shapes overlap',
        action: 'intersectSelected',
    },
    {
        value: 'exclude',
        label: 'Exclude',
        icon: 'boolean-exclude',
        description: 'Remove where the shapes overlap',
        action: 'excludeSelected',
    },
    {
        value: 'divide',
        label: 'Divide',
        icon: 'boolean-divide',
        description: 'Split into separate pieces',
        action: 'divideSelected',
    },
    {
        value: 'crop',
        label: 'Crop',
        icon: 'crop',
        description: 'Trim the shapes below to the top one',
        action: 'cropSelected',
    },
    {
        value: 'mask',
        label: 'Mask',
        icon: 'mask',
        description: 'Top shape clips the one below',
        action: 'clipSelectedObject',
    },
];

type Actions = Record<string, (() => unknown) | undefined>;

/**
 * Shape operations (Union, Subtract, …): a menu button in the top toolbar next to Group, like the
 * grid options. Disabled until 2 shapes are selected; an action menu never keeps a value, so the
 * same operation can be run again. Stacking order decides the result (see lib/booleanOps).
 */
export function BooleanOperations() {
    const count = useSelectedShapeCount();
    const run = (value: string) => {
        const op = OPERATIONS.find((o) => o.value === value);
        const fn = op && (useStore.getState() as unknown as Actions)[op.action];
        void fn?.();
    };

    return (
        <ToolbarPopover
            label="Shape operations"
            role="menu"
            disabled={count < 2}
            className="w-64 gap-0.5 p-1"
            trigger={<Icon name="boolean-union" />}
        >
            {(close) =>
                OPERATIONS.map(({ value, label, icon, description }) => (
                    <button
                        key={value}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            close();
                            run(value);
                        }}
                        className="flex items-start gap-2.5 rounded-md px-2 py-1.5 text-left outline-none hover:bg-surface-muted focus-visible:bg-surface-muted pointer-coarse:py-2.5"
                    >
                        <Icon name={icon} className="mt-0.5 shrink-0 text-ink-muted" />
                        <span className="flex min-w-0 flex-col">
                            <span data-label className="text-xs font-medium text-ink">
                                {label}
                            </span>
                            <span className="text-caption text-ink-muted">{description}</span>
                        </span>
                    </button>
                ))
            }
        </ToolbarPopover>
    );
}
