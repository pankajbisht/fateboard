import type { ReactNode } from 'react';
import type { IconName } from '@/components/atoms/Icon';
import { PanelAction } from '@/components/molecules/PanelAction';
import { PanelSection } from '@/components/molecules/PanelSection';

type EffectSectionProps = {
    title: string;
    children: ReactNode;
    onApply?: () => void;
    /** Label of the apply button (default "Apply"). */
    applyLabel?: string;
    /** Icon of the apply button (default magic wand). */
    applyIcon?: IconName;
    disabled?: boolean;
};

/** A titled effect group with its Apply button: `PanelSection` + `PanelAction`. */
export const EffectSection = ({
    title,
    children,
    onApply,
    applyLabel = 'Apply',
    applyIcon = 'wand-magic-sparkles',
    disabled,
}: EffectSectionProps) => (
    <PanelSection title={title}>
        {children}
        {onApply && (
            <PanelAction icon={applyIcon} disabled={disabled} onClick={onApply}>
                {applyLabel}
            </PanelAction>
        )}
    </PanelSection>
);
