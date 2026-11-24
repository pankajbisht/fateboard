/** The studio dialog root (`data-character-studio`): focus comes back to it when its focused control goes away. */
export const STUDIO_ROOT = 'data-character-studio';

export function focusStudio() {
    requestAnimationFrame(() => {
        if (document.activeElement === document.body || !document.activeElement)
            document.querySelector<HTMLElement>(`[${STUDIO_ROOT}]`)?.focus();
    });
}
