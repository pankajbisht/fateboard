import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/atoms/Icon';
import { Modal, ModalButton } from '@/components/molecules/Modal';

/** Below this width the editor's panels and canvas do not fit (owner decision: desktop-only editor). */
export const SMALL_SCREEN_MAX = 767;
const DISMISSED_KEY = 'fateboard:small-screen-ok';

const readDismissed = () => {
    try {
        return sessionStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
        return false; // storage blocked: ask again, never crash
    }
};

const isSmall = () => typeof window !== 'undefined' && window.innerWidth <= SMALL_SCREEN_MAX;

/**
 * Phones / narrow windows: the editor is desktop-only and says so honestly, instead of showing a
 * 116 px canvas. "Continue anyway" is remembered for the browser session. Mounted by the Editor page.
 */
export function SmallScreenNotice() {
    const [small, setSmall] = useState(isSmall);
    const [dismissed, setDismissed] = useState(readDismissed);
    const continueRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const onResize = () => setSmall(isSmall());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    if (!small || dismissed) return null;

    const dismiss = () => {
        try {
            sessionStorage.setItem(DISMISSED_KEY, '1');
        } catch {
            /* storage blocked: dismissed for this page view only */
        }
        setDismissed(true);
    };

    return (
        <Modal
            open
            onClose={dismiss}
            title="Fateboard works best on a larger screen"
            description="The editor is made for a computer or tablet in landscape. On a phone the canvas and panels are too small to use comfortably. Your work is saved in this browser either way."
            icon={<Icon name="display" className="text-base" />}
            initialFocusRef={continueRef}
            footer={
                <>
                    <ModalButton onClick={() => window.location.assign('/')}>
                        Back to home
                    </ModalButton>
                    <ModalButton buttonRef={continueRef} variant="primary" onClick={dismiss}>
                        Continue anyway
                    </ModalButton>
                </>
            }
        />
    );
}
