import { Icon, type IconName } from '@/components/atoms/Icon';
import { useRef } from 'react';
import { useStore } from '@/store';
import { Modal, ModalButton } from '../molecules/Modal';

/**
 * Renders the store's confirm / alert dialogs (`confirmDialog`, `alertDialog`) one at a time.
 * Mounted once in RootLayout.
 */
export function DialogHost() {
    const current = useStore((s) => s.dialogQueue[0]);
    const resolveDialog = useStore((s) => s.resolveDialog);
    const confirmRef = useRef<HTMLButtonElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);

    if (!current) return null;

    const isConfirm = current.kind === 'confirm';
    const danger = current.tone === 'danger';
    // the confirm button is always brand primary; danger shows only in the icon, and destructive
    // confirms start on the safe choice so Enter never deletes by accident
    const focusRef = isConfirm && danger ? cancelRef : confirmRef;
    const icon: IconName = danger
        ? 'triangle-exclamation'
        : isConfirm
          ? 'circle-question'
          : 'circle-info';

    return (
        <Modal
            key={current.id}
            open
            role="alertdialog"
            tone={current.tone}
            title={current.title}
            description={current.message || undefined}
            onClose={() => resolveDialog(false)}
            initialFocusRef={focusRef}
            icon={<Icon name={icon} className="text-base" />}
            footer={
                <>
                    {isConfirm && (
                        <ModalButton buttonRef={cancelRef} onClick={() => resolveDialog(false)}>
                            {current.cancelLabel}
                        </ModalButton>
                    )}
                    <ModalButton
                        buttonRef={confirmRef}
                        variant="primary"
                        onClick={() => resolveDialog(true)}
                    >
                        {current.confirmLabel}
                    </ModalButton>
                </>
            }
        />
    );
}
