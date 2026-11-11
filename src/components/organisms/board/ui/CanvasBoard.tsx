/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@store';
import { useThemeVersion } from '@hooks/useThemeVersion';
import { restyleSelectionChrome } from '@/lib/fabricChrome';
import { useKeyboardShortcuts } from '@/hooks';
import { useSpacePan } from '@/hooks/keyboard/useSpacePan';
import { FloatingTextToolbar } from '@/components/organisms/FloatingTextToolbar';
import { NodeToolbar } from '@/components/organisms/NodeToolbar';
import { contextMenuRegistry } from '@/components/config/contextMenuRegistry';
import type { CanvasPreset } from '@/components/organisms/board/board.type';
import { DEFAULT_CANVAS_PRESET } from '../board.config';
import Ruler, { RULER_SIZE, createPointerSource, type RulerUnit } from './Ruler';
import { isTextFloatTarget } from '@/lib/textTargets';
import { designRenderRatio } from '@/lib/canvas/renderRatio';

export type CanvasMode = 'design' | 'whiteboard';

/** The mode used when nothing says otherwise. */
const DEFAULT_MODE: CanvasMode = 'design';

const ARTBOARD_GAP = 48;
const MIN_FIT_SCALE = 0.05;
const MAX_FIT_SCALE = 1;

// floating text toolbar placement
// const TOOLBAR_GAP = 10; // space between toolbar and text
// const TOOLBAR_HEIGHT = 48; // used to decide above / below
// const TOOLBAR_EDGE = 4; // keep this far from the container edge
// const TOOLBAR_FALLBACK_WIDTH = 340;

// floating text toolbar placement
const TOOLBAR_GAP = 10; // gap when the toolbar is BELOW the text
const TOOLBAR_GAP_ABOVE = 60; // gap when ABOVE: must clear Fabric's rotation handle (~40px offset + handle size)
const NODE_TOOLBAR_GAP_ABOVE = 16; // node editing shows no rotation handle
const TOOLBAR_HEIGHT = 48; // used to decide above / below
const TOOLBAR_EDGE = 4; // keep this far from the container edge
const TOOLBAR_FALLBACK_WIDTH = 340;

/**
 * Board colors, following design tools (Figma, Canva, Illustrator):
 *
 * - The page is pure white, so what you see is what you export (the canvas is transparent when
 *   no background is set and this colour shows through).
 * - The workspace around it is a theme-tinted token, so the page is the brightest thing on screen.
 * - The page edge is a soft shadow plus a hairline, not a hard gray border.
 */
const THEME = {
    workspace: 'var(--color-workspace)', // area around the artboard (token: switches in dark mode)
    chrome: 'var(--color-surface-strong)', // ruler corner / bars
    chromeBorder: 'var(--color-line-strong)',
    artboard: '#ffffff', // page surface (not themed: it is the document)
    artboardBorder: 'rgba(15, 23, 42, 0.08)', // hairline, keeps the edge visible on light workspaces
    artboardShadow: '0 1px 3px rgba(15, 23, 42, 0.10), 0 8px 24px rgba(15, 23, 42, 0.08)',
    whiteboard: 'var(--color-board)', // whiteboard paper (token: tinted by the color theme)
};

/** Whiteboard dot grid spacing in canvas px at zoom 1. */

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

/** Accepts the usual preset shapes: {width,height} | {w,h} | {size:{width,height}} */
function getPresetSize(p: any): { width: number; height: number } | null {
    if (!p) return null;
    const width = Number(p.width ?? p.w ?? p.size?.width);
    const height = Number(p.height ?? p.h ?? p.size?.height);
    return width > 0 && height > 0 ? { width, height } : null;
}

type Anchor = {
    /** horizontal centre of the text, relative to the canvas host (CSS px) */
    cx: number;
    /** top / bottom edge of the text, relative to the canvas host (CSS px) */
    top: number;
    bottom: number;
    /** width of the canvas host (used to keep the toolbar inside it in whiteboard mode) */
    hostW: number;
};

/**
 * One component for BOTH screens.
 *
 *   <CanvasBoard />                                   whiteboard (default): fills its container, no rulers
 *   <CanvasBoard mode="design" pageSize={preset} />   page of exactly W x H, with rulers + artboard
 *
 * Mode priority: `mode` prop > settings.freehand === 'design' > whiteboard.
 * Switching mode disposes the old Fabric canvas (store.canvas -> null) and creates a new one,
 * carrying the content over.
 */
export function CanvasBoard({
    mode,
    pageSize,
}: {
    mode?: CanvasMode;
    pageSize?: CanvasPreset | null;
}) {
    const freehand = useStore((s: any) => s.settings?.freehand);
    const storePreset = useStore((s: any) => s.selectedPreset);

    // the Editor passes the mode; without it, follow Settings > Freehand (boolean)
    const resolved: CanvasMode = mode ?? (freehand ? 'whiteboard' : DEFAULT_MODE);

    return (
        <CanvasSurface
            key={resolved}
            mode={resolved}
            pageSize={pageSize ?? storePreset ?? DEFAULT_CANVAS_PRESET}
        />
    );
}

export default CanvasBoard;

function CanvasSurface({ mode, pageSize }: { mode: CanvasMode; pageSize?: CanvasPreset | null }) {
    const isWhiteboard = mode === 'whiteboard';

    const canvas = useStore((s: any) => s.canvas);
    const openMenu = useStore((s: any) => s.openMenu);
    const selectedObject = useStore((s: any) => s.selectedObject);
    const nodeMode = useStore((s: any) => s.nodeMode as boolean);
    const nodePath = useStore((s: any) => s.activePath);
    const userZoom = useStore((s: any) => (typeof s.zoom === 'number' ? s.zoom : 1));
    const rulerUnit = useStore((s: any) => s.settings?.unit ?? 'px') as RulerUnit;
    const setBoardMode = useStore((s: any) => s.setBoardMode);
    const themeVersion = useThemeVersion();

    /* selection handles take the current brand color (on mount and on theme change) */
    useEffect(() => {
        if (!canvas) return; // also on mount: the theme may have changed while the editor was closed
        restyleSelectionChrome(canvas.getObjects());
        canvas.requestRenderAll();
    }, [canvas, themeVersion]);

    useKeyboardShortcuts();
    useSpacePan();

    // The canvas element is created in code: Fabric moves <canvas> into its own wrapper, which
    // breaks React's removeChild on unmount / StrictMode when the element is JSX.
    const hostRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const toolbarRef = useRef<HTMLDivElement | null>(null);

    /* ------------------------------------------------------------------ */
    /* Fabric lifecycle                                                   */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        const el = document.createElement('canvas');
        host.appendChild(el);

        useStore.getState().init(el, host);
        const c = useStore.getState().canvas;
        if (!c) {
            host.replaceChildren();
            return;
        }

        // Fabric fires 'contextmenu' with the object under the cursor and stops the event from
        // bubbling, so the React onContextMenu below only sees clicks AROUND the canvas.
        c.stopContextMenu = true;
        const onContextMenu = (opt: any) => {
            const e: MouseEvent = opt.e;
            const target = opt.target ?? null;

            // right-click selects what is under the cursor (Fabric does not do this itself)
            if (target) {
                if (!c.getActiveObjects().includes(target)) c.setActiveObject(target);
            } else {
                c.discardActiveObject();
            }
            c.requestRenderAll();

            openMenu(e.clientX, e.clientY, contextMenuRegistry, target);
        };
        c.on('contextmenu', onContextMenu);

        // Fabric caches the canvas position on the page and subtracts it from every pointer event.
        // It goes stale on scroll / layout shifts: clicks and selection boxes land offset.
        const refreshOffset = () => c.calcOffset?.();
        host.addEventListener('pointerdown', refreshOffset, true);
        host.addEventListener('pointerenter', refreshOffset);
        window.addEventListener('scroll', refreshOffset, true);
        window.addEventListener('resize', refreshOffset);

        // One loader (BUG-016): after a mode switch / remount the canvas slice's init() restores the
        // autosaved project (dispose() flushed it first). Re-importing a snapshot here raced with it.
        (useStore.getState() as any).initHistory?.();

        return () => {
            host.removeEventListener('pointerdown', refreshOffset, true);
            host.removeEventListener('pointerenter', refreshOffset);
            window.removeEventListener('scroll', refreshOffset, true);
            window.removeEventListener('resize', refreshOffset);

            const s: any = useStore.getState();
            if (s.canvas) s.canvas.off('contextmenu', onContextMenu);

            // dispose() nulls store.canvas synchronously (before awaiting Fabric), so the next
            // surface can init() right away. Fallback for an older slice without dispose().
            if (typeof s.dispose === 'function') {
                void s.dispose();
            } else {
                s.canvas?.dispose?.();
                useStore.setState({ canvas: null, geditor: null } as any);
            }
            s.clearToolbar?.();
            host.replaceChildren();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ------------------------------------------------------------------ */
    /* WHITEBOARD: canvas always covers its container (no fixed size)     */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        if (!isWhiteboard || !canvas) return;
        const host = hostRef.current;
        if (!host) return;

        const resize = () => {
            const width = host.clientWidth;
            const height = host.clientHeight;
            if (!width || !height) {
                console.warn(
                    '[CanvasBoard] whiteboard host has no size (%sx%s). A parent has no height: give it h-full / flex-1 / min-h-0.',
                    width,
                    height,
                );
                return;
            }
            canvas.setDimensions({ width, height });
            canvas.calcOffset?.();
            canvas.requestRenderAll();
        };

        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(host);
        return () => ro.disconnect();
    }, [canvas, isWhiteboard]);

    // WHITEBOARD grid: drawn by the notebook slice only (follows zoom + snap spacing). The CSS dot
    // overlay that was here doubled it with a different spacing (BUG-107).

    /** pointer inside the scroll viewport (CSS px). Not React state: only the ruler markers follow it. */
    const [pointer] = useState(createPointerSource);
    const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
    const [viewport, setViewport] = useState({ w: 0, h: 0 });
    const [anchor, setAnchor] = useState<Anchor | null>(null);
    const rafRef = useRef(0);
    const insideRef = useRef(false);

    const presetSize = getPresetSize(pageSize);
    const sizeW = presetSize?.width;
    const sizeH = presetSize?.height;
    const size = useMemo(
        () => (sizeW && sizeH ? { width: sizeW, height: sizeH } : null),
        [sizeW, sizeH],
    );

    // The rulers are OUTSIDE the scroll area, so `viewport` is already the usable area.
    const fitScale = useMemo(() => {
        if (isWhiteboard || !size || viewport.w <= 0 || viewport.h <= 0) return 1;

        const availableWidth = Math.max(1, viewport.w - ARTBOARD_GAP * 2);
        const availableHeight = Math.max(1, viewport.h - ARTBOARD_GAP * 2);

        return clamp(
            Math.min(availableWidth / size.width, availableHeight / size.height, MAX_FIT_SCALE),
            MIN_FIT_SCALE,
            MAX_FIT_SCALE,
        );
    }, [isWhiteboard, size?.width, size?.height, viewport.w, viewport.h]); // eslint-disable-line react-hooks/exhaustive-deps

    // user zoom (footer slider, toolbar +/-, Pages panel) scales the drawn page; the stage scrolls
    const zoom = isWhiteboard ? 1 : userZoom;
    const displaySize = useMemo(() => {
        if (!size) return null;
        return {
            width: Math.max(1, Math.round(size.width * fitScale * zoom)),
            height: Math.max(1, Math.round(size.height * fitScale * zoom)),
        };
    }, [size?.width, size?.height, fitScale, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

    /* DESIGN: Ctrl / ⌘ + wheel (and a trackpad pinch) over the grey board zooms the page, not the
       browser. Over the page itself the canvas handles it (createCanvasSlice `handleWheel`) and stops
       the event, so it is never applied twice. A plain wheel scrolls the board as usual. */
    useEffect(() => {
        const el = scrollRef.current;
        if (isWhiteboard || !el || !canvas) return;
        const onWheel = (e: WheelEvent) => {
            if (useStore.getState().wheelNavigate(e)) e.preventDefault();
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [isWhiteboard, canvas]);

    /* the store's zoom actions only change state while this board owns the geometry (ADR Q2) */
    useEffect(() => {
        setBoardMode?.(isWhiteboard ? 'whiteboard' : 'design');
        return () => setBoardMode?.(null);
    }, [isWhiteboard, setBoardMode]);

    /* publish the fit scale: visible zoom % = fit scale × zoom (footer, Pages panel) */
    useEffect(() => {
        if (!isWhiteboard) useStore.setState({ scale: fitScale } as any);
    }, [isWhiteboard, fitScale]);

    /* keep the view centred on the same spot when the zoom changes */
    const prevDisplay = useRef(displaySize);
    useLayoutEffect(() => {
        const el = scrollRef.current;
        const prev = prevDisplay.current;
        prevDisplay.current = displaySize;
        if (isWhiteboard || !el || !prev || !displaySize || prev.width === displaySize.width)
            return;
        const k = displaySize.width / prev.width;
        const cx = el.scrollLeft + el.clientWidth / 2;
        const cy = el.scrollTop + el.clientHeight / 2;
        el.scrollLeft = Math.max(0, cx * k - el.clientWidth / 2);
        el.scrollTop = Math.max(0, cy * k - el.clientHeight / 2);
    }, [displaySize?.width, displaySize?.height, isWhiteboard]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ------------------------------------------------------------------ */
    /* DESIGN: canvas is exactly the preset's W x H, shown scaled to fit  */
    /* ------------------------------------------------------------------ */
    // layout effect: the page frame and the canvas resize in the same paint. With useEffect the
    // frame grew first and, for one frame, a click on the page edge hit the frame, not the canvas (BUG-146)
    useLayoutEffect(() => {
        if (isWhiteboard || !canvas || !size || !displaySize) return;

        // render at the density the page is shown at (BUG-108): Fabric reads this ratio everywhere
        // (render, brush, hit-testing); export uses its own multiplier, so files are unaffected
        const ratio = designRenderRatio({
            dpr: window.devicePixelRatio || 1,
            displayScale: displaySize.width / size.width,
            width: size.width,
            height: size.height,
        });
        (canvas as { getRetinaScaling: () => number }).getRetinaScaling = () =>
            canvas.enableRetinaScaling ? ratio : 1;

        // 1) real document pixels (this is what gets exported / saved)
        canvas.setDimensions({ width: size.width, height: size.height }, { backstoreOnly: true });
        // 2) on-screen size only; Fabric corrects pointer coordinates for the CSS scale
        canvas.setDimensions(
            { width: displaySize.width, height: displaySize.height },
            { cssOnly: true },
        );
        // design zoom is the CSS size; the viewport stays identity (rulers / export assume it)
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

        canvas.calcOffset?.();
        canvas.requestRenderAll();
    }, [canvas, isWhiteboard, size?.width, size?.height, displaySize?.width, displaySize?.height]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ------------------------------------------------------------------ */
    /* DESIGN: scroll + viewport measuring                                */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        if (isWhiteboard) return;
        const el = scrollRef.current;
        if (!el) return;

        el.scrollLeft = 0;
        el.scrollTop = 0;

        const onScroll = () => setScrollPos({ x: el.scrollLeft, y: el.scrollTop });
        const measure = () => setViewport({ w: el.clientWidth, h: el.clientHeight });

        el.addEventListener('scroll', onScroll, { passive: true });
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        onScroll();
        measure();

        return () => {
            el.removeEventListener('scroll', onScroll);
            ro.disconnect();
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
        };
    }, [isWhiteboard]);

    /* ------------------------------------------------------------------ */
    /* Stage geometry (design): where the artboard sits inside the stage  */
    /* ------------------------------------------------------------------ */
    const stageWidth = Math.max(viewport.w, (displaySize?.width ?? 0) + ARTBOARD_GAP * 2);
    const stageHeight = Math.max(viewport.h, (displaySize?.height ?? 0) + ARTBOARD_GAP * 2);
    const artboardLeft = (stageWidth - (displaySize?.width ?? 0)) / 2;
    const artboardTop = (stageHeight - (displaySize?.height ?? 0)) / 2;

    // screen px per document px, exactly as drawn (display size is rounded)
    const rulerScale = size && displaySize ? displaySize.width / size.width : fitScale;

    const onMouseMove = (e: React.MouseEvent) => {
        insideRef.current = true;
        if (rafRef.current) return; // one state update per frame
        const { clientX, clientY } = e;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = 0;
            const scroll = scrollRef.current;
            if (!scroll || !insideRef.current) return;
            const rect = scroll.getBoundingClientRect();
            pointer.set({ x: clientX - rect.left, y: clientY - rect.top });
        });
    };

    const onMouseLeave = () => {
        insideRef.current = false;
        pointer.set(null);
    };

    // right-clicks AROUND the canvas (Fabric handles the ones on it)
    const onOutsideContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        openMenu(e.clientX, e.clientY, contextMenuRegistry, null);
    };

    // Fabric v6 types are 'Textbox'
    // one text float for the whole app: text boxes AND text shapes / sticky notes
    const isText =
        !!selectedObject && typeof selectedObject === 'object' && isTextFloatTarget(selectedObject);
    // node editing: the node bar follows the shape being edited (its working path)
    const isNode = !!nodeMode && !!nodePath;
    const floatTarget: unknown = isNode ? nodePath : isText ? selectedObject : null;

    /* ------------------------------------------------------------------ */
    /* Floating text toolbar: follow the selected text                    */
    /* ------------------------------------------------------------------ */
    useEffect(() => {
        const host = hostRef.current;

        if (!canvas || !host || !floatTarget) {
            setAnchor(null);
            return;
        }

        const obj: any = floatTarget;
        let raf = 0;

        const compute = () => {
            raf = 0;

            const upper = canvas.upperCanvasEl as HTMLCanvasElement | undefined;
            if (!upper) return;

            if (!obj.aCoords) obj.setCoords?.();
            const a = obj.aCoords;
            if (!a) return;

            // scene -> canvas pixels (viewport zoom / pan) -> CSS pixels (fit scale in design)
            const vt: number[] = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
            const corners = [a.tl, a.tr, a.bl, a.br].map((p: any) => ({
                x: vt[0]! * p.x + vt[2]! * p.y + vt[4]!,
                y: vt[1]! * p.x + vt[3]! * p.y + vt[5]!,
            }));

            const upperRect = upper.getBoundingClientRect();
            const hostRect = host.getBoundingClientRect();
            const k = canvas.getWidth() > 0 ? upperRect.width / canvas.getWidth() : 1;
            const dx = upperRect.left - hostRect.left;
            const dy = upperRect.top - hostRect.top;

            const xs = corners.map((p) => p.x * k + dx);
            const ys = corners.map((p) => p.y * k + dy);

            const next: Anchor = {
                cx: Math.round((Math.min(...xs) + Math.max(...xs)) / 2),
                top: Math.round(Math.min(...ys)),
                bottom: Math.round(Math.max(...ys)),
                hostW: host.clientWidth,
            };

            setAnchor((prev) =>
                prev &&
                prev.cx === next.cx &&
                prev.top === next.top &&
                prev.bottom === next.bottom &&
                prev.hostW === next.hostW
                    ? prev
                    : next,
            );
        };

        const schedule = () => {
            if (!raf) raf = requestAnimationFrame(compute);
        };

        schedule();
        // after:render fires for every move / scale / rotate / zoom / pan / text change
        canvas.on('after:render', schedule);
        window.addEventListener('resize', schedule);

        return () => {
            canvas.off('after:render', schedule);
            window.removeEventListener('resize', schedule);
            cancelAnimationFrame(raf);
        };
    }, [canvas, floatTarget, displaySize?.width, displaySize?.height]);

    /** Toolbar wrapper: sits just above the text (or below it when there is no room). */
    const renderToolbar = (baseX: number, baseY: number, containerW: number) => {
        if (!floatTarget || !canvas || !anchor) return null;
        const gapAbove = isNode ? NODE_TOOLBAR_GAP_ABOVE : TOOLBAR_GAP_ABOVE;

        const width = toolbarRef.current?.offsetWidth || TOOLBAR_FALLBACK_WIDTH;
        const above = baseY + anchor.top - TOOLBAR_HEIGHT - gapAbove >= 0;

        const min = width / 2 + TOOLBAR_EDGE;
        const max = Math.max(min, containerW - width / 2 - TOOLBAR_EDGE);
        const left = clamp(baseX + anchor.cx, min, max);
        const top = above ? baseY + anchor.top : baseY + anchor.bottom;

        return (
            <div
                ref={toolbarRef}
                className="pointer-events-none absolute z-30 w-max"
                style={{
                    left,
                    top,
                    transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                    paddingBottom: above ? gapAbove : 0,
                    paddingTop: above ? 0 : TOOLBAR_GAP,
                }}
            >
                <div className="pointer-events-auto">
                    {/* writes through the store (updateText): undo, highlighted-character styling */}
                    {isNode ? <NodeToolbar /> : <FloatingTextToolbar target={selectedObject} />}
                </div>
            </div>
        );
    };
    /* ------------------------------------------------------------------ */
    /* Layouts                                                            */
    /* ------------------------------------------------------------------ */

    // WHITEBOARD (default): no rulers, no artboard, canvas fills the container.
    if (isWhiteboard) {
        return (
            <div className="flex h-full min-h-0 min-w-0 flex-1">
                <div
                    className="relative h-full min-h-0 w-full min-w-0"
                    style={{ backgroundColor: THEME.whiteboard }}
                    onContextMenu={onOutsideContextMenu}
                >
                    {/* dot grid: BEHIND the (transparent) canvas, so shapes cover it (it used to sit on
                        top with multiply blending and showed through every filled shape).
                        Follows the top-bar Grid toggle (off by default). */}
                    {/* absolute + inset-0: size never depends on the Fabric wrapper */}
                    <div ref={hostRef} className="absolute inset-0 overflow-hidden" />
                    {renderToolbar(0, 0, anchor?.hostW ?? 0)}
                </div>
            </div>
        );
    }

    // DESIGN: rulers + scaled artboard.
    return (
        <div className="flex h-full w-full flex-col">
            {/* top ruler row: corner box + horizontal ruler (always in design; whiteboard has none) */}
            <div className="flex shrink-0" style={{ height: RULER_SIZE }}>
                <div
                    className="shrink-0 border-b border-r"
                    style={{
                        width: RULER_SIZE,
                        height: RULER_SIZE,
                        backgroundColor: THEME.chrome,
                        borderColor: THEME.chromeBorder,
                    }}
                />
                <Ruler
                    orientation="horizontal"
                    length={viewport.w}
                    origin={artboardLeft - scrollPos.x}
                    scale={rulerScale}
                    extent={size?.width ?? 0}
                    pointer={pointer}
                    unit={rulerUnit}
                />
            </div>

            <div className="flex min-h-0 flex-1" style={{ backgroundColor: THEME.workspace }}>
                <Ruler
                    orientation="vertical"
                    length={viewport.h}
                    origin={artboardTop - scrollPos.y}
                    scale={rulerScale}
                    extent={size?.height ?? 0}
                    pointer={pointer}
                    unit={rulerUnit}
                />

                <div
                    ref={scrollRef}
                    data-board-scroll // the Hand tool scrolls this in design (createCanvasSlice pan)
                    className="relative min-w-0 flex-1 overflow-auto"
                    style={{ backgroundColor: THEME.workspace }}
                    onMouseMove={onMouseMove}
                    onMouseLeave={onMouseLeave}
                    onContextMenu={onOutsideContextMenu}
                >
                    <div
                        className="relative"
                        style={{
                            width: stageWidth,
                            height: stageHeight,
                            minWidth: '100%',
                            minHeight: '100%',
                        }}
                    >
                        {/* The artboard is the preset scaled to fit; document pixels stay W x H. */}
                        {size && displaySize && (
                            <div
                                className="absolute overflow-hidden border"
                                style={{
                                    left: artboardLeft,
                                    top: artboardTop,
                                    width: displaySize.width,
                                    height: displaySize.height,
                                    backgroundColor: THEME.artboard,
                                    borderColor: THEME.artboardBorder,
                                    boxShadow: THEME.artboardShadow,
                                }}
                            >
                                <div
                                    ref={hostRef}
                                    style={{ width: displaySize.width, height: displaySize.height }}
                                />
                            </div>
                        )}

                        {/* Outside the artboard (it clips with overflow-hidden), same stage coordinates */}
                        {renderToolbar(artboardLeft, artboardTop, stageWidth)}
                    </div>
                </div>
            </div>
        </div>
    );
}
