import { test, expect } from './fixtures';

// P1 (docs/PERFORMANCE_AUDIT.md): a big photo is stored at most 4096 px on its longer side, so it does not
// cost ~96 MB of pixels and ~8 MB of text in every autosave and undo step.
test('a 6000 × 4000 photo is imported at 4096 px on its longer side', async ({ editor, page }) => {
    const b64 = await page.evaluate(async () => {
        const c = document.createElement('canvas');
        c.width = 6000;
        c.height = 4000;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, 0, 6000, 4000);
        const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000)
            s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return btoa(s);
    });
    const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Open Board' }).first().click(),
    ]);
    await chooser.setFiles({
        name: 'big.png',
        mimeType: 'image/png',
        buffer: Buffer.from(b64, 'base64'),
    });
    await expect.poll(async () => (await editor.objects()).map((o) => o.type)).toEqual(['image']);
    const size = await page.evaluate(() => {
        const el = (window.__fateboard!.state('canvas') as any).getObjects()[0].getElement();
        return [el.naturalWidth, el.naturalHeight];
    });
    expect(size).toEqual([4096, 2731]);
});
