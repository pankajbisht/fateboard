import { test, expect } from './fixtures';

// BUG-234 / P3: real pen input (Chrome DevTools Protocol sends pointerType 'pen' with pressure). Fabric sees
// MouseEvents; the brush must still store the pen's pressure (it stored 1 for every sample before).
// Chromium-only (CDP): the Firefox project ignores this file (playwright.config.ts).
test('a pen stroke with a Stamp brush keeps the pen pressure', async ({ editor, page }) => {
    await page.evaluate(() => {
        const s = (k: string) => window.__fateboard!.state(k) as (...a: unknown[]) => void;
        s('setActiveTool')('draw');
        s('setBrush')({ brush: 'sketch-hb' });
    });
    await expect.poll(() => editor.state<string>('brush')).toBe('sketch-hb');
    const box = await editor.settledCanvasBox();
    const cdp = await page.context().newCDPSession(page);
    const pen = (
        type: 'mousePressed' | 'mouseMoved' | 'mouseReleased',
        x: number,
        y: number,
        force: number,
    ) =>
        cdp.send('Input.dispatchMouseEvent', {
            type,
            x,
            y,
            button: 'left',
            buttons: type === 'mouseReleased' ? 0 : 1,
            clickCount: 1,
            pointerType: 'pen',
            force,
        });
    const x0 = box.x + box.width * 0.3;
    const y0 = box.y + box.height * 0.5;
    await pen('mousePressed', x0, y0, 0.3);
    for (let i = 1; i <= 10; i++) await pen('mouseMoved', x0 + i * 15, y0, 0.3);
    await pen('mouseReleased', x0 + 150, y0, 0);

    await expect.poll(async () => (await editor.objects()).length).toBe(1);
    const pressures = await page.evaluate(() => {
        // the stroke's samples: x, y, pressure, time
        const o = (
            window.__fateboard!.state('canvas') as {
                getObjects: () => { stampPoints?: number[] }[];
            }
        ).getObjects()[0];
        const flat = o.stampPoints ?? [];
        return flat.filter((_, i) => i % 4 === 2);
    });
    expect(pressures.length).toBeGreaterThan(3);
    for (const p of pressures) expect(p).toBeCloseTo(0.3, 2);
});
