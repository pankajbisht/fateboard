import { Switch } from './Switch';

/** @deprecated use `Switch` (same look). Kept for `LabeledToggle`. */
const Toggle = ({
    checked,
    onClick,
    'aria-label': ariaLabel,
}: {
    checked: boolean;
    onClick: () => void;
    'aria-label'?: string;
}) => <Switch checked={checked} onChange={() => onClick()} aria-label={ariaLabel} />;

export default Toggle;
