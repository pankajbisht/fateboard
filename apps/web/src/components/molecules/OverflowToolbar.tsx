import clsx from 'clsx';
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../atoms/Icon';
import { IconButton } from '../atoms/IconButton';

export type OverflowToolbarItem = { id: string; node: ReactNode };

/** Width assumed for a tool group that has never been measured (it started in the menu). */
const UNKNOWN_WIDTH = 120;

/**
 * One row of tool groups that never gets cut off: groups that do not fit move into a
 * "More tools" (…) menu at the end, and come back when there is room (window resize, smaller
 * icon size). Each group is mounted exactly once, in the row or in the menu (the menu stays
 * mounted while closed), because toolbar groups register global keyboard shortcuts.
 */
export function OverflowToolbar({
    items,
    divider,
    className,
}: {
    items: OverflowToolbarItem[];
    /** Rendered between groups (in the row only). */
    divider?: ReactNode;
    className?: string;
}) {
    const rowRef = useRef<HTMLDivElement>(null);
    const moreRef = useRef<HTMLDivElement>(null);
    const widths = useRef(new Map<string, number>());
    const [visible, setVisible] = useState(items.length);
    const [open, setOpen] = useState(false);
    const [tick, setTick] = useState(0);

    // measure the groups in the row, then decide how many fit (before paint: no flicker)
    useLayoutEffect(() => {
        const row = rowRef.current;
        if (!row) return;
        row.querySelectorAll<HTMLElement>(':scope > [data-toolbar-item]').forEach((el) => {
            const id = el.dataset.toolbarItem;
            if (id) widths.current.set(id, el.getBoundingClientRect().width);
        });

        const available = row.clientWidth;
        if (available <= 0) return; // not laid out (tests without layout): show everything
        const widthOf = (id: string) => widths.current.get(id) ?? UNKNOWN_WIDTH;
        const total = items.reduce((sum, it) => sum + widthOf(it.id), 0);

        let fit = items.length;
        if (total > available) {
            const moreW = moreRef.current?.getBoundingClientRect().width || 40;
            let used = 0;
            fit = 0;
            for (const it of items) {
                if (used + widthOf(it.id) + moreW > available) break;
                used += widthOf(it.id);
                fit += 1;
            }
        }
        if (fit !== visible) setVisible(fit);
    }, [items, visible, tick]);

    // re-check when the row or any group changes size (window resize, icon size setting)
    useEffect(() => {
        const row = rowRef.current;
        if (!row) return;
        const ro = new ResizeObserver(() => setTick((t) => t + 1));
        ro.observe(row);
        row.querySelectorAll(':scope > [data-toolbar-item]').forEach((el) => ro.observe(el));
        return () => ro.disconnect();
    }, [visible]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!moreRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const shown = items.slice(0, visible);
    const hidden = items.slice(visible);
    const isOpen = open && hidden.length > 0;

    return (
        <div className={clsx('flex min-w-0 flex-1 items-center', className)}>
            <div
                ref={rowRef}
                data-toolbar-row
                className="flex min-w-0 flex-1 items-center overflow-hidden"
            >
                {shown.map((it, i) => (
                    <Fragment key={it.id}>
                        <div data-toolbar-item={it.id} className="flex shrink-0 items-center">
                            {i > 0 && divider}
                            {it.node}
                        </div>
                    </Fragment>
                ))}
            </div>

            {hidden.length > 0 && (
                <div ref={moreRef} data-toolbar-more className="relative shrink-0">
                    <IconButton
                        size="chrome"
                        icon={<Icon name="ellipsis" />}
                        aria-label="More tools"
                        title="More tools"
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                        active={isOpen}
                        onClick={() => setOpen((o) => !o)}
                    />
                    {/* stays mounted while closed: the groups keep their shortcuts */}
                    <div
                        role="group"
                        aria-label="More tools"
                        className={clsx(
                            'absolute right-0 top-full z-50 mt-1 flex w-max max-w-[min(32rem,90vw)] flex-wrap items-center gap-1',
                            'rounded-lg border border-line bg-surface p-1.5 shadow-lg',
                            !isOpen && 'hidden',
                        )}
                    >
                        {hidden.map((it) => (
                            <div
                                key={it.id}
                                data-toolbar-overflow={it.id}
                                className="flex items-center rounded-md bg-surface-muted/60 px-0.5"
                            >
                                {it.node}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default OverflowToolbar;
