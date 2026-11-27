/**
 * Busy-board budgets (docs/PERFORMANCE_AUDIT.md P11): a 500-object project opens, scrolls and undoes in time.
 * Budgets are loose on purpose (CI machines vary); the measured numbers are written to the report.
 */
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';

const COUNT = 500;

/** Plain Fabric 7 JSON: five kinds of object on a grid, no layers (one plain layer). */
function stressObjects(version: string) {
    return Array.from({ length: COUNT }, (_, i) => {
        const base = {
            version,
            id: `stress-${i}`,
            originX: 'left',
            originY: 'top',
            left: 40 + (i % 25) * 70,
            top: 40 + Math.floor(i / 25) * 50,
            angle: (i * 7) % 45,
            fill: `hsl(${(i * 37) % 360}, 70%, 55%)`,
        };
        switch (i % 5) {
            case 0:
                return { ...base, type: 'Rect', width: 60, height: 40 };
            case 1:
                return { ...base, type: 'Circle', radius: 20 };
            case 2:
                return { ...base, type: 'Triangle', width: 50, height: 40 };
            case 3:
                return { ...base, type: 'Textbox', text: `Item ${i}`, width: 60, fontSize: 14 };
            default:
                return {
                    ...base,
                    type: 'Path',
                    fill: null,
                    stroke: base.fill,
                    strokeWidth: 3,
                    path: [
                        ['M', 0, 0],
                        ['Q', 20, 30, 40, 0],
                        ['Q', 50, -20, 60, 10],
                    ],
                };
        }
    });
}

test('500 objects: open, scroll and undo stay within budget', async ({ editor, page }) => {
    test.slow();
    await page.goto('/draw?perf');
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    // the app's own file as the wrapper, so page metadata is real
    await editor.addShape('Rectangle');
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Save Board' }).first().click(),
    ]);
    const project = JSON.parse(readFileSync(await download.path(), 'utf8'));
    const pageJson = project.pages[0].canvasJSON;
    pageJson.objects = stressObjects(String(pageJson.version ?? '7.4.0'));

    const opened = Date.now();
    const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.getByRole('button', { name: 'Open Board' }).first().click(),
    ]);
    await chooser.setFiles({
        name: 'stress.fateboard',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(project)),
    });
    await expect.poll(async () => (await editor.objects()).length, { timeout: 30_000 }).toBe(COUNT);
    const openMs = Date.now() - opened;

    // frame times while the board scrolls (every frame repaints every object on screen)
    const box = await editor.settledCanvasBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.evaluate(() => {
        const w = window as unknown as { __frames: number[] };
        w.__frames = [];
        let last = performance.now();
        const tick = (now: number) => {
            w.__frames.push(now - last);
            last = now;
            if (w.__frames.length < 90) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
    for (let i = 0; i < 30; i++) await page.mouse.wheel(0, i % 2 ? -80 : 80);
    const frames = (
        await page.evaluate(() => (window as unknown as { __frames: number[] }).__frames)
    )
        .slice(5)
        .sort((a, b) => a - b);
    const p95 = frames[Math.floor(frames.length * 0.95)] ?? 0;

    // undo of one step restores the whole 500-object canvas
    await editor.addShape('Circle');
    await page.waitForTimeout(350); // history is debounced (150 ms)
    const undone = Date.now();
    await page.getByRole('button', { name: 'Undo' }).first().click();
    await expect.poll(async () => (await editor.objects()).length).toBe(COUNT);
    const undoMs = Date.now() - undone;

    const marks = await page.evaluate(() =>
        Object.fromEntries(
            ['page:load', 'history:snapshot', 'history:restore', 'project:capture'].map((n) => [
                n,
                Math.round(
                    Math.max(
                        0,
                        ...performance.getEntriesByName(`fate:${n}`).map((e) => e.duration),
                    ),
                ),
            ]),
        ),
    );
    test.info().annotations.push({
        type: 'perf',
        description: JSON.stringify({ openMs, p95FrameMs: Math.round(p95), undoMs, ...marks }),
    });
    console.log(
        '[perf-budget]',
        JSON.stringify({ openMs, p95FrameMs: Math.round(p95), undoMs, ...marks }),
    );
    expect(openMs).toBeLessThan(10_000);
    expect(p95).toBeLessThan(100);
    expect(undoMs).toBeLessThan(3_000);
});
