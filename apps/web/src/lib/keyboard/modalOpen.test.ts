import { afterEach, describe, expect, it } from 'vitest';
import { canvasKeysBlocked } from './modalOpen';

afterEach(() => {
    document.body.innerHTML = '';
});

describe('canvasKeysBlocked (BUG-062 / BUG-061)', () => {
    it('is true while an aria-modal dialog is in the document', () => {
        expect(canvasKeysBlocked()).toBe(false);
        const d = document.createElement('div');
        d.setAttribute('aria-modal', 'true');
        document.body.appendChild(d);
        expect(canvasKeysBlocked()).toBe(true);
    });
});
