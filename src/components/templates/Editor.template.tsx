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
        <div className="flex h-dvh w-full flex-col overflow-hidden bg-surface-muted">
            <header className="relative z-30 w-full shrink-0">{header}</header>

            <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
                <div className="relative z-20 flex h-full min-h-0 shrink-0">{leftSidebar}</div>

                <section
                    aria-label="Editor canvas workspace"
                    className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden"
                >
                    <div className="absolute inset-0 flex min-h-0 min-w-0">{canvasBoard}</div>
                </section>

                <aside className="relative z-10 flex h-full min-h-0 shrink-0">{rightPanel}</aside>
            </main>

            <footer className="relative z-10 w-full shrink-0">{footer}</footer>
        </div>
    );
}

export default EditorTemplate;
