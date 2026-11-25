import type { ReactNode } from 'react';

interface EditorTemplateProps {
    header: ReactNode;
    leftSidebar: ReactNode;
    rightPanel: ReactNode;
    canvasBoard: ReactNode;
    footer: ReactNode;
    /** Under the board, between the rails (the animation timeline, as in other animation tools). */
    bottomPanel?: ReactNode;
    /** The page's level-one heading, for screen readers only (inside `main`, BUG-247). */
    heading?: string;
    /** A full-screen workspace covers the editor (Character Studio): nothing here takes focus or clicks. */
    inert?: boolean;
    /**
     * Distraction-free mode: only the canvas is shown. The chrome stays mounted (`hidden`), so its
     * keyboard shortcuts and panel state survive the toggle.
     */
    chromeHidden?: boolean;
}

function EditorTemplate({
    header,
    leftSidebar,
    rightPanel,
    canvasBoard,
    footer,
    bottomPanel,
    heading,
    inert = false,
    chromeHidden = false,
}: EditorTemplateProps) {
    return (
        <div
            inert={inert || undefined}
            className="flex h-dvh w-full touch-pan-x touch-pan-y flex-col overflow-hidden overscroll-none bg-surface-muted"
        >
            <header hidden={chromeHidden} className="relative z-30 w-full shrink-0">
                {header}
            </header>

            {/* upright phones: the board takes the full width; dock and tools are bars under it */}
            <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden max-sm:flex-col">
                {heading && <h1 className="sr-only">{heading}</h1>}
                <div
                    hidden={chromeHidden}
                    className="relative z-20 flex h-full min-h-0 shrink-0 max-sm:order-3 max-sm:h-auto max-sm:w-full"
                >
                    {leftSidebar}
                </div>

                <div className="flex min-h-0 min-w-0 flex-1 flex-col max-sm:order-1">
                    <section
                        aria-label="Editor canvas workspace"
                        className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden"
                    >
                        <div className="absolute inset-0 flex min-h-0 min-w-0">{canvasBoard}</div>
                    </section>
                    {bottomPanel && (
                        <div hidden={chromeHidden} className="relative z-10 min-w-0 shrink-0">
                            {bottomPanel}
                        </div>
                    )}
                </div>

                <aside
                    hidden={chromeHidden}
                    className="relative z-10 flex h-full min-h-0 shrink-0 max-sm:order-2 max-sm:h-auto max-sm:w-full"
                >
                    {rightPanel}
                </aside>
            </main>

            <footer hidden={chromeHidden} className="relative z-10 w-full shrink-0">
                {footer}
            </footer>
        </div>
    );
}

export default EditorTemplate;
