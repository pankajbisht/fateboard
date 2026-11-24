import { useShallow } from 'zustand/react/shallow';
import { useStore } from '@store';
import { Button } from '../../atoms/Button';

/** Progress bar + Cancel while an export runs; the result (saved / error) after it. */
export function ExportProgress() {
    const { state, cancel } = useStore(
        useShallow((s) => ({ state: s.exportState, cancel: s.cancelExport })),
    );
    const percent = Math.round(state.progress * 100);

    if (state.status === 'rendering')
        return (
            <div className="space-y-1.5">
                <div
                    className="h-2 overflow-hidden rounded an-track"
                    role="progressbar"
                    aria-label="Export progress"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percent}
                >
                    <div
                        className="h-full bg-primary-600 transition-[width]"
                        style={{ width: `${percent}%` }}
                    />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                    <span className="text-ink-muted">Rendering… {percent}%</span>
                    <Button variant="secondary" size="sm" icon="xmark" onClick={cancel}>
                        Cancel
                    </Button>
                </div>
            </div>
        );
    if (state.status === 'done')
        return (
            <p role="status" className="text-[11px] text-success">
                {state.message}
            </p>
        );
    if (state.status === 'error')
        return (
            <p role="alert" className="text-[11px] text-danger">
                {state.message}
            </p>
        );
    return null;
}

export default ExportProgress;
