import { Icon } from '@/components/atoms/Icon';
import { useStore } from '@store';
import { shortcut } from '@/lib/utils/isMac';
import { IconButton } from '../atoms/IconButton';
import { Tooltip } from './Tooltip';

const KEYS = shortcut('⌘\\', 'Ctrl+\\');

/** Footer button next to Fullscreen: hide everything but the canvas. */
export function DistractionFreeToggle() {
    const on = useStore((s) => s.distractionFree);
    const toggle = useStore((s) => s.toggleDistractionFree);
    return (
        <Tooltip position="top" content={`Distraction-free mode (${KEYS})`}>
            <IconButton
                active={on}
                aria-pressed={on}
                icon={<Icon name="focus" />}
                onClick={toggle}
                aria-label="Distraction-free mode"
                className="border border-line"
                size="chrome"
            />
        </Tooltip>
    );
}

/**
 * The one control left on screen in distraction-free mode (top right, over the canvas): the way
 * back for touch screens and anyone who does not know the shortcut. Mounted by the Editor page.
 */
export function DistractionFreeExit() {
    const on = useStore((s) => s.distractionFree);
    const toggle = useStore((s) => s.toggleDistractionFree);
    if (!on) return null;
    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={`Exit distraction-free mode (${KEYS})`}
            title={`Exit distraction-free mode (${KEYS})`}
            className="fixed right-3 top-3 z-40 flex items-center gap-1.5 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-xs font-medium text-ink-muted shadow-sm backdrop-blur transition-opacity hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 pointer-fine:opacity-60 pointer-fine:hover:opacity-100 pointer-fine:focus-visible:opacity-100 motion-reduce:transition-none"
        >
            <Icon name="compress" />
            <span>Exit</span>
            <kbd className="hidden font-sans text-ink-subtle sm:inline">{KEYS}</kbd>
        </button>
    );
}
