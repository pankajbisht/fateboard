import { GroupBarConfig } from '@/components/config/toolbars';
import { useArrangeState } from '@/hooks/useArrangeState';
import { ArrangeButton } from './ArrangeButton';

const GroupBar = () => {
    const state = useArrangeState();
    return (
        <ul className="flex items-center gap-0.5">
            {GroupBarConfig.map((action) => (
                <li key={action.id}>
                    <ArrangeButton action={action} state={state} />
                </li>
            ))}
        </ul>
    );
};

export { GroupBar };
