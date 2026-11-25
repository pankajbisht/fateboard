import { useSyncExternalStore } from 'react';

/** Upright phones: the same edge as Tailwind's `max-sm` (below 40rem = 640 px). */
export const PHONE_QUERY = '(max-width: 639.98px)';

const subscribe = (onChange: () => void) => {
    const mq = window.matchMedia(PHONE_QUERY);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
};

/**
 * True on an upright phone. For layouts that place a part elsewhere on phones (the editor's "More"
 * sheet), not for styling: use `max-sm:` classes for that. False while prerendering.
 */
export function useIsPhone() {
    return useSyncExternalStore(
        subscribe,
        () => window.matchMedia(PHONE_QUERY).matches,
        () => false,
    );
}
