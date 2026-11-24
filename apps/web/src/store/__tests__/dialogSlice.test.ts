import { describe, expect, it } from 'vitest';

import { createDialogSlice, type DialogSlice } from '@/store/slices/createDialogSlice';
import { createHarness } from '@/test/sliceHarness';

/* eslint-disable @typescript-eslint/no-explicit-any */

const setup = () => createHarness<DialogSlice>([createDialogSlice as any]);

describe('createDialogSlice', () => {
    it('confirmDialog queues a confirm and resolves true on confirm', async () => {
        const h = setup();
        const answer = h
            .get()
            .confirmDialog({ title: 'Delete?', message: 'Sure?', tone: 'danger' });

        expect(h.get().dialogQueue).toHaveLength(1);
        expect(h.get().dialogQueue[0]).toMatchObject({
            kind: 'confirm',
            title: 'Delete?',
            tone: 'danger',
        });

        h.get().resolveDialog(true);
        await expect(answer).resolves.toBe(true);
        expect(h.get().dialogQueue).toHaveLength(0);
    });

    it('confirmDialog resolves false on cancel', async () => {
        const h = setup();
        const answer = h.get().confirmDialog({ title: 'T', message: 'M' });
        h.get().resolveDialog(false);
        await expect(answer).resolves.toBe(false);
    });

    it('alertDialog resolves when dismissed', async () => {
        const h = setup();
        const done = h.get().alertDialog({ title: 'Oops', message: 'Select 2 objects' });

        expect(h.get().dialogQueue[0]).toMatchObject({ kind: 'alert', title: 'Oops' });
        h.get().resolveDialog(true);
        await expect(done).resolves.toBeUndefined();
    });

    it('shows dialogs one at a time, in request order', async () => {
        const h = setup();
        const first = h.get().confirmDialog({ title: 'first', message: '' });
        const second = h.get().confirmDialog({ title: 'second', message: '' });

        expect(h.get().dialogQueue.map((d) => d.title)).toEqual(['first', 'second']);

        h.get().resolveDialog(false);
        await expect(first).resolves.toBe(false);
        expect(h.get().dialogQueue.map((d) => d.title)).toEqual(['second']);

        h.get().resolveDialog(true);
        await expect(second).resolves.toBe(true);
        expect(h.get().dialogQueue).toEqual([]);
    });

    it('resolveDialog with an empty queue is a no-op', () => {
        const h = setup();
        expect(() => h.get().resolveDialog(true)).not.toThrow();
        expect(h.get().dialogQueue).toEqual([]);
    });
});
