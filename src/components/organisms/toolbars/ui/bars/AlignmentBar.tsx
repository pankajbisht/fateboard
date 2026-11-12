import { AlignmentBarConfig } from '@/components/config/toolbars';
import { useArrangeState } from '@/hooks/useArrangeState';
import { ArrangeButton } from './ArrangeButton';

/** Align (one object: to the page / view; more: to each other) and distribute (three or more). */
const AlignmentBar = () => {
    const state = useArrangeState();
    return (
        <ul className="flex items-center gap-0.5">
            {AlignmentBarConfig.map((action) => (
                <li key={action.id}>
                    <ArrangeButton action={action} state={state} />
                </li>
            ))}
        </ul>
    );
};

export { AlignmentBar };
