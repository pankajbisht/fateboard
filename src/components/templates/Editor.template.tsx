import type { ReactNode } from 'react';

interface EditorTemplateProps {
    header: ReactNode;
    leftSidebar: ReactNode;
    rightPanel: ReactNode;
    canvasBoard: ReactNode;
    footer: ReactNode;
}

function EditorTemplate({
    header,
    leftSidebar,
    rightPanel,
    canvasBoard,
    footer,
}: EditorTemplateProps) {
    return (
        <div className="flex h-dvh w-full touch-pan-x touch-pan-y flex-col overflow-hidden overscroll-none bg-surface-muted">
            <header className="relative z-30 w-full shrink-0">{header}</header>

            {/* upright phones: the board takes the full width; dock and tools are bars under it */}
            <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden max-sm:flex-col">
                <div className="relative z-20 flex h-full min-h-0 shrink-0 max-sm:order-3 max-sm:h-auto max-sm:w-full">
                    {leftSidebar}
                </div>

                <section
                    aria-label="Editor canvas workspace"
                    className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden max-sm:order-1"
                >
                    <div className="absolute inset-0 flex min-h-0 min-w-0">{canvasBoard}</div>
                </section>

                <aside className="relative z-10 flex h-full min-h-0 shrink-0 max-sm:order-2 max-sm:h-auto max-sm:w-full">
                    {rightPanel}
                </aside>
            </main>

            <footer className="relative z-10 w-full shrink-0">{footer}</footer>
        </div>
    );
}

export default EditorTemplate;
