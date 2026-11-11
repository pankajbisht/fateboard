import { test, expect } from './fixtures';

test('the board is autosaved: objects survive a reload', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await editor.addShape('Circle');
    await page.waitForTimeout(1500); // autosave debounce
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect
        .poll(async () => (await editor.objects()).map((o) => o.type).sort())
        .toEqual(['circle', 'rect']);
});

test('all pages and the open page survive a reload (BUG-004)', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await editor.openPanel('Pages');
    await page.getByRole('button', { name: 'Add page' }).click();
    await editor.addShape('Circle');
    await page.waitForTimeout(1500); // autosave debounce
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect
        .poll(() => page.evaluate(() => (window.__fateboard!.state('pages') as unknown[]).length))
        .toBe(2);
    // the page that was open (Page 2, the circle) is shown again
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['circle']);
    await editor.openPanel('Pages');
    await page.getByRole('button', { name: /Previous page/ }).click();
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['rect']);
});

// BUG-121: an imported photo used to be saved as a dead blob: URL and was lost on reload
test('an imported photo survives a reload', async ({ editor, page }) => {
    const png = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        'base64',
    );
    const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Open Board' }).first().click(),
    ]);
    await chooser.setFiles({ name: 'dot.png', mimeType: 'image/png', buffer: png });
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['image']);

    await page.waitForTimeout(1500); // autosave debounce
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['image']);
    const src = await page.evaluate(() =>
        (window.__fateboard!.state('canvas') as any).getObjects()[0].getSrc().slice(0, 15),
    );
    expect(src).toBe('data:image/png;');
});

// opendb-store 3: boards saved by the hand-written IndexedDB code (database `fateboard`, store `kv`)
// move into the opendb database once, in a real browser, and the old database is deleted.
test('a board saved before the storage upgrade opens and moves to the new database', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await page.waitForTimeout(1500); // autosave debounce: nothing is written after this
    await page.evaluate(async () => {
        const capture = window.__fateboard!.state('captureProject') as (o: object) => unknown;
        const doc = capture({ thumbnail: false });
        const done = (req: IDBRequest) =>
            new Promise((resolve, reject) => {
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        // a returning user: no new database yet, the board in the old layout
        await done(indexedDB.deleteDatabase('fateboard-data'));
        const open = indexedDB.open('fateboard', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('kv');
        const db = (await done(open)) as IDBDatabase;
        await done(db.transaction('kv', 'readwrite').objectStore('kv').put(doc, 'project'));
        db.close();
    });

    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['rect']);
    const names = () =>
        page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name).sort());
    await expect.poll(names).toEqual(['fateboard-data']);

    // it now lives in the new database only
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['rect']);
});
