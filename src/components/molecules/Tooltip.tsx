import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 8;
const DELAY = 300;

type Position = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
    content: React.ReactNode;
    position?: Position;
    children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, position = 'top', children }) => {
    const triggerRef = useRef<HTMLElement | null>(null);
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const timerRef = useRef<number | null>(null);

    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const [finalPos, setFinalPos] = useState<Position>(position);

    useEffect(() => {
        return () => {
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, []);

    const show = () => {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            setVisible(true);
        }, DELAY);
    };

    const hide = () => {
        if (timerRef.current) {
            window.clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setVisible(false);
    };

    // Measure layout synchronously to avoid flicker
    useLayoutEffect(() => {
        if (!visible || !triggerRef.current || !tooltipRef.current) return;

        const t = triggerRef.current.getBoundingClientRect();
        const tip = tooltipRef.current.getBoundingClientRect();

        const calc = (pos: Position) => {
            switch (pos) {
                case 'bottom':
                    return {
                        top: t.bottom + GAP,
                        left: t.left + t.width / 2 - tip.width / 2,
                    };
                case 'left':
                    return {
                        top: t.top + t.height / 2 - tip.height / 2,
                        left: t.left - tip.width - GAP,
                    };
                case 'right':
                    return {
                        top: t.top + t.height / 2 - tip.height / 2,
                        left: t.right + GAP,
                    };
                default:
                    return {
                        top: t.top - tip.height - GAP,
                        left: t.left + t.width / 2 - tip.width / 2,
                    };
            }
        };

        let pos: Position = position;
        let { top, left } = calc(pos);

        // Auto flip if out of viewport
        if (top < 4 && pos === 'top') pos = 'bottom';
        if (top + tip.height > window.innerHeight && pos === 'bottom') pos = 'top';
        if (left < 4 && pos === 'left') pos = 'right';
        if (left + tip.width > window.innerWidth && pos === 'right') pos = 'left';

        ({ top, left } = calc(pos));

        setFinalPos(pos);
        setCoords({
            top: Math.max(6, Math.round(top)),
            left: Math.max(6, Math.round(left)),
        });
    }, [visible, position]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') hide();
    };

    const tooltipIdRef = useRef<string>(`tooltip-${Math.random().toString(36).slice(2)}`);

    const portalTarget = typeof document !== 'undefined' ? document.body : null;

    return (
        <>
            <span
                ref={triggerRef as React.RefObject<HTMLSpanElement>}
                className="inline-flex"
                onMouseEnter={show}
                onMouseLeave={hide}
                onClick={hide}
                onFocus={show}
                onBlur={hide}
                onKeyDown={onKeyDown}
                tabIndex={0}
                aria-describedby={content ? tooltipIdRef.current : undefined}
            >
                {children}
            </span>

            {visible && portalTarget
                ? createPortal(
                      <div
                          id={tooltipIdRef.current}
                          ref={tooltipRef}
                          role="tooltip"
                          aria-hidden={!visible}
                          style={{
                              position: 'fixed',
                              top: coords.top,
                              left: coords.left,
                          }}
                          className={
                              'animate-tooltip z-[9999] rounded-md bg-white px-3 py-1.5 text-[11px] font-medium text-gray-900 shadow-[0_8px_24px_rgba(0,0,0,0.18)] whitespace-nowrap pointer-events-none animate-tooltip-min'
                          }
                      >
                          {content}

                          <div
                              className={`absolute w-1.5 h-1.5 bg-white rotate-45 ${
                                  finalPos === 'top'
                                      ? 'bottom-[-3px] left-1/2 -translate-x-1/2'
                                      : finalPos === 'bottom'
                                        ? 'top-[-3px] left-1/2 -translate-x-1/2'
                                        : finalPos === 'left'
                                          ? 'right-[-3px] top-1/2 -translate-y-1/2'
                                          : 'left-[-3px] top-1/2 -translate-y-1/2'
                              }`}
                          />
                      </div>,
                      portalTarget,
                  )
                : null}
        </>
    );
};
