import { useEffect, useRef, useState } from 'react';
import { useStore } from '@store';
import { useKeyboardShortcuts } from '../../hooks';
import { FloatingTextToolbar } from './FloatingTextToolbar.tsx';
import { MultiStopGradientTool } from '../../lib/utils/GradientTool.ts';
import { contextMenuRegistry } from '../config/contextMenuRegistry.tsx';
import TopRuler from '../molecules/DesignFrame/ui/TopRuler.tsx';
import LeftRuler from '../molecules/DesignFrame/ui/LeftRuler.tsx';
import { CANVAS_OFFSET, VIRTUAL_SIZE } from '../config/canvas.config.ts';

export function CanvasBoard() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const geditorRef = useRef<MultiStopGradientTool | null>(null);
    const init = useStore((s) => s.init);
    const canvas = useStore((s) => s.canvas);
    const openMenu = useStore((s) => s.openMenu);
    const fill = useStore((s) => s.fill);
    const selectedObject = useStore((s) => s.selectedObject);

    useKeyboardShortcuts();

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [mouse, setMouse] = useState({ x: 0, y: 0 });
    const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });

    // -------------------- INIT FABRIC --------------------
    useEffect(() => {
        if (canvasRef.current && !canvas) {
            init(canvasRef.current);
        }
    }, [init, canvas]);

    useEffect(() => {
        if (canvas) {
            geditorRef.current = new MultiStopGradientTool(canvas, () => fill);

            // Transform Fabric.js viewport to match our coordinate system
            // Origin (0,0) should be at the center of the canvas element
            // canvas.viewportTransform = [1, 0, 0, 1, CANVAS_OFFSET, CANVAS_OFFSET];
            canvas.renderAll();
        }

        return () => {
            if (canvas) {
                geditorRef.current?.disable();
                geditorRef.current = null;
            }
        };
    }, [canvas, fill]);

    const onRightClick = (e) => {
        e.preventDefault();
        console.log(e.clientX, e.clientY);
        openMenu(e.clientX, e.clientY, contextMenuRegistry);
    };

    // -------------------- CENTER SCROLL AT ORIGIN (0,0) --------------------
    useEffect(() => {
        const scroll = scrollRef.current;
        if (!scroll) return;

        // Scroll so that origin (0,0) is at top-left of viewport
        scroll.scrollLeft = CANVAS_OFFSET - 300;
        scroll.scrollTop = CANVAS_OFFSET - 60;
    }, []);

    // -------------------- TRACK SCROLL --------------------
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        const onScroll = () => {
            setScrollPos({ x: el.scrollLeft, y: el.scrollTop });
        };
        el.addEventListener('scroll', onScroll);
        onScroll();
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    // -------------------- MOUSE COORDS --------------------
    const getMouse = (e: React.MouseEvent) => {
        const scroll = scrollRef.current!;
        const rect = scroll.getBoundingClientRect();

        // Calculate mouse position relative to canvas origin (0,0)
        // Origin is at CANVAS_OFFSET in the virtual space
        return {
            x: e.clientX - rect.left + scroll.scrollLeft - CANVAS_OFFSET,
            y: e.clientY - rect.top + scroll.scrollTop - CANVAS_OFFSET,
        };
    };

    return (
        <div className="relative w-full h-full">
            <TopRuler
                mouseX={mouse.x}
                scrollX={scrollPos.x}
                viewportWidth={scrollRef.current?.clientWidth ?? 0}
            />

            <div
                className="flex bg-amber-400"
                style={{
                    height: 'calc(100% - 16px)',
                }}
            >
                <LeftRuler
                    mouseY={mouse.y}
                    scrollY={scrollPos.y}
                    viewportHeight={scrollRef.current?.clientHeight ?? 0}
                />

                <div
                    ref={scrollRef}
                    className="relative overflow-auto bg-stone-200 w-full"
                    onMouseMove={(e) => setMouse(getMouse(e))}
                >
                    <div
                        className="relative"
                        style={{
                            width: VIRTUAL_SIZE,
                            height: VIRTUAL_SIZE,
                        }}
                        onContextMenu={onRightClick}
                    >
                        {/* Canvas covers entire virtual space - this is your drawing surface */}

                        {/* Artboard visual guide at origin (0,0) */}
                        <div
                            className="overflow-hidden absolute bg-white border border-stone-300 shadow-sm"
                            style={{
                                // width: ARTBOARD_WIDTH,
                                // height: ARTBOARD_HEIGHT,
                                left: CANVAS_OFFSET,
                                top: CANVAS_OFFSET,
                            }}
                        >
                            <canvas
                                ref={canvasRef}
                                width={VIRTUAL_SIZE}
                                height={VIRTUAL_SIZE}
                                className="absolute inset-0"
                            />

                            {selectedObject?.type === 'textbox' && canvas && (
                                <FloatingTextToolbar
                                    target={selectedObject}
                                    canvas={canvas}
                                    onChange={(style) => {
                                        if (selectedObject) {
                                            selectedObject.set(style);
                                            canvas.requestRenderAll();
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
