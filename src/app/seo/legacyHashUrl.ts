/**
 * The app used `HashRouter` until 2026-11-07 (`/#/draw`, `/#/share/<id>`). Old bookmarks and shared links keep
 * working: before the router mounts, `/#/path?query` becomes `/path?query` (replaceState, no reload, no extra
 * history entry). Plain in-page anchors (`#features`) are left alone.
 */
export function redirectLegacyHashUrl(win: Pick<Window, 'location' | 'history'> = window): boolean {
    const { hash } = win.location;
    if (!hash.startsWith('#/')) return false;
    win.history.replaceState(win.history.state, '', hash.slice(1));
    return true;
}
