/**
 * BUG-155: undo snapshots share one copy of every embedded image instead of holding one each.
 */
import { describe, expect, it } from 'vitest';
import { createSnapshotAssets } from '../snapshotAssets';

const photo = (fill: string) => `data:image/png;base64,${fill.repeat(5000)}`;

describe('snapshotAssets', () => {
    it('keeps a large data URL out of the snapshot text and gives it back on parse', () => {
        const assets = createSnapshotAssets();
        const doc = { objects: [{ type: 'image', src: photo('A') }] };
        const text = assets.stringify(doc);
        expect(text.length).toBeLessThan(200);
        expect(assets.parse(text)).toEqual(doc);
    });

    it('the same image always gets the same text, so equal documents compare equal', () => {
        const assets = createSnapshotAssets();
        const doc = { objects: [{ src: photo('A') }, { fill: { source: photo('A') } }] };
        expect(assets.stringify(doc)).toBe(assets.stringify(structuredClone(doc)));
        expect(assets.size()).toBe(1);
    });

    it('leaves short strings, remote URLs and ordinary text alone', () => {
        const assets = createSnapshotAssets();
        const doc = {
            objects: [
                { src: 'data:image/png;base64,AAAA' },
                { src: 'https://example.test/a.png' },
                { text: 'x'.repeat(9000) },
            ],
        };
        expect(assets.stringify(doc)).toBe(JSON.stringify(doc));
        expect(assets.size()).toBe(0);
    });

    it('text that looks like a token of another session is not replaced', () => {
        const first = createSnapshotAssets();
        const token = (JSON.parse(first.stringify({ src: photo('A') })) as { src: string }).src;
        const second = createSnapshotAssets();
        second.stringify({ src: photo('B') });
        expect(second.parse(JSON.stringify({ text: token }))).toEqual({ text: token });
    });

    it('prune forgets images that no snapshot uses any more', () => {
        const assets = createSnapshotAssets();
        const kept = assets.stringify({ src: photo('A') });
        assets.stringify({ src: photo('B') });
        expect(assets.size()).toBe(2);
        assets.prune([kept]);
        expect(assets.size()).toBe(1);
        expect(assets.parse(kept)).toEqual({ src: photo('A') });
    });
});
