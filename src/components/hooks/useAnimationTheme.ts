import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useStore } from '@/store'; // ← your combined zustand store hook

type ThemeSetting = 'dark' | 'light' | 'system' | undefined;

/**
 * Colour tokens used by the animation panel: the app's semantic tokens (index.css), which already
 * switch with the app theme, so the panel matches every other panel in light and dark mode.
 */
export const ANIM_PALETTE = {
    light: {
        page: 'var(--color-surface)',
        surface: 'var(--color-surface)',
        sunken: 'var(--color-surface-muted)',
        hover: 'var(--color-surface-strong)',
        border: 'var(--color-line)',
        borderStrong: 'var(--color-line-strong)',
        borderSoft: 'var(--color-line)',
        text: 'var(--color-ink)',
        muted: 'var(--color-ink-muted)',
        faint: 'var(--color-ink-subtle)',
        dim: 'rgba(0,0,0,0.06)',
    },
    dark: {
        page: 'var(--color-surface)',
        surface: 'var(--color-surface)',
        sunken: 'var(--color-surface-muted)',
        hover: 'var(--color-surface-strong)',
        border: 'var(--color-line)',
        borderStrong: 'var(--color-line-strong)',
        borderSoft: 'var(--color-line)',
        text: 'var(--color-ink)',
        muted: 'var(--color-ink-muted)',
        faint: 'var(--color-ink-subtle)',
        dim: 'rgba(0,0,0,0.3)',
    },
} as const;

/**
 * Plain CSS for the panel's colors. Shipped with the component (rendered in a <style> tag),
 * so it does not depend on Tailwind generating arbitrary-value classes.
 */
export const ANIM_CSS = `
[data-anim-theme] .an-surface{background-color:var(--an-surface)}
[data-anim-theme] .an-sunken{background-color:var(--an-sunken)}
[data-anim-theme] .an-dim{background-color:var(--an-dim)}
[data-anim-theme] .an-track{background-color:var(--an-border)}
[data-anim-theme] .an-hover:hover{background-color:var(--an-hover)}
[data-anim-theme] .an-bd{border-color:var(--an-border)}
[data-anim-theme] .an-bd-strong{border-color:var(--an-border-strong)}
[data-anim-theme] .an-bd-soft{border-color:var(--an-border-soft)}
[data-anim-theme] .an-text{color:var(--an-text)}
[data-anim-theme] .an-muted{color:var(--an-muted)}
[data-anim-theme] .an-faint{color:var(--an-faint)}
[data-anim-theme] .an-stroke{stroke:var(--an-border-strong)}
`;

/** Reads the theme the app has already applied to <html> (class="dark" / data-theme="dark"). */
function readDom(): boolean | null {
    const el = document.documentElement;
    if (el.classList.contains('dark')) return true;
    if (el.classList.contains('light')) return false;
    const attr = el.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return null;
}

/**
 * Resolves dark/light from the app's own Settings (theme: dark | light | system),
 * NOT from the OS. Order: what the app applied to <html> → the stored setting → OS (only for "system").
 */
export function useIsDark(): boolean {
    const setting = useStore((s) => {
        const st = s as unknown as { theme?: ThemeSetting; settings?: { theme?: ThemeSetting } };
        return st.theme ?? st.settings?.theme;
    });
    const [systemDark, setSystemDark] = useState(
        () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    );
    const [domDark, setDomDark] = useState<boolean | null>(readDom);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onMq = () => setSystemDark(mq.matches);
        mq.addEventListener('change', onMq);
        const mo = new MutationObserver(() => setDomDark(readDom()));
        mo.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme'],
        });
        return () => {
            mq.removeEventListener('change', onMq);
            mo.disconnect();
        };
    }, []);

    if (domDark !== null) return domDark;
    if (setting === 'dark') return true;
    if (setting === 'light') return false;
    return systemDark; // 'system' or unknown
}

/** Inline CSS variables + native colour-scheme (form controls, scrollbars) for the panel root. */
export function useAnimationTheme(): { isDark: boolean; style: CSSProperties } {
    const isDark = useIsDark();
    const style = useMemo(() => {
        const p = isDark ? ANIM_PALETTE.dark : ANIM_PALETTE.light;
        return {
            colorScheme: isDark ? 'dark' : 'light',
            color: p.text,
            background: p.page,
            '--an-page': p.page,
            '--an-surface': p.surface,
            '--an-sunken': p.sunken,
            '--an-hover': p.hover,
            '--an-border': p.border,
            '--an-border-strong': p.borderStrong,
            '--an-border-soft': p.borderSoft,
            '--an-text': p.text,
            '--an-muted': p.muted,
            '--an-faint': p.faint,
            '--an-dim': p.dim,
        } as CSSProperties;
    }, [isDark]);
    return { isDark, style };
}
