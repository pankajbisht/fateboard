/**
 * BUG-036: small libraries (custom shapes, patterns, font templates) are stored through one helper:
 * `fateboard:<name>` keys with a version envelope, old keys migrated once, never throws.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readLocalList, writeLocalList } from './localList';

afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

const isItem = (v: unknown): v is { id: string } =>
    !!v && typeof (v as { id?: unknown }).id === 'string';

describe('local lists', () => {
    it('writes a versioned envelope under a fateboard: key and reads it back (valid items only)', () => {
        writeLocalList('shapes', [{ id: 'a' }]);
        expect(JSON.parse(localStorage.getItem('fateboard:shapes')!)).toEqual({
            v: 1,
            items: [{ id: 'a' }],
        });
        localStorage.setItem(
            'fateboard:shapes',
            JSON.stringify({ v: 1, items: [{ id: 'a' }, 7, null] }),
        );
        expect(readLocalList('shapes', isItem)).toEqual([{ id: 'a' }]);
    });

    it('migrates an old raw-array key once and removes it', () => {
        localStorage.setItem('canvas.patterns.v1', JSON.stringify([{ id: 'p' }]));
        expect(readLocalList('patterns', isItem, ['canvas.patterns.v1'])).toEqual([{ id: 'p' }]);
        expect(localStorage.getItem('canvas.patterns.v1')).toBeNull();
        expect(JSON.parse(localStorage.getItem('fateboard:patterns')!).items).toEqual([
            { id: 'p' },
        ]);
    });

    it('never throws (corrupt data, blocked storage)', () => {
        localStorage.setItem('fateboard:shapes', '{not json');
        expect(readLocalList('shapes', isItem)).toEqual([]);
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('quota');
        });
        vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        expect(writeLocalList('shapes', [{ id: 'b' }])).toBe(false);
    });
});
