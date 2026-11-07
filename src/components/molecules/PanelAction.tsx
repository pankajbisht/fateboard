import { Button, type ButtonProps } from '../atoms/Button';
import type { IconName } from '../atoms/Icon';

export type PanelActionProps = Omit<ButtonProps, 'variant' | 'size' | 'block'> & {
    /** Every panel action shows an icon (download, check, save, trash, ...). */
    icon: IconName;
    /** 'primary' (default) for Export / Apply / Save; 'danger' for panel-wide destructive actions. */
    tone?: 'primary' | 'danger';
};

/**
 * A panel-level action (Export, Apply, Save, Clear all): full-width, large, with an icon. One shape
 * everywhere, matching "Export PNG"; only the tone changes (brand blue, or red outline for danger).
 * Every other button in a panel is a small `Button`.
 */
export function PanelAction({ tone = 'primary', ...props }: PanelActionProps) {
    return (
        <Button
            variant={tone === 'danger' ? 'danger-outline' : 'primary'}
            size="lg"
            block
            {...props}
        />
    );
}

export default PanelAction;
