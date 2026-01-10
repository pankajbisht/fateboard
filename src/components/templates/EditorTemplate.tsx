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
        // <div className="flex flex-col h-screen overflow-hidden">
        //     {/* Header */}
        //     {header && header}

        //     {/* Middle (fills remaining height automatically) - ROW layout */}
        //     <main className="flex flex-row flex-1 overflow-hidden">
        //         {leftSidebar && leftSidebar}
        //         {canvasBoard && <div className='flex-1'>{canvasBoard}</div>}
        //         {rightPanel && rightPanel}
        //     </main>

        //     {/* Footer */}
        //     {footer && footer}
        // </div>
        //
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Header */}
            {header && header}

            {/* Middle */}
            <main className="relative flex flex-1 overflow-hidden flex-none">
                {/*{canvasBoard && <div className='flex-1'>{canvasBoard}</div>}*/}
                {canvasBoard && canvasBoard}
                {/* Right panel positioned absolutely on the right */}
                {leftSidebar && leftSidebar}

                {/*<div className="w-full h-full">
                    {canvasBoard}
                </div>*/}

                {rightPanel && <div className="absolute top-0 right-0 h-full">{rightPanel}</div>}
            </main>

            {/* Footer */}
            {footer && footer}
        </div>
    );
};

export default EditorTemplate;
