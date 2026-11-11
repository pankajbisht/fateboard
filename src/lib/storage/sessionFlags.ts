/** Yes/no answers remembered for this browser tab only (sessionStorage). Never throws. */

export function readSessionFlag(key: string): boolean {
    try {
        return sessionStorage.getItem(key) === '1';
    } catch {
        return false; // storage blocked: ask again
    }
}

export function writeSessionFlag(key: string): boolean {
    try {
        sessionStorage.setItem(key, '1');
        return true;
    } catch {
        return false; // storage blocked: remembered for this page view only
    }
}
