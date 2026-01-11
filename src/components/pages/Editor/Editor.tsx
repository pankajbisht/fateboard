import EditorTemplate from '../../templates/EditorTemplate.tsx';
import { CanvasBoard } from '../../organisms/CanvasBoard.tsx';
// import { Header } from '../../organisms/Header.tsx';
import { PanelManager } from '../../organisms/PanelManager.tsx';
import { leftPanelConfig } from '../../config/panelConfig.tsx';
import { Footer } from '../../organisms/footer';
import { ContextMenu } from '../../organisms/ContextMenu.tsx';
import { usePageTitle } from '../../../lib/utils/usePageTitle.ts';
import { DockRoot } from '@/components/organisms/DraggableItem.tsx';
import { Header } from '@/components/organisms/header/index.ts';
import { DesignFrame } from '@/components/molecules/DesignFrame/index.ts';
import { useStore } from '@/store/index.ts';
import { CanvasBoardFreeHand } from '../CanvasBoard/CanvasBoard.tsx';

const EditorPage = () => {
    const freehand = useStore((s) => s.settings.freehand); // CanvasBoardFreeHand
    usePageTitle('Draw | Fateboard');

    console.log('freehand', freehand);

    return (
        <>
            <EditorTemplate
                header={<Header />}
                leftSidebar={<PanelManager config={leftPanelConfig} toolbarPosition="left" />}
                // rightSidebar={<PanelManager config={rightPanelConfig} toolbarPosition="right" />}
                // undoRedoSidebar={<PanelManager config={undoRedoPanelConfig} toolbarPosition="left" />}
                rightPanel={<DockRoot />}
                canvasBoard={freehand ? <CanvasBoardFreeHand /> : <CanvasBoard />}
                footer={<Footer />}
            />
            <ContextMenu />
        </>
    );
};

export default EditorPage;
