import { test, expect } from './fixtures';

/**
 * The animation timeline is a dock under the board (owner request 2026-11-17: "like other animation
 * tools"), with onion skin and motion path overlays that are drawn on the board but never exported.
 */

test('the timeline opens under the board, between the rails, and is no longer a right-dock tab', async ({
    editor,
    page,
}) => {
    await expect(
        page
            .getByRole('toolbar', { name: 'Dock panels' })
            .getByRole('button', { name: 'Animate', exact: true }),
    ).toHaveCount(0);

    const dock = await editor.openTimeline();
    const board = page.getByRole('region', { name: 'Editor canvas workspace' });
    const d = (await dock.boundingBox())!;
    const b = (await board.boundingBox())!;
    expect(d.y).toBeGreaterThanOrEqual(b.y + b.height - 1); // under the board
    expect(Math.abs(d.x - b.x)).toBeLessThanOrEqual(1); // same column
    expect(Math.abs(d.width - b.width)).toBeLessThanOrEqual(1);
    await expect(page.getByRole('button', { name: 'Timeline', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
    );
});

test('the timeline is resized from its top edge and stays open and sized after a reload', async ({
    editor,
    page,
}) => {
    const dock = await editor.openTimeline();
    const before = (await dock.boundingBox())!.height;
    const edge = dock.getByRole('separator', { name: 'Resize timeline' });
    const e = (await edge.boundingBox())!;
    await page.mouse.move(e.x + e.width / 2, e.y + e.height / 2);
    await page.mouse.down();
    await page.mouse.move(e.x + e.width / 2, e.y + e.height / 2 - 80, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => (await dock.boundingBox())!.height).toBeGreaterThan(before + 60);
    const after = (await dock.boundingBox())!.height;

    await page.waitForTimeout(600); // the preference is written once the drag settles
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    const again = page.getByRole('region', { name: 'Timeline' });
    await expect(again.getByRole('button', { name: 'Keyframe at playhead' })).toBeVisible();
    expect(Math.abs((await again.boundingBox())!.height - after)).toBeLessThanOrEqual(1);
});

test('⌘⌥T / Ctrl+Alt+T shows and hides the timeline', async ({ editor, page }) => {
    await editor.openTimeline();
    await page.getByRole('region', { name: 'Editor canvas workspace' }).click({
        position: { x: 5, y: 5 },
    });
    await page.keyboard.press('ControlOrMeta+Alt+KeyT');
    await expect(page.getByRole('region', { name: 'Timeline' })).toHaveCount(0);
    await page.keyboard.press('ControlOrMeta+Alt+KeyT');
    await expect(page.getByRole('region', { name: 'Timeline' })).toBeVisible();
});

/** The board's own pixels vs. an export of the same scene (Fabric `toDataURL`, the export path). */
const pictures = (page: import('@playwright/test').Page) =>
    page.evaluate(() => {
        const c = window.__fateboard!.state('canvas') as {
            getElement: () => HTMLCanvasElement;
            toDataURL: (o: object) => string;
        };
        return { board: c.getElement().toDataURL(), exported: c.toDataURL({ format: 'png' }) };
    });

/** The pictures once the board has stopped changing (a render runs on the next animation frame). */
async function settled(page: import('@playwright/test').Page) {
    let prev = await pictures(page);
    for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(50);
        const next = await pictures(page);
        if (next.board === prev.board) return next;
        prev = next;
    }
    return prev;
}

test('onion skin and motion path draw on the board only, never in an export', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    const dock = await editor.openTimeline();
    await dock.getByRole('button', { name: 'Slide from left', exact: true }).click();
    await expect.poll(() => editor.state('isPlaying')).toBe(false); // the preview has ended
    for (let i = 0; i < 6; i++)
        await dock.getByRole('button', { name: 'Previous frame', exact: true }).click();
    const plain = await settled(page);

    await dock.getByRole('button', { name: 'Onion skin', exact: true }).click();
    await expect.poll(async () => (await pictures(page)).board).not.toBe(plain.board);
    const onion = await settled(page);
    expect(onion.exported).toBe(plain.exported);

    await dock.getByRole('button', { name: 'Motion path', exact: true }).click();
    await expect.poll(async () => (await pictures(page)).board).not.toBe(onion.board);
    expect((await pictures(page)).exported).toBe(plain.exported);

    // switched off, the guides leave the board as it was
    await dock.getByRole('button', { name: 'Onion skin', exact: true }).click();
    await dock.getByRole('button', { name: 'Motion path', exact: true }).click();
    await expect.poll(async () => (await pictures(page)).board).toBe(plain.board);
});
