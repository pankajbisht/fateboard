import { useEffect, useRef, useState } from 'react';

type EditorTemplateProps = {
    header?: React.ReactNode;
    leftSidebar?: React.ReactNode;
    undoRedoSidebar?: React.ReactNode;
    canvasBoard: React.ReactNode;
    rightSidebar?: React.ReactNode;
    footer?: React.ReactNode;
    rightPanel?: React.ReactNode;
};

const EditorTemplate = ({
    header,
    leftSidebar,
    undoRedoSidebar,
    canvasBoard,
    rightSidebar,
    footer,
    rightPanel,
}: EditorTemplateProps) => {
    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {header && header}

            <main className="relative flex flex-1 overflow-hidden flex-none">
                {canvasBoard && canvasBoard}

                {leftSidebar && leftSidebar}

                {rightPanel && <div className="absolute top-0 right-0 h-full">{rightPanel}</div>}
            </main>

            {footer && footer}
        </div>
    );
};

export default EditorTemplate;
