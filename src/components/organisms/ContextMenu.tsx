import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useStore } from '../../store';

/** Space kept between the menu and the screen edge. */
const EDGE = 8;

const menuItems = (menu: HTMLElement | null) =>
    Array.from(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []);

export const ContextMenu = () => {
    const visible = useStore((s) => s.visible);
    const items = useStore((s) => s.items);
    const closeMenu = useStore((s) => s.closeMenu);
    const x = useStore((s) => s.x);
    const y = useStore((s) => s.y);
    const menuRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x, y });

    // BUG-216: focus the first item on open, give focus back on close (keyboard + screen readers)
    useEffect(() => {
        if (!visible) return;
        const before = document.activeElement as HTMLElement | null;
        menuItems(menuRef.current)[0]?.focus();
        return () => {
            if (before?.isConnected) before.focus();
        };
    }, [visible]);

    // keep the whole menu on screen (phones, a long press near an edge); it scrolls when too tall
    useLayoutEffect(() => {
        const el = menuRef.current;
        if (!visible || !el) return;
        const { width, height } = el.getBoundingClientRect();
        setPos({
            x: Math.max(EDGE, Math.min(x, window.innerWidth - width - EDGE)),
            y: Math.max(EDGE, Math.min(y, window.innerHeight - height - EDGE)),
        });
    }, [visible, x, y, items]);

    // Escape closes it, like every other menu (BUG-128)
    useEffect(() => {
        if (!visible) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeMenu();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [visible, closeMenu]);

    if (!visible) return null;

    // 1. Apply visibility rules safely
    const visibleItems = items.filter((item) => {
        if (typeof item.when === 'function') {
            return item.when();
        }
        return true;
    });

    // 2. Remove useless dividers
    const finalItems = visibleItems.filter((item, index) => {
        if (item.type !== 'divider') return true;

        const prev = visibleItems[index - 1];
        const next = visibleItems[index + 1];

        return prev && next && prev.type !== 'divider' && next.type !== 'divider';
    });

    // 3. Nothing to show
    if (finalItems.length === 0) return null;

    const onMenuKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            closeMenu();
            return;
        }
        const list = menuItems(menuRef.current);
        if (!list.length) return;
        const i = list.indexOf(document.activeElement as HTMLButtonElement);
        const next =
            e.key === 'ArrowDown'
                ? (i + 1) % list.length
                : e.key === 'ArrowUp'
                  ? (i - 1 + list.length) % list.length
                  : e.key === 'Home'
                    ? 0
                    : e.key === 'End'
                      ? list.length - 1
                      : -1;
        if (next < 0) return;
        e.preventDefault();
        list[next].focus();
    };

    return (
        <>
            {/* backdrop */}
            <div className="fixed inset-0 z-40" onClick={closeMenu} />

            {/* menu */}
            <div
                ref={menuRef}
                role="menu"
                aria-label="Canvas actions"
                onKeyDown={onMenuKey}
                className="fixed z-50 max-h-[calc(100dvh-16px)] min-w-[220px] max-w-[calc(100vw-16px)]
                   overflow-y-auto overscroll-contain rounded-lg bg-surface shadow-lg border border-line p-1"
                style={{ top: Math.max(EDGE, pos.y), left: Math.max(EDGE, pos.x) }}
            >
                {finalItems.map((item, i) => {
                    if (item.type === 'divider') {
                        return (
                            <div
                                key={item.id ?? i}
                                role="separator"
                                className="my-1 h-px bg-surface-strong"
                            />
                        );
                    }

                    return (
                        <button
                            key={item.id ?? i}
                            role="menuitem"
                            disabled={item.disabled}
                            onClick={() => {
                                item.onClick();
                                closeMenu();
                            }}
                            className="
                                flex w-full items-center justify-between
                                rounded-lg px-3 py-2 text-sm pointer-coarse:py-3
                                outline-none hover:bg-surface-muted focus-visible:bg-surface-muted
                                disabled:opacity-40
                            "
                        >
                            <span className="flex items-center gap-2">
                                {item.icon}
                                {item.label}
                            </span>

                            {item.shortcut && (
                                <span className="text-xs text-ink-subtle">{item.shortcut}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </>
    );
};
