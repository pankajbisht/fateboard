// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readZip } from '@/test/zipRead';
import { crc32, zip } from '../zip';

describe('zip', () => {
    it('crc32 matches the standard check values', () => {
        expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
        expect(crc32(new Uint8Array())).toBe(0);
    });

    it('stores files that read back byte for byte, with folders and unicode names', () => {
        const bin = Uint8Array.from({ length: 1000 }, (_, i) => (i * 37) % 256);
        const files = [
            { name: 'a.txt', data: 'hello' },
            { name: 'layers/01-ananya.svg', data: '<svg/>' },
            { name: 'नमस्ते/ü.json', data: '{"ok":true}' },
            { name: 'bin.dat', data: bin },
            { name: 'empty.txt', data: '' },
        ];
        const back = readZip(zip(files));
        expect([...back.keys()]).toEqual(files.map((f) => f.name));
        expect(new TextDecoder().decode(back.get('a.txt'))).toBe('hello');
        expect(new TextDecoder().decode(back.get('नमस्ते/ü.json'))).toBe('{"ok":true}');
        expect(back.get('bin.dat')).toEqual(bin);
        expect(back.get('empty.txt')!.length).toBe(0);
    });

    it('is deterministic, starts with the ZIP signature, and an empty archive is valid', () => {
        const a = zip([{ name: 'x', data: '1' }]);
        expect(zip([{ name: 'x', data: '1' }])).toEqual(a);
        expect([...a.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
        expect(readZip(zip([])).size).toBe(0);
    });

    it('drops a leading slash from names', () => {
        expect([...readZip(zip([{ name: '/etc/x', data: '1' }])).keys()]).toEqual(['etc/x']);
    });
});
