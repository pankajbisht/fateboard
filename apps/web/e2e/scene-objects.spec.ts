import { test, expect } from './fixtures';

/**
 * Scene Objects phase 1 (docs/PROPS.md): add manga props from the left rail by click or by drag and drop;
 * they are ordinary objects (selected, undoable) and save with the page.
 */
const props = (page: import('@playwright/test').Page) =>
    page.evaluate(() =>
        (
            window.__fateboard!.state('canvas') as {
                getObjects: () => { propData?: { propId: string } }[];
            }
        )
            .getObjects()
            .filter((o) => o.propData)
            .map((o) => o.propData!.propId),
    );

test('click a prop to add it; undo removes it; it stays after a reload', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Scene Objects');
    await page.getByRole('button', { name: 'Add Sakura tree' }).click();
    await expect.poll(() => props(page)).toEqual(['tree-sakura']);
    await expect.poll(() => page.evaluate(() => window.__fateboard!.selection().length)).toBe(1);

    await page.getByRole('button', { name: 'Sky', exact: true }).click();
    await page.getByRole('button', { name: 'Add Crescent moon' }).click();
    await expect.poll(() => props(page)).toEqual(['tree-sakura', 'moon-crescent']);

    // one undo step per prop (a reload starts a new history)
    await editor.clickEmptyCanvas();
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(() => props(page)).toEqual(['tree-sakura']);

    await page.waitForTimeout(1500); // autosave
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(() => props(page)).toEqual(['tree-sakura']);
});

test('drag a prop onto the page: it lands where it was dropped', async ({ editor, page }) => {
    await editor.openPanel('Scene Objects');
    await page.getByRole('searchbox', { name: 'Search scene objects' }).fill('pine');
    const box = (await editor.settledCanvasBox())!;
    const target = { x: Math.round(box.width * 0.3), y: Math.round(box.height * 0.4) };
    await page.getByRole('button', { name: 'Add Pine tree' }).dragTo(editor.canvas, {
        targetPosition: target,
    });
    await expect.poll(() => props(page)).toEqual(['tree-pine']);

    const b = await page.evaluate(() => window.__fateboard!.bounds(0));
    const k = box.width / b.canvasWidth;
    expect(Math.abs((b.left + b.width / 2) * k - target.x)).toBeLessThan(4);
    expect(Math.abs((b.top + b.height / 2) * k - target.y)).toBeLessThan(4);
});

test('every added category places its props (vehicles … japan)', async ({ editor, page }) => {
    await editor.openPanel('Scene Objects');
    for (const [category, card, id] of [
        ['Vehicles', 'Add Bicycle', 'bicycle'],
        ['Furniture', 'Add Chair', 'chair'],
        ['Kitchen', 'Add Cup', 'cup'],
        ['Street', 'Add Street lamp', 'street-lamp'],
        ['Buildings', 'Add Village house', 'house-village'],
        ['Classroom', 'Add Blackboard', 'blackboard'],
        ['Effects', 'Add Sweat drop', 'sweat-drop'],
        ['Japan', 'Add Torii gate', 'torii'],
    ] as const) {
        await page.getByRole('button', { name: category, exact: true }).click();
        await page.getByRole('button', { name: card, exact: true }).click();
        await expect.poll(async () => (await props(page)).at(-1)).toBe(id);
    }
    expect(await props(page)).toEqual([
        'bicycle',
        'chair',
        'cup',
        'street-lamp',
        'house-village',
        'blackboard',
        'sweat-drop',
        'torii',
    ]);
});

const firstProp = (page: import('@playwright/test').Page) =>
    page.evaluate(() => {
        const o = (
            window.__fateboard!.state('canvas') as {
                getObjects: () => { propData?: Record<string, unknown> }[];
            }
        )
            .getObjects()
            .find((x) => x.propData);
        return o?.propData ?? null;
    });

test('favourites and recent props stay after a reload', async ({ editor, page }) => {
    await editor.openPanel('Scene Objects');
    await page.getByRole('button', { name: 'Favorite Pine tree' }).click();
    await page.getByRole('button', { name: 'Add Bush', exact: true }).click();
    await expect.poll(() => props(page)).toEqual(['bush']);
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await editor.openPanel('Scene Objects');
    await expect(page.getByRole('button', { name: 'Favorites', pressed: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Pine tree', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Recent', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Add Bush', exact: true })).toBeVisible();
});

test('restyle the selected prop: variant, screentone, Randomize; undo puts it back', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Scene Objects');
    await page.getByRole('button', { name: 'Add Round tree', exact: true }).click();
    await expect(page.getByText('Selected: Round tree')).toBeVisible();

    await page.getByRole('radio', { name: 'Twin' }).click();
    await expect.poll(async () => (await firstProp(page))?.variant).toBe(2);
    await page.getByRole('radio', { name: 'Dots' }).click();
    await expect
        .poll(async () => ((await firstProp(page))?.tone as { kind: string } | undefined)?.kind)
        .toBe('dots');
    expect(await props(page)).toEqual(['tree-round']); // the same single object

    await page.getByRole('button', { name: 'Randomize' }).click();
    await expect.poll(async () => (await firstProp(page))?.variant).not.toBe(2);

    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(async () => (await firstProp(page))?.variant).toBe(2);
});

test('a scene preset fills three layers; Night relights every prop in one undo step', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Scene Objects');
    await page.getByRole('button', { name: 'Forest scene' }).click();
    await expect.poll(async () => (await props(page)).length).toBeGreaterThan(5);
    const layers = await page.evaluate(() =>
        (window.__fateboard!.state('pageLayers') as { name: string }[]).map((l) => l.name),
    );
    expect(layers).toEqual(expect.arrayContaining(['Background', 'Midground', 'Foreground']));

    const lights = () =>
        page.evaluate(() =>
            (
                window.__fateboard!.state('canvas') as {
                    getObjects: () => { propData?: { light: string } }[];
                }
            )
                .getObjects()
                .filter((o) => o.propData)
                .map((o) => o.propData!.light),
        );
    await page.getByRole('radio', { name: 'Night' }).click();
    await expect.poll(async () => new Set(await lights())).toEqual(new Set(['night']));
    await editor.clickEmptyCanvas();
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(async () => new Set(await lights())).toEqual(new Set(['day']));
});

test('a tree gets a looping wind sway on the timeline', async ({ editor, page }) => {
    await editor.openPanel('Scene Objects');
    await page.getByRole('button', { name: 'Add Round tree', exact: true }).click();
    await page.getByRole('button', { name: 'Add wind sway' }).click();
    await expect
        .poll(() =>
            page.evaluate(() => {
                const tracks = window.__fateboard!.state('tracks') as Record<
                    string,
                    { keyframes: { props: { skewX?: number } }[] }
                >;
                return Object.values(tracks).some((t) =>
                    t.keyframes.some((k) => Math.abs(k.props.skewX ?? 0) > 1),
                );
            }),
        )
        .toBe(true);
});

test('import my own SVG prop, place it, export a pack, delete it', async ({ editor, page }) => {
    await editor.openPanel('Scene Objects');
    await page.getByRole('button', { name: 'My props', exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import SVG or PNG' }).click();
    await (
        await chooser
    ).setFiles({
        name: 'Lantern.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from(
            '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="90"><script>window.hacked=1</script><rect width="60" height="90" fill="#e04848"/></svg>',
        ),
    });
    await page.getByRole('button', { name: 'Add Lantern', exact: true }).click();
    await expect
        .poll(() =>
            page.evaluate(() =>
                (window.__fateboard!.state('canvas') as { getObjects: () => { name?: string }[] })
                    .getObjects()
                    .map((o) => o.name),
            ),
        )
        .toContain('Lantern');
    expect(await page.evaluate(() => (window as { hacked?: number }).hacked)).toBeUndefined();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export pack' }).click();
    expect((await download).suggestedFilename()).toBe('my-props.fateprops.json');

    await page.getByRole('button', { name: 'Delete Lantern' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('button', { name: 'Add Lantern', exact: true })).toHaveCount(0);
});
