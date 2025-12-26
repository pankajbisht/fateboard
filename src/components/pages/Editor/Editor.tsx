import EditorTemplate from '../../templates/EditorTemplate.tsx';
import { CanvasBoard } from '../../organisms/CanvasBoard.tsx';
import { Header } from '../../organisms/Header.tsx';
import { PanelManager } from '../../organisms/PanelManager.tsx';
import { leftPanelConfig } from '../../config/panelConfig.tsx';
import { Footer } from '../../organisms/footer';
import { ContextMenu } from '../../organisms/ContextMenu.tsx';
import { usePageTitle } from '../../../lib/utils/usePageTitle.ts';
import { DockRoot } from '@/components/organisms/DraggableItem.tsx';

const EditorPage = () => {
    usePageTitle('Draw | Fateboard');

    return (
        <div>
            <EditorTemplate
                header={<Header />}
                leftSidebar={<PanelManager config={leftPanelConfig} toolbarPosition="left" />}
                // rightSidebar={<PanelManager config={rightPanelConfig} toolbarPosition="right" />}
                // undoRedoSidebar={<PanelManager config={undoRedoPanelConfig} toolbarPosition="left" />}
                rightPanel={<DockRoot />}
                canvasBoard={<CanvasBoard />}
                footer={<Footer />}
            />
            <ContextMenu />
        </div>
    );
};

export default EditorPage;
