import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import db from 'opendb-store';

import { useStore } from '@store';
import { useKeyboardShortcuts } from '../../hooks';
import { FloatingTextToolbar } from './FloatingTextToolbar.tsx';
import { MultiStopGradientTool } from '../../lib/utils/GradientTool.ts';
import { contextMenuRegistry } from '../config/commandConfig.tsx';

const ARTBOARD_WIDTH = 1200;
const ARTBOARD_HEIGHT = 800;
const RULER_SIZE = 30;
const VIRTUAL_SIZE = 8000; // total virtual workspace (allows negative space)
const CANVAS_OFFSET = VIRTUAL_SIZE / 2; // offset to place origin at center
const GRID_STEP = 50;

// const GRID_STEP = 100;        // major unit
// const SUB_DIVS = 10;          // number of subdivisions
// const SUB_STEP = GRID_STEP / SUB_DIVS; // 10px

function TopRuler({ mouseX, scrollX, viewportWidth }: any) {
    const ZERO_X = CANVAS_OFFSET - scrollX;

    const GRID_STEP = 100;
    const SUB_DIVS = 10;
    const SUB_STEP = GRID_STEP / SUB_DIVS;

    const RANGE = 2000;

    return (
        <div className="h-[16px] bg-slate-50 border-b border-slate-200 relative overflow-hidden select-none">
            {Array.from({ length: (RANGE * 2) / SUB_STEP }).map((_, i) => {
                const value = i * SUB_STEP - RANGE;
                const left = ZERO_X + value + 15;

                if (left < -60 || left > viewportWidth + 60) return null;

                const isMajor = value % GRID_STEP === 0;
                const isMid = value % GRID_STEP === GRID_STEP / 2;

                const height = isMajor ? 'h-full' : isMid ? 'h-[40%]' : 'h-[20%]';

                const color = isMajor ? 'border-slate-500' : 'border-slate-300';

                return (
                    <div
                        key={i}
                        className={`absolute bottom-0 border-l ${height} ${color}`}
                        style={{ left }}
                    >
                        {isMajor && (
                            <span className="absolute top-[4px] left-[4px] text-[6px] text-slate-600 font-medium">
                                {value}
                            </span>
                        )}
                    </div>
                );
            })}

            {/* Origin */}
            <div
                className="absolute top-0 h-full w-[2px] bg-blue-600 pointer-events-none"
                style={{ left: ZERO_X + 15 }}
            />

            {/* Cursor */}
            <div
                className="absolute top-0 h-full w-[1px] bg-red-500/80 pointer-events-none"
                style={{ left: ZERO_X + mouseX + 15 }}
            />
        </div>
    );
}

function LeftRuler({ mouseY, scrollY, viewportHeight }: any) {
    const ZERO_Y = CANVAS_OFFSET - scrollY;

    const GRID_STEP = 100;
    const SUB_DIVS = 10;
    const SUB_STEP = GRID_STEP / SUB_DIVS;

    const RANGE = 2000;

    return (
        <div className="w-[16px] bg-slate-50 border-r border-slate-200 relative overflow-hidden select-none">
            {Array.from({ length: (RANGE * 2) / SUB_STEP }).map((_, i) => {
                const value = i * SUB_STEP - RANGE;
                const top = ZERO_Y + value;

                if (top < -60 || top > viewportHeight + 60) return null;

                const isMajor = value % GRID_STEP === 0;
                const isMid = value % GRID_STEP === GRID_STEP / 2;

                const width = isMajor ? 'w-full' : isMid ? 'w-[40%]' : 'w-[20%]';

                const color = isMajor ? 'border-slate-900' : 'border-slate-300';

                return (
                    <div
                        key={i}
                        className={`absolute right-0 border-t ${width} ${color}`}
                        style={{ top }}
                    >
                        {isMajor && (
                            <span className="absolute left-[6px] top-[6px] -rotate-90 origin-left text-[6px] text-slate-600 font-medium">
                                {value}
                            </span>
                        )}
                    </div>
                );
            })}

            {/* Origin */}
            <div
                className="absolute left-0 w-full h-[2px] bg-blue-600 pointer-events-none"
                style={{ top: ZERO_Y }}
            />

            {/* Cursor */}
            <div
                className="absolute left-0 w-full h-[1px] bg-red-500/80 pointer-events-none"
                style={{ top: ZERO_Y + mouseY }}
            />
        </div>
    );
}

export function CanvasBoard() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const geditorRef = useRef<MultiStopGradientTool | null>(null);
    const { init, selectedObject, canvas, openMenu, fill } = useStore();
    const eventLists = useStore();
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

            <div className="flex">
                <LeftRuler
                    mouseY={mouse.y}
                    scrollY={scrollPos.y}
                    viewportHeight={scrollRef.current?.clientHeight ?? 0}
                />

                <div
                    ref={scrollRef}
                    className="relative overflow-auto bg-stone-200"
                    // style={{
                    //     width: `calc(100vw - ${RULER_SIZE}px)`,
                    //     height: `calc(100vh - ${RULER_SIZE}px)`,
                    // }}
                    style={{
                        height: 'calc(100vh - 80px - 50px - 20px)',
                        width: 'calc(100vw)',
                    }}
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
                            className="overflow-hidden absolute bg-white border border-stone-300 h-auto w-auto shadow-sm"
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
