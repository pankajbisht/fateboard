import { test, expect } from './fixtures';

const trackCount = (page: import('@playwright/test').Page) =>
    page.evaluate(
        () => Object.keys(window.__fateboard!.state('tracks') as Record<string, unknown>).length,
    );

// BUG-010 / Q12: animation tracks are saved with their page and survive a reload
test('a keyframe survives a reload and stays on its page', async ({ editor, page }) => {
    await editor.addShape('Rectangle'); // added shapes are selected
    await editor.openDockTab('Animate');
    await page.getByRole('button', { name: 'Keyframe at playhead' }).click();
    await expect.poll(() => trackCount(page)).toBe(1);

    // a new page has its own (empty) timeline
    await editor.openPanel('Pages');
    await page.getByRole('button', { name: 'Add page' }).click();
    await expect.poll(() => trackCount(page)).toBe(0);
    await page.getByRole('button', { name: /Previous page/ }).click();
    await expect.poll(() => trackCount(page)).toBe(1);

    await page.waitForTimeout(1500); // autosave debounce
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(() => trackCount(page)).toBe(1);
});

const keyframeTimes = (page: import('@playwright/test').Page) =>
    page.evaluate(() =>
        Object.values(
            window.__fateboard!.state('tracks') as Record<
                string,
                { keyframes: { time: number }[] }
            >,
        ).flatMap((t) => t.keyframes.map((k) => k.time)),
    );

// BUG-176: presets are tried one after another, so the next one of the same kind replaces the last.
// BUG-177: the timeline row had about 8 px for the object's name.
test('picking presets swaps them, previews only the new one, and the timeline names the object', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await editor.openDockTab('Animate');
    const dock = page.getByTestId('dock-panel');

    await dock.getByRole('button', { name: 'Fade in', exact: true }).click();
    await expect.poll(() => keyframeTimes(page)).toEqual([0, 600]);
    await expect(dock.getByText(/added at 0 s/)).toBeVisible();
    // the preview stops at the end of this animation, not at the end of the timeline
    await expect.poll(() => editor.state('isPlaying')).toBe(false);
    expect(await editor.state('currentTime')).toBe(600);

    await dock.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect.poll(() => keyframeTimes(page)).toEqual([0, 700]);

    const name = dock.locator('[data-track] span.truncate').first();
    await expect(name).not.toBeEmpty();
    expect((await name.boundingBox())!.width).toBeGreaterThan(90);
});

// BUG-178: after a click on Play, Space started a canvas pan and never paused
test('Space pauses and plays after Play was clicked', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await editor.openDockTab('Animate');
    await page.getByTestId('dock-panel').getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => editor.state('isPlaying')).toBe(true);
    await page.keyboard.press('Space');
    await expect.poll(() => editor.state('isPlaying')).toBe(false);
    await page.keyboard.press('Space'); // the key-up must not click the focused button again
    await expect.poll(() => editor.state('isPlaying')).toBe(true);
});
