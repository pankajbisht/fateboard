import { test, expect } from './fixtures';

/**
 * Combat Sports Pack in the Scene Studio (docs/COMBAT_PACK.md): an exchange spaces and poses two characters, its
 * effects can be tuned, a combo plays on the page as a clip the timeline steps through, and a saved combo stays.
 */
type Fight = {
    exchange: string;
    contact: string;
    intensity: string;
    effects: Record<string, boolean>;
};
type Clip = { fightClip?: { count: number; first: number; start: number; fps: number } };

async function twoFighters(
    editor: { openPanel: (n: string) => Promise<void> },
    page: import('@playwright/test').Page,
) {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('radio', { name: 'Cast' }).click();
    await studio.getByRole('button', { name: 'Add character' }).click();
    await studio.getByRole('button', { name: 'Add character' }).click();
    return studio;
}
const fight = (page: import('@playwright/test').Page) =>
    page.evaluate(
        () =>
            ((window.__fateboard!.state('studioScene') as { fight?: Fight } | null)?.fight ??
                null) as Fight | null,
    );

test('an exchange poses both fighters; its effects can be tuned; one undo puts it back', async ({
    editor,
    page,
}) => {
    const studio = await twoFighters(editor, page);
    const exchanges = studio.getByRole('group', { name: 'Exchanges' });
    await expect(exchanges).toBeVisible();
    await exchanges.getByRole('button', { name: 'Cross lands' }).click();
    await expect.poll(async () => (await fight(page))?.exchange).toBe('cross-hit');
    expect((await fight(page))!.contact).toBe('hit');

    await studio.getByRole('combobox', { name: 'Effect strength' }).click();
    await page.getByRole('option', { name: 'Dramatic (manga)' }).click();
    await expect.poll(async () => (await fight(page))?.intensity).toBe('dramatic');
    await studio.getByRole('switch', { name: 'Sweat drops' }).click();
    await expect.poll(async () => (await fight(page))?.effects.sweat).toBe(false);
    await expect(studio.getByRole('button', { name: 'Close-up on impact' })).toBeVisible();

    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(async () => (await fight(page))?.effects.sweat).toBe(true);
});

test('a combo plays on the page as a clip the timeline steps through', async ({ editor, page }) => {
    test.setTimeout(120_000);
    const studio = await twoFighters(editor, page);
    await studio.getByRole('button', { name: 'Play on page' }).click();
    const clip = () =>
        page.evaluate(() => {
            const objs = (
                window.__fateboard!.state('canvas') as { getObjects: () => Clip[] }
            ).getObjects();
            const c = objs.find((o) => o.fightClip) as
                (Clip & { getObjects: () => { visible: boolean }[] }) | undefined;
            if (!c?.fightClip) return null;
            const kids = c.getObjects();
            const { first, count } = c.fightClip;
            return {
                count,
                shown: kids.slice(first, first + count).findIndex((k) => k.visible),
                duration: window.__fateboard!.state('animDuration') as number,
                end: c.fightClip.start + (count / c.fightClip.fps) * 1000,
            };
        });
    await expect.poll(clip, { timeout: 60_000 }).not.toBeNull();
    // it plays right away: stop at the start to step through it
    await page.evaluate(() => (window.__fateboard!.state('stop') as () => void)());
    const first = (await clip())!;
    expect(first.count).toBeGreaterThan(10);
    expect(first.duration).toBeGreaterThanOrEqual(Math.floor(first.end));
    expect(first.shown).toBe(0);
    // scrub to the middle: a later drawing shows, and only one
    await page.evaluate(
        (t) => (window.__fateboard!.state('seek') as (ms: number) => void)(t),
        first.end / 2,
    );
    await expect.poll(async () => (await clip())!.shown).toBeGreaterThan(0);
});

// 2026-11-27 (owner): "Play on page" made the app slow (one clip = 12k shapes, 16 MB in every undo step and
// autosave) and the timeline had to be found by hand. Now the clip plays on the timeline right away, is saved as
// a poster + recipe, and an undo / redo brings every drawing back.
test('Play on page opens the timeline and plays; the clip stays light through undo and redo', async ({
    editor,
    page,
}) => {
    test.setTimeout(120_000);
    const studio = await twoFighters(editor, page);
    await studio.getByRole('button', { name: 'Play on page' }).click();
    await expect(studio).toHaveCount(0, { timeout: 60_000 });
    const dock = page.getByRole('region', { name: 'Timeline' });
    await expect(dock.getByRole('button', { name: 'Pause' })).toBeVisible();
    await expect.poll(() => editor.state<number>('currentTime')).toBeGreaterThan(0);
    await page.evaluate(() => (window.__fateboard!.state('pause') as () => void)());

    const drawings = () =>
        page.evaluate(() => {
            const c = (
                window.__fateboard!.state('canvas') as {
                    getObjects: () => (Clip & {
                        getObjects: () => { getObjects?: () => unknown[] }[];
                    })[];
                }
            )
                .getObjects()
                .find((o) => o.fightClip);
            if (!c?.fightClip) return null;
            const { first, count } = c.fightClip;
            return c
                .getObjects()
                .slice(first, first + count)
                .map((k) => k.getObjects?.().length ?? 0);
        });
    const full = (await drawings())!;
    expect(full.filter((n) => n > 0).length).toBeGreaterThan(10);
    const historyMB = () =>
        page.evaluate(
            () =>
                (window.__fateboard!.state('undoStack') as string[]).reduce(
                    (n, s) => n + s.length,
                    0,
                ) / 1e6,
        );
    await expect.poll(historyMB).toBeGreaterThan(0);
    expect(await historyMB()).toBeLessThan(3);

    // undo takes the clip away, redo brings it back with every drawing
    await page.keyboard.press('Escape');
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(drawings).toBeNull();
    await page.keyboard.press('ControlOrMeta+Shift+z');
    await expect.poll(drawings, { timeout: 30_000 }).toEqual(full);
});

test('a combo you build is saved and still there after a reload', async ({ editor, page }) => {
    const studio = await twoFighters(editor, page);
    await studio.getByRole('button', { name: 'Add step' }).click();
    await studio.getByRole('button', { name: 'Add step' }).click();
    await expect(
        studio.getByRole('list', { name: 'Your combo' }).getByRole('listitem'),
    ).toHaveCount(2);
    await studio.getByRole('textbox', { name: 'Combo name' }).fill('Double jab');
    await studio.getByRole('button', { name: 'Save combo' }).click();
    const saved = () =>
        page.evaluate(() =>
            (window.__fateboard!.state('fightCombos') as { name: string }[]).map((c) => c.name),
        );
    await expect.poll(saved).toEqual(['Double jab']);
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await page.evaluate(() =>
        (window.__fateboard!.state('loadFightCombos') as () => Promise<void>)(),
    );
    await expect.poll(saved).toEqual(['Double jab']);
});
