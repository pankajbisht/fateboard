import React, { useEffect, useRef, useState } from 'react';
import { ColorPicker } from './ColorPicker';

type DockSide = 'left' | 'right';

type PanelItem = {
    label: string;
    icon?: string;
    onClick: () => void;
};

type Props = {
    items: PanelItem[];
    open: boolean;
    width: number;
    side: DockSide;
    setWidth: (w: number) => void;
    toggleOpen: () => void;
    toggleSide: () => void;
};

const SNAP_POINTS = [160, 240, 320, 400];

export function useDockResize(
    side: 'left' | 'right',
    width: number,
    setWidth: (w: number) => void,
    open: boolean,
    setOpen: (v: boolean) => void,
) {
    const resizing = useRef(false);
    const raf = useRef<number | null>(null);

    const start = (e: React.MouseEvent) => {
        resizing.current = true;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        if (!open) setOpen(true);
    };

    const stop = () => {
        resizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        if (raf.current) cancelAnimationFrame(raf.current);
    };

    const move = (e: MouseEvent) => {
        if (!resizing.current) return;

        if (!raf.current) {
            raf.current = requestAnimationFrame(() => {
                const raw = side === 'right' ? window.innerWidth - e.clientX : e.clientX;

                const clamped = Math.min(Math.max(raw, 20), 420);

                const snapped = SNAP_POINTS.find((p) => Math.abs(p - clamped) < 1) ?? clamped;

                setWidth(snapped);
                raf.current = null;
            });
        }
    };

    useEffect(() => {
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', stop);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', stop);
        };
    }, [side]);

    return { start, stop };
}

type StripItem = {
    id: string;
    icon: React.ReactNode;
};

export const DockStrip = ({
    items,
    active,
    open,
    onToggle,
    onMenuToggle,
}: {
    items: StripItem[];
    active: string | null;
    open: boolean;
    onToggle: (id: string) => void;
    onMenuToggle: () => void;
}) => {
    return (
        <div className="w-8 flex flex-col items-center py-2 gap-2 bg-white">
            <div className="h-px w-8 my-1" />

            {/* Panel Icons */}
            {items.map((item) => {
                const isActive = open && active === item.id;

                return (
                    <button
                        key={item.id}
                        onMouseDown={() => onToggle(item.id)}
                        className={`
              w-5 h-5 rounded-sm
              transition-colors
              ${isActive ? 'bg-blue-500' : 'bg-zinc-700'}
              hover:bg-blue-400
            `}
                    >
                        {item.icon}
                    </button>
                );
            })}
        </div>
    );
};

export const DockPanel = ({
    open,
    width = 280,
    onToggle,
    scrollRef,
    onScrollSave,
    children,
}: {
    open: boolean;
    width?: number;
    onToggle: () => void;
    scrollRef: React.RefObject<HTMLDivElement>;
    onScrollSave: (scrollTop: number) => void;
    children: React.ReactNode;
}) => {
    return (
        <div className="relative flex h-full">
            {/* 3-dot handle */}
            <button
                onClick={onToggle}
                className="w-2 border border-stone-400 cursor-ew-resize flex items-center justify-center bg-stone-100 hover:bg-stone-200"
            >
                <i className="fa-solid fa-ellipsis-vertical" />
            </button>

            {/* panel */}
            {/*<div
        className="bg-white shadow-xl border-l transition-[width,opacity] duration-300 overflow-hidden"
        style={{ width: open ? width : 0, opacity: open ? 1 : 0 }}
      >
        <div
          ref={scrollRef}
          onScroll={(e) =>
            onScrollSave((e.target as HTMLDivElement).scrollTop)
          }
          className="h-full overflow-y-auto p-3"
        >
          {children}
        </div>
      </div>*/}
        </div>
    );
};

type PanelState = {
    scrollTop: number;
};

type PanelMemory = Record<string, PanelState>;

export const DockRoot = () => {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState<string>('props');

    const panelMemory = useRef<PanelMemory>({
        props: { scrollTop: 0 },
        layers: { scrollTop: 0 },
        assets: { scrollTop: 0 },
    });

    const scrollRef = useRef<HTMLDivElement>(null);

    // restore scroll when panel changes
    useEffect(() => {
        if (!open) return;
        const mem = panelMemory.current[active];
        if (scrollRef.current && mem) {
            scrollRef.current.scrollTop = mem.scrollTop;
        }
    }, [active, open]);

    const togglePanel = (id: string) => {
        if (open && active === id) {
            setOpen(false);
        } else {
            setActive(id);
            setOpen(true);
        }
    };

    return (
        <aside className="flex" style={{ height: 'calc(100vh - 56px - 40px)' }}>
            <DockPanel
                open={open}
                onToggle={() => setOpen((o) => !o)}
                scrollRef={scrollRef}
                onScrollSave={(scrollTop) => {
                    panelMemory.current[active].scrollTop = scrollTop;
                }}
            >
                {active === 'props' && <h1>sda</h1>}
                {active === 'layers' && <h1>sda</h1>}
                {active === 'assets' && <h1>sda</h1>}
            </DockPanel>

            <ColorPicker />
        </aside>
    );
};
