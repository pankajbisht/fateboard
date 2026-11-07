import { useStore } from '@/store';
import { importFile } from '@/feature/import';

/** File types the "Open Board" picker accepts (same list as the FileBar input). */
export const OPEN_ACCEPT = '.png,.jpg,.jpeg,.webp,.svg,.fateboard,.json';

/**
 * "New board": starts a new project (one empty page) and deletes the autosaved copy.
 * Asks first (themed dialog) when the board has content, because canvas undo cannot bring it back
 * yet (BUG-040, BUG-001). Resolves true when the board was cleared.
 */
export async function newBoard(
    confirmFn: (message: string) => Promise<boolean> = (message) =>
        useStore.getState().confirmDialog({
            title: 'Clear the whole board?',
            message,
            confirmLabel: 'Clear board',
            tone: 'danger',
        }),
): Promise<boolean> {
    const { canvas, clearBoard, pages } = useStore.getState();
    if (!canvas) return false;
    const hasContent = canvas.getObjects().length > 0 || (pages?.length ?? 0) > 1;
    if (
        hasContent &&
        !(await confirmFn('This deletes every page, all objects and the autosaved copy.'))
    ) {
        return false;
    }
    clearBoard();
    return true;
}

/** "Open board": shows a file picker and imports the chosen file. Never clears anything by itself. */
export function openBoardFile(): void {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = OPEN_ACCEPT;
    input.addEventListener('change', async () => {
        const file = input.files?.[0];
        const canvas = useStore.getState().canvas;
        if (!file || !canvas) return;
        await importFile(canvas, file);
    });
    input.click();
}

/** "Save board": downloads the current board as a .fateboard file. */
export function saveBoardFile(): void {
    useStore.getState().saveBoard();
}
