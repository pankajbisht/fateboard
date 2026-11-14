/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '@store';
import { useBoardMode } from '@hooks/useBoardMode';
import { usePreventPageZoom } from '@hooks/useTouchGestures';
import { Header } from '@/components/organisms/header/index.ts';
import EditorTemplate from '@/components/templates/Editor.template.tsx';
import { DockRoot } from '@/components/organisms/DockRoot.tsx';
import { Footer } from '@/components/organisms/footer/index.ts';
import { ContextMenu } from '@/components/organisms/ContextMenu.tsx';
import editorsidebarconfig from '@/components/organisms/editorsidebar/editorsidebar.config.tsx';
// ONE board for both modes (replaces CanvasBoardFreeHand + the old CanvasBoard)
import { CanvasBoard } from '@/components/organisms/board/index.ts';
import type { EditorTool } from '@/components/organisms/editorsidebar/editorsidebar.type.ts';
import { EditorSidebar } from '@/components/organisms/editorsidebar/index.ts';
import type { CanvasPreset } from '@/components/organisms/board/board.type';
import { SIDE_PANEL_WIDTH, SIDE_RAIL_WIDTH } from '@/components/organisms/sidebar/sidebar.const';

export type EditorPageProps = {
    onToolChange?: (tool: EditorTool) => void;
};

// ============================================================
// Editor page
// ============================================================

export default function EditorPage({ onToolChange }: EditorPageProps = {}) {
    const canvas = useStore((state) => state.canvas);
    usePreventPageZoom(); // a pinch zooms the board (useTouchGestures), never the page
    const activeTool = useStore((state) => state.activeTool);
    const setActiveTool = useStore((state) => state.setActiveTool);
    const addText = useStore((state) => state.addText);

    // The store is the single source of truth for the canvas size
    // (before: a second useState here that nothing else could see).
    const selectedPreset = useStore((s: any) => s.selectedPreset) as CanvasPreset;
    const setSelectedPreset = useStore((s: any) => s.setSelectedPreset);

    // Settings > Freehand ON = whiteboard, OFF = design (DECISIONS Q3, BUG-015)
    const isWhiteboard = useBoardMode() === 'whiteboard';

    // a link from Help can name the panel to open: /draw?panel=layers
    const [searchParams] = useSearchParams();
    const linkedPanel = searchParams.get('panel');

    const appliedCanvasRef = useRef<typeof canvas>(null);
    const linkedDrawDone = useRef(false);

    const handlePresetSelect = useCallback(
        (preset: CanvasPreset) => {
            setSelectedPreset(preset);
        },
        [setSelectedPreset],
    );

    // Give the sidebar config the wiring. The panel prop is `onSelectPreset`; `onPresetSelect` is
    // passed too so either naming in the config works. A plain array config is returned unchanged.
    const sidebarItems = useMemo(() => {
        const cfg: any = editorsidebarconfig;
        return typeof cfg === 'function'
            ? cfg({
                  selectedPreset,
                  onSelectPreset: handlePresetSelect,
                  onPresetSelect: handlePresetSelect,
              })
            : cfg;
    }, [selectedPreset, handlePresetSelect]);

    // Apply the current tool to a newly created Fabric canvas (the board recreates the canvas when
    // the mode switches). Normal tool changes are handled by the store's setActiveTool.
    useEffect(() => {
        if (!canvas) {
            appliedCanvasRef.current = null;
            return;
        }

        if (appliedCanvasRef.current === canvas) return;

        appliedCanvasRef.current = canvas;
        setActiveTool(activeTool);
    }, [canvas, activeTool, setActiveTool]);

    // /draw?panel=draw arrives ready to draw. Text is left out on purpose: clicking Text adds a text
    // box, and following a link must not change the document.
    useEffect(() => {
        if (!canvas || linkedPanel !== 'draw' || linkedDrawDone.current) return;
        linkedDrawDone.current = true;
        setActiveTool('draw');
    }, [canvas, linkedPanel, setActiveTool]);

    // The brush slice owns canvas.freeDrawingBrush and re-applies it on every setting change (BUG-021).

    const handleToolChange = useCallback(
        (tool: EditorTool) => {
            // 'text' is a sidebar action, not a canvas pointer mode: keep the select tool active.
            setActiveTool(tool === 'text' ? 'select' : tool);
            onToolChange?.(tool);

            // Text creation stays tied to the toolbar click, not to a canvas mouse-down listener.
            if (tool === 'text') {
                addText({});
            }
        },
        [setActiveTool, addText, onToolChange],
    );

    return (
        <>
            <EditorTemplate
                header={<Header />}
                leftSidebar={
                    <EditorSidebar
                        items={sidebarItems}
                        initialActiveId={linkedPanel ?? 'select'}
                        railWidth={SIDE_RAIL_WIDTH}
                        panelWidth={SIDE_PANEL_WIDTH}
                        defaultExpanded={!!linkedPanel}
                        onToolChange={handleToolChange}
                        activeTool={activeTool}
                    />
                }
                rightPanel={<DockRoot />}
                canvasBoard={
                    <CanvasBoard
                        mode={isWhiteboard ? 'whiteboard' : 'design'}
                        pageSize={selectedPreset}
                    />
                }
                footer={<Footer />}
            />

            <ContextMenu />
        </>
    );
}
