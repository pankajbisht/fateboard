import { test, expect } from './fixtures';

/**
 * Props in a scene (docs/PROPS.md §9): add Scene Objects in the Scene Studio by click and by dragging a card onto
 * the stage, walk one on the ground, place the scene on the page; the props stay after a reload.
 */
type Placed = { sceneData?: { scene: { props: { propId: string }[] } } };
const pageProps = (page: import('@playwright/test').Page) =>
    page.evaluate(() =>
        (window.__fateboard!.state('canvas') as { getObjects: () => Placed[] })
            .getObjects()
            .filter((o) => o.sceneData)
            .map((o) => o.sceneData!.scene.props.map((p) => p.propId).sort()),
    );
const studioProps = (page: import('@playwright/test').Page) =>
    page.evaluate(
        () =>
            (
                window.__fateboard!.state('studioScene') as {
                    props: { id: string; propId: string; x: number; z: number }[];
                }
            ).props,
    );

test('scene props: add by click and by drag, walk one, place on the page, reload', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('button', { name: 'Park' }).click();
    await studio.getByRole('radio', { name: 'Props' }).click();

    // click: in front of the camera, selected, drawn on the stage
    await studio.getByRole('button', { name: 'Add Round tree' }).click();
    await expect(studio.getByRole('button', { name: 'Remove' })).toBeVisible();
    await expect(studio.locator('path[data-prop]').first()).toBeVisible();

    // drag a card onto the stage: it lands there
    await studio
        .getByRole('group', { name: 'Prop category' })
        .getByRole('button', { name: 'Street' })
        .click();
    const stage = studio.getByRole('img', { name: /Park/ });
    const s = (await stage.boundingBox())!;
    await studio
        .getByRole('button', { name: 'Add Bench' })
        .dragTo(stage, { targetPosition: { x: s.width * 0.3, y: s.height * 0.85 } });
    await expect.poll(async () => (await studioProps(page)).length).toBe(2);

    // walk the bench on the ground
    const bench = (await studioProps(page)).find((p) => p.propId === 'bench')!;
    const path = studio.locator(`path[data-prop="${bench.id}"]`).last();
    const box = (await path.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 6 });
    await page.mouse.up();
    await expect
        .poll(async () => (await studioProps(page)).find((p) => p.id === bench.id)!.x)
        .not.toBe(bench.x);

    await studio.getByRole('button', { name: 'Place scene on page' }).click();
    await expect(studio).toHaveCount(0);
    await expect.poll(() => pageProps(page)).toEqual([['bench', 'tree-round']]);

    await page.waitForTimeout(1500); // autosave
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(() => pageProps(page)).toEqual([['bench', 'tree-round']]);
});
