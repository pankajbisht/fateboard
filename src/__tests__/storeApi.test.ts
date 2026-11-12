/**
 * The store's public keys (state + actions) are an API used by components and other slices. Renaming or removing
 * one needs the owner's approval (CLAUDE.md "Never do"), so the list is recorded in `storeApi.baseline.json`:
 *  - a removed / renamed key fails here; after approval, delete it from the baseline by hand
 *    (CI then needs the PR label `api-change`, scripts/guardrails/check-ratchets.mjs);
 *  - a new key fails until recorded: `UPDATE_STORE_API=1 npx vitest run src/__tests__/storeApi.test.ts`
 *    (adds new keys only; it never removes one).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { useStore } from '@store';

const BASELINE = path.join(process.cwd(), 'src/__tests__/storeApi.baseline.json');
const recorded: string[] = JSON.parse(readFileSync(BASELINE, 'utf8'));
const keys = Object.keys(useStore.getState()).sort();

if (process.env.UPDATE_STORE_API === '1') {
    const merged = [...new Set([...recorded, ...keys])].sort();
    writeFileSync(BASELINE, `${JSON.stringify(merged, null, 4)}\n`);
    recorded.splice(0, recorded.length, ...merged);
}

describe('store public API', () => {
    it('no recorded key was removed or renamed (needs the owner, then edit the baseline)', () => {
        expect(recorded.filter((key) => !keys.includes(key))).toEqual([]);
    });

    it('every key is recorded (run with UPDATE_STORE_API=1 to add new ones)', () => {
        expect(keys.filter((key) => !recorded.includes(key))).toEqual([]);
    });
});
