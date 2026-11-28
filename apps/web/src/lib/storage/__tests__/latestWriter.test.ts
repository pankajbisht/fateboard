// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createLatestWriter } from '../latestWriter';

/** A write that resolves only when the test says so. */
function gate() {
    const calls: { value: number; done: () => void; fail: (e: unknown) => void }[] = [];
    const write = (value: number) =>
        new Promise<void>((done, fail) => calls.push({ value, done: () => done(), fail }));
    return { calls, write };
}
const flushMicrotasks = () => new Promise((r) => setTimeout(r, 0));

describe('createLatestWriter (P2)', () => {
    it('one write at a time; only the newest waiting value is written next', async () => {
        const g = gate();
        const w = createLatestWriter(g.write);
        w.write(1);
        w.write(2);
        w.write(3);
        expect(g.calls.map((c) => c.value)).toEqual([1]);
        expect(w.busy()).toBe(true);
        g.calls[0].done();
        await flushMicrotasks();
        expect(g.calls.map((c) => c.value)).toEqual([1, 3]);
        g.calls[1].done();
        await flushMicrotasks();
        expect(w.busy()).toBe(false);
    });

    it('a failed write calls onError and still runs the waiting one', async () => {
        const g = gate();
        const onError = vi.fn();
        const onSaved = vi.fn();
        const w = createLatestWriter(g.write, { onError, onSaved });
        w.write(1);
        w.write(2);
        g.calls[0].fail(new Error('full'));
        await flushMicrotasks();
        expect(onError).toHaveBeenCalledTimes(1);
        expect(g.calls.map((c) => c.value)).toEqual([1, 2]);
        g.calls[1].done();
        await flushMicrotasks();
        expect(onSaved).toHaveBeenCalledTimes(1);
    });

    it('flush writes now even while a write runs, and drops the waiting value', async () => {
        const g = gate();
        const w = createLatestWriter(g.write);
        w.write(1);
        w.write(2);
        w.flush(3);
        expect(g.calls.map((c) => c.value)).toEqual([1, 3]);
        g.calls[0].done();
        g.calls[1].done();
        await flushMicrotasks();
        expect(g.calls.map((c) => c.value)).toEqual([1, 3]);
    });
});
