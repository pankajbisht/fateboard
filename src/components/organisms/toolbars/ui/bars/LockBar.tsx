import { LockBarConfig } from '@/components/config/toolbars';
import { useArrangeState } from '@/hooks/useArrangeState';
import { ARRANGE_RULES } from '@/lib/canvas/arrange';
import { ArrangeButton } from './ArrangeButton';

/** One toggle, like the Layers panel: Unlock when everything selected is locked, else Lock. */
const LockBar = () => {
    const state = useArrangeState();
    const id = ARRANGE_RULES.unlock(state) && !ARRANGE_RULES.lock(state) ? 'unlock' : 'lock';
    const action = LockBarConfig.find((a) => a.id === id) ?? LockBarConfig[0];
    return (
        <ul className="flex items-center gap-0.5">
            <li>
                <ArrangeButton action={action} state={state} />
            </li>
        </ul>
    );
};

export { LockBar };
