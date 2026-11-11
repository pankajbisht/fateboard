import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/atoms/Button';
import { Icon } from '@/components/atoms/Icon';
import { projectStorage } from '@/lib/storage';

/**
 * Catches render errors below it so a crash never leaves a blank page. Mounted in RootLayout
 * around the routed pages (key = route, so navigating away resets it).
 *
 * The fallback only uses the autosave (`projectStorage`), never the store, which may be the thing
 * that broke: Reload brings the last autosave back; Download saves it as a `.fateboard` file;
 * "Start with an empty board" (confirmed) deletes an autosave that crashes on every load.
 */

type Props = {
    children: ReactNode;
    /** Injected in tests; defaults to `window.location.reload()`. */
    onReload?: () => void;
    /** Injected in tests; defaults to a browser download. */
    onDownload?: (fileName: string, json: string) => void;
};

type State = { error: Error | null };

const reloadPage = () => window.location.reload();

const downloadFile = (fileName: string, json: string) => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[app] render error', error, info.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <CrashFallback
                onReload={this.props.onReload ?? reloadPage}
                onDownload={this.props.onDownload ?? downloadFile}
            />
        );
    }
}

function CrashFallback({
    onReload,
    onDownload,
}: {
    onReload: () => void;
    onDownload: (fileName: string, json: string) => void;
}) {
    const [confirmClear, setConfirmClear] = useState(false);
    const [note, setNote] = useState<string | null>(null);

    const download = async () => {
        try {
            const saved = await projectStorage.load();
            if (!saved) {
                setNote('There is no autosave to download.');
                return;
            }
            const doc = saved.kind === 'project' ? saved.project : saved.canvasJSON;
            onDownload('fateboard-autosave.fateboard', JSON.stringify(doc));
            setNote('Autosave downloaded. Open it later with Open Board.');
        } catch (error) {
            console.error('[app] could not read the autosave', error);
            setNote('The autosave could not be read.');
        }
    };

    const clearAndReload = async () => {
        try {
            await projectStorage.clear();
        } catch (error) {
            console.error('[app] could not clear the autosave', error);
        }
        onReload();
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface-muted p-4 text-ink">
            <div
                role="alert"
                className="w-full max-w-md rounded-md border border-line bg-surface p-6 shadow-lg"
            >
                <div className="flex items-center gap-2">
                    <Icon name="triangle-exclamation" className="text-danger" />
                    <h1 className="text-title text-ink">Something went wrong</h1>
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                    The editor hit an unexpected error. Your work is autosaved: reloading usually
                    brings it back. To be safe, download the autosave first.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                    <Button onClick={onReload}>Reload</Button>
                    <Button variant="secondary" icon="download" onClick={() => void download()}>
                        Download autosave
                    </Button>
                </div>

                {note && <p className="mt-3 text-xs text-ink-muted">{note}</p>}

                <div className="mt-5 border-t border-line pt-4">
                    {confirmClear ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-ink-muted">
                                This deletes the autosaved project for good.
                            </span>
                            <Button
                                size="sm"
                                variant="danger"
                                onClick={() => void clearAndReload()}
                            >
                                Yes, delete the autosave
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setConfirmClear(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <Button
                            size="sm"
                            variant="danger-outline"
                            onClick={() => setConfirmClear(true)}
                        >
                            Start with an empty board
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
