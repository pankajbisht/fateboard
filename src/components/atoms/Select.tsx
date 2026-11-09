import clsx from 'clsx';
import {
    Fragment,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from './Icon';
import { CONTROL_BOX, CONTROL_SIZE, type ControlSize } from './control.styles';
import { useControlSize } from './controlSize';

export type SelectOption<T extends string | number = string> = {
    value: T;
    label: string;
    icon?: IconName;
    /** Second line, muted. */
    description?: string;
    disabled?: boolean;
    /** Group header shown above the first option of each group (e.g. font categories). */
    group?: string;
    /** Style for the label (e.g. `{ fontFamily }` to preview a font in its own face). */
    style?: React.CSSProperties;
};

export type SelectProps<T extends string | number = string> = {
    options: SelectOption<T>[];
    value?: T | null;
    onChange?: (value: T) => void;
    placeholder?: string;
    size?: ControlSize;
    disabled?: boolean;
    /** Fill the container width (default). false = size to content, for toolbars. */
    block?: boolean;
    id?: string;
    className?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
};

const LIST_MAX_HEIGHT = 256;

/**
 * The app's dropdown: a themed trigger + floating option list (WAI-ARIA select-only combobox).
 * Keyboard: Arrow keys / Home / End move, Enter / Space choose, Escape / Tab close, letters jump.
 * The list is portalled to <body> so scrolling panels never clip it.
 */
export function Select<T extends string | number = string>({
    options,
    value,
    onChange,
    placeholder = 'Select…',
    size: sizeProp,
    disabled = false,
    block = true,
    id,
    className,
    ...aria
}: SelectProps<T>) {
    const size = useControlSize(sizeProp) as ControlSize;
    const uid = useId();
    const listId = `${uid}-listbox`;
    const optionId = (i: number) => `${uid}-option-${i}`;

    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const typeahead = useRef({ text: '', at: 0 });

    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

    const selectedIndex = options.findIndex((o) => o.value === value);
    const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

    /** Next enabled index from `from` in direction `dir` (no wrap). */
    const step = (from: number, dir: 1 | -1) => {
        for (let i = from + dir; i >= 0 && i < options.length; i += dir) {
            if (!options[i].disabled) return i;
        }
        return from;
    };

    const openList = () => {
        if (disabled) return;
        setActive(selectedIndex >= 0 ? selectedIndex : step(-1, 1));
        setOpen(true);
    };

    const choose = (i: number) => {
        const option = options[i];
        if (!option || option.disabled) return;
        if (option.value !== value) onChange?.(option.value);
        setOpen(false);
        triggerRef.current?.focus();
    };

    /** Letter keys: jump to the next option whose label starts with the typed text. */
    const jumpTo = (key: string) => {
        const now = Date.now();
        const t = typeahead.current;
        t.text = now - t.at > 700 ? key.toLowerCase() : t.text + key.toLowerCase();
        t.at = now;
        const start = open ? active : selectedIndex;
        const n = options.length;
        for (let k = 1; k <= n; k++) {
            const i = (start + k + n) % n;
            if (!options[i].disabled && options[i].label.toLowerCase().startsWith(t.text)) {
                if (open) setActive(i);
                else choose(i);
                return;
            }
        }
    };

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        let handled = true;
        switch (e.key) {
            case 'ArrowDown':
                if (open) setActive((a) => step(a, 1));
                else openList();
                break;
            case 'ArrowUp':
                if (open) setActive((a) => step(a, -1));
                else openList();
                break;
            case 'Home':
                if (open) setActive(step(-1, 1));
                else handled = false;
                break;
            case 'End':
                if (open) setActive(step(options.length, -1));
                else handled = false;
                break;
            case 'Enter':
            case ' ':
                if (open) choose(active);
                else openList();
                break;
            case 'Tab':
                setOpen(false);
                handled = false;
                break;
            default:
                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) jumpTo(e.key);
                else handled = false;
        }
        if (handled) {
            e.preventDefault();
            e.stopPropagation(); // arrows / letters must not reach canvas shortcuts
        }
    };

    // Escape: handled natively on the trigger so it never reaches a parent modal or shortcut listener.
    useEffect(() => {
        const el = triggerRef.current;
        if (!open || !el) return;
        const onEscape = (e: globalThis.KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
        };
        el.addEventListener('keydown', onEscape);
        return () => el.removeEventListener('keydown', onEscape);
    }, [open]);

    // close on outside press
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    // position under (or above) the trigger; follow scroll / resize
    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const r = triggerRef.current?.getBoundingClientRect();
            if (!r) return;
            const height = Math.min(
                LIST_MAX_HEIGHT,
                listRef.current?.scrollHeight ?? LIST_MAX_HEIGHT,
            );
            const below = window.innerHeight - r.bottom;
            const flip = below < height + 8 && r.top > below;
            setPos({ top: flip ? r.top - height - 4 : r.bottom + 4, left: r.left, width: r.width });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open]);

    useEffect(() => {
        if (open && active >= 0)
            document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, active]);

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                id={id}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
                disabled={disabled}
                onClick={() => (open ? setOpen(false) : openList())}
                onKeyDown={onKeyDown}
                className={clsx(
                    'flex min-w-0 items-center gap-2 px-2.5 text-left',
                    block ? 'w-full' : 'w-auto min-w-24 max-w-56',
                    CONTROL_BOX,
                    CONTROL_SIZE[size],
                    open && 'border-primary-500 ring-2 ring-primary-400/30',
                    className,
                )}
                {...aria}
            >
                {selected?.icon && <Icon name={selected.icon} className="text-ink-muted" />}
                <span className={clsx('min-w-0 flex-1 truncate', !selected && 'text-ink-subtle')}>
                    {selected ? selected.label : placeholder}
                </span>
                <Icon
                    name="chevron-down"
                    className={clsx('text-ink-subtle transition-transform', open && 'rotate-180')}
                />
            </button>

            {open &&
                createPortal(
                    <ul
                        ref={listRef}
                        id={listId}
                        role="listbox"
                        aria-label={aria['aria-label']}
                        aria-labelledby={aria['aria-labelledby']}
                        style={{ top: pos.top, left: pos.left, minWidth: Math.max(pos.width, 140) }}
                        className="fixed z-[10050] max-h-64 overflow-auto rounded-md border border-line bg-surface-raised p-1 shadow-lg"
                    >
                        {options.map((option, i) => {
                            const isSelected = i === selectedIndex;
                            const header =
                                option.group && option.group !== options[i - 1]?.group
                                    ? option.group
                                    : null;
                            return (
                                <Fragment key={String(option.value)}>
                                    {header && (
                                        <li
                                            role="presentation"
                                            data-group
                                            className="sticky top-0 z-10 bg-surface-raised px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-subtle"
                                        >
                                            {header}
                                        </li>
                                    )}
                                    <li
                                        id={optionId(i)}
                                        role="option"
                                        aria-selected={isSelected}
                                        aria-disabled={option.disabled || undefined}
                                        onMouseDown={(e) => e.preventDefault()} // keep focus on the trigger
                                        onMouseEnter={() => !option.disabled && setActive(i)}
                                        onClick={() => choose(i)}
                                        className={clsx(
                                            'flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-xs text-ink',
                                            i === active && 'bg-surface-strong',
                                            isSelected && 'font-semibold text-primary-ink',
                                            option.disabled && 'cursor-not-allowed opacity-40',
                                        )}
                                    >
                                        <Icon
                                            name="check"
                                            className={clsx(
                                                'text-primary-ink',
                                                !isSelected && 'invisible',
                                            )}
                                        />
                                        {option.icon && (
                                            <Icon name={option.icon} className="text-ink-muted" />
                                        )}
                                        <span className="min-w-0 flex-1">
                                            <span
                                                data-label
                                                className="block truncate"
                                                style={option.style}
                                            >
                                                {option.label}
                                            </span>
                                            {option.description && (
                                                <span className="block truncate text-[11px] font-normal text-ink-subtle">
                                                    {option.description}
                                                </span>
                                            )}
                                        </span>
                                    </li>
                                </Fragment>
                            );
                        })}
                    </ul>,
                    document.body,
                )}
        </>
    );
}

export default Select;
