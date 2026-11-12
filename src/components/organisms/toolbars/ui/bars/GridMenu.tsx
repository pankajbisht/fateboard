import clsx from 'clsx';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@/store';
import { Icon } from '@/components/atoms/Icon';
import IconButton from '@/components/atoms/IconButton';
import { Switch } from '@/components/atoms/Switch';
import { Button } from '@/components/atoms/Button';
import { SliderField } from '@/components/molecules/LabeledSlider';
import { Tooltip } from '@/components/molecules/Tooltip';
import {
    DEFAULT_GRID_SIZE,
    GRID_STYLES,
    GRID_STYLE_LABELS,
    MAX_GRID_SIZE,
    MIN_GRID_SIZE,
    type GridStyle,
} from '@/lib/canvas/grid';
import { toUnit, unitPrecision } from '@/lib/units';

/** 24 × 24 previews drawn with currentColor (light / dark follow the text color). */
const PREVIEW: Record<GridStyle, ReactNode> = {
    lines: (
        <>
            <path d="M8 0v24M16 0v24M0 8h24M0 16h24" strokeOpacity={0.45} />
            <path d="M4 0v24M0 20h24" strokeWidth={1.6} />
        </>
    ),
    plain: <path d="M4 0v24M10 0v24M16 0v24M22 0v24M0 4h24M0 10h24M0 16h24M0 22h24" />,
    dashed: (
        <path
            d="M6 0v24M14 0v24M22 0v24M0 6h24M0 14h24M0 22h24"
            strokeDasharray="2 2"
            strokeDashoffset={1}
        />
    ),
    dots: (
        <g fill="currentColor" stroke="none">
            {[5, 12, 19].flatMap((x) =>
                [5, 12, 19].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.4} />),
            )}
        </g>
    ),
    crosses: (
        <path d="M3 5h4M5 3v4M10 5h4M12 3v4M17 5h4M19 3v4M3 12h4M5 10v4M10 12h4M12 10v4M17 12h4M19 10v4M3 19h4M5 17v4M10 19h4M12 17v4M17 19h4M19 17v4" />
    ),
    isometric: (
        <path d="M0 5h24M0 12h24M0 19h24M-2 21L9 2M5 21L16 2M12 21L23 2M2 2l11 19M9 2l11 19M16 2l11 19" />
    ),
    ruled: <path d="M0 5h24M0 10h24M0 15h24M0 20h24" />,
};

/** Grid options next to the top-bar grid toggle: style, cell size, snap. */
export const GridMenu = () => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, right: 0 });
    const anchorRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const gridEnabled = useStore((s) => s.gridEnabled);
    const gridStyle = useStore((s) => s.gridStyle);
    const gridSize = useStore((s) => s.gridSize);
    const snapEnabled = useStore((s) => s.snapEnabled);
    const unit = useStore((s) => s.settings.unit);
    const setGridEnabled = useStore((s) => s.setGridEnabled);
    const setGridStyle = useStore((s) => s.setGridStyle);
    const setGridSize = useStore((s) => s.setGridSize);
    const setSnapEnabled = useStore((s) => s.setSnapEnabled);

    // The top bar clips its overflow, so the panel is portaled to <body> and placed under the button.
    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const r = anchorRef.current?.getBoundingClientRect();
            if (r) setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
        };
        place();
        window.addEventListener('resize', place);
        return () => window.removeEventListener('resize', place);
    }, [open]);

    // keyboard: opening moves focus into the panel (the current style), like ColorPickerPopover
    useEffect(() => {
        if (open) panelRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus();
    }, [open]);

    // close on a click outside and on Escape (Escape gives focus back to the button)
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => {
            const t = e.target as Node;
            if (!anchorRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return;
            e.preventDefault();
            setOpen(false);
            anchorRef.current?.querySelector<HTMLElement>('button')?.focus();
        };
        document.addEventListener('pointerdown', onDown, true);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('pointerdown', onDown, true);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const pickStyle = (style: GridStyle) => {
        setGridStyle(style);
        if (!gridEnabled) setGridEnabled(true); // picking a look means you want to see it
    };

    const formatSize = (px: number) => `${toUnit(px, unit).toFixed(unitPrecision(unit))} ${unit}`;

    return (
        <div ref={anchorRef}>
            <Tooltip position="bottom" content="Grid options">
                <IconButton
                    icon={<Icon name="chevron-down" />}
                    aria-label="Grid options"
                    aria-expanded={open}
                    aria-haspopup="dialog"
                    onClick={() => setOpen((v) => !v)}
                    size="chrome"
                    className="w-4!"
                />
            </Tooltip>
            {open &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="dialog"
                        aria-label="Grid options"
                        style={pos}
                        className="fixed z-[9999] w-64 space-y-3 rounded-lg border border-line-strong bg-surface-raised p-3 text-ink shadow-lg"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-title">Grid</span>
                            <Switch
                                size="sm"
                                checked={gridEnabled}
                                onChange={setGridEnabled}
                                aria-label="Grid visible"
                            />
                        </div>
                        <div
                            className="grid grid-cols-4 gap-1.5"
                            role="group"
                            aria-label="Grid style"
                        >
                            {GRID_STYLES.map((style) => (
                                <Button
                                    key={style}
                                    variant="ghost"
                                    aria-pressed={gridStyle === style}
                                    onClick={() => pickStyle(style)}
                                    className={clsx(
                                        'h-auto! flex-col gap-1! px-0! py-1.5 text-[10px]! font-medium!',
                                        gridStyle === style
                                            ? 'bg-primary-100! text-primary-ink! ring-1 ring-primary-400'
                                            : 'bg-surface-strong text-ink-muted hover:text-ink',
                                    )}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="size-6 overflow-hidden rounded-sm"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={1}
                                        aria-hidden
                                    >
                                        {PREVIEW[style]}
                                    </svg>
                                    {GRID_STYLE_LABELS[style]}
                                </Button>
                            ))}
                        </div>
                        <SliderField
                            label="Size"
                            min={MIN_GRID_SIZE}
                            max={MAX_GRID_SIZE}
                            value={gridSize}
                            defaultValue={DEFAULT_GRID_SIZE}
                            onChange={setGridSize}
                            format={formatSize}
                        />
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-ink-muted">Snap to grid and objects</span>
                            <Switch
                                size="sm"
                                checked={snapEnabled}
                                onChange={setSnapEnabled}
                                aria-label="Snap"
                            />
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
};
