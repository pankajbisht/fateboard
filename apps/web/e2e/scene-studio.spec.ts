import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';

/**
 * Scenes (docs/CHARACTER_STUDIO.md §9): pick a place, add people, arrange and frame them, place the scene on the
 * page; it stays after a reload, opens again for editing and updates in place. Screenshots go to SCENE_SHOTS.
 */
type SceneObj = {
    sceneData?: {
        scene: { name: string; set: { environment: string; time: string }; actors: unknown[] };
    };
    width: number;
    height: number;
};
const scenes = (page: import('@playwright/test').Page) =>
    page.evaluate(() =>
        (window.__fateboard!.state('canvas') as { getObjects: () => SceneObj[] })
            .getObjects()
            .filter((o) => o.sceneData)
            .map((o) => ({
                place: o.sceneData!.scene.set.environment,
                time: o.sceneData!.scene.set.time,
                actors: o.sceneData!.scene.actors.length,
                ratio: Math.round((o.width / o.height) * 100) / 100,
            })),
    );

test('make a scene: place, cast, formation, view; place it on the page, reload, edit and update in place', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await expect(studio.getByRole('radio', { name: 'Scene', checked: true })).toBeVisible();

    await studio.getByRole('button', { name: 'Park' }).click();
    await studio.getByRole('radio', { name: 'Golden hour' }).click();
    await studio.getByRole('radio', { name: 'Cast' }).click();
    await studio.getByRole('button', { name: 'Add character' }).click();
    await studio.getByRole('button', { name: 'Add character' }).click();
    await studio.getByRole('button', { name: 'Conversation' }).click();
    await studio.getByRole('radio', { name: 'Camera' }).click();
    await studio.getByRole('button', { name: '¾ corner' }).click();
    await expect(studio.getByRole('img', { name: /Park, 3 characters/ })).toBeVisible();

    // drag a character on the stage: it walks on the ground (its spot changes)
    // (the dragged one: the nearest actor's torso, drawn last)
    const actor = studio.locator('path[data-actor]').last();
    const id = (await actor.getAttribute('data-actor'))!;
    const spot = () =>
        page.evaluate(
            (who) =>
                (
                    window.__fateboard!.state('studioScene') as {
                        actors: { id: string; x: number; z: number }[];
                    }
                ).actors.find((a) => a.id === who)!,
            id,
        );
    const before = await spot();
    const box = (await actor.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 20, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await spot()).x).not.toBe(before.x);
    if (process.env.SCENE_SHOTS)
        await page.screenshot({ path: `${process.env.SCENE_SHOTS}/studio-scene.png` });

    await studio.getByRole('button', { name: 'Place scene on page' }).click();
    await expect(studio).toHaveCount(0);
    await expect
        .poll(() => scenes(page))
        .toEqual([{ place: 'park', time: 'golden', actors: 3, ratio: 1.78 }]);
    if (process.env.SCENE_SHOTS)
        await page.screenshot({ path: `${process.env.SCENE_SHOTS}/board-scene.png` });

    await page.waitForTimeout(1500); // autosave
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect
        .poll(() => scenes(page))
        .toEqual([{ place: 'park', time: 'golden', actors: 3, ratio: 1.78 }]);

    // select it on the page, edit, update in place (still one object)
    const b = await page.evaluate(() => window.__fateboard!.bounds(0));
    const canvasBox = (await editor.settledCanvasBox())!;
    const k = canvasBox.width / b.canvasWidth;
    await page.mouse.click(
        canvasBox.x + (b.left + b.width / 2) * k,
        canvasBox.y + (b.top + b.height / 2) * k,
    );
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'Edit Scene' }).click();
    await expect(studio.getByRole('button', { name: 'Update scene on page' })).toBeVisible();
    await studio.getByRole('radio', { name: 'Place' }).click();
    await studio.getByRole('radio', { name: 'Night' }).click();
    await studio.getByRole('radio', { name: 'Frame' }).click();
    await studio.getByRole('combobox', { name: 'Frame shape' }).click();
    await page.getByRole('option', { name: 'Square 1:1' }).click();
    await studio.getByRole('button', { name: 'Update scene on page' }).click();
    await expect(studio).toHaveCount(0);
    await expect
        .poll(() => scenes(page))
        .toEqual([{ place: 'park', time: 'night', actors: 3, ratio: 1 }]);

    // one board undo brings the golden-hour scene back
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await expect
        .poll(() => scenes(page))
        .toEqual([{ place: 'park', time: 'golden', actors: 3, ratio: 1.78 }]);
});

test('templates: pick one, the scene becomes it, place it on the page', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('radio', { name: 'Start' }).click();
    await studio.getByRole('textbox', { name: 'Search templates' }).fill('festival');
    await studio.getByRole('button', { name: /Temple festival/ }).click();
    await expect(
        studio.getByRole('img', { name: /Temple festival: Temple, 5 characters/ }),
    ).toBeVisible();
    await studio.getByRole('button', { name: 'Place scene on page' }).click();
    await expect(studio).toHaveCount(0);
    await expect
        .poll(() => scenes(page))
        .toEqual([{ place: 'temple', time: 'golden', actors: 5, ratio: 1.78 }]);
});

test('Style Lock: one art style for everyone, also for characters added later', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('combobox', { name: 'Art style' }).click();
    await page.getByRole('option', { name: 'Noir' }).click();
    await studio.getByRole('radio', { name: 'Cast' }).click();
    await expect(studio.getByRole('switch', { name: 'Same style for everyone' })).toBeChecked();
    await studio.getByRole('button', { name: 'Add character' }).click();
    const styles = () =>
        page.evaluate(() =>
            (
                window.__fateboard!.state('studioScene') as {
                    actors: { character: { style: string } }[];
                }
            ).actors.map((a) => a.character.style),
        );
    expect(await styles()).toEqual(['noir', 'noir']);
});

test('crowd: the slider adds people to the picture and the page gets them', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('button', { name: 'Stadium' }).click();
    const paths = () =>
        studio
            .getByRole('img', { name: /Stadium/ })
            .locator('path')
            .count();
    const before = await paths();
    await studio.getByRole('slider', { name: /People in the background/ }).fill('60');
    await expect.poll(paths).toBeGreaterThan(before + 100);
    await studio.getByRole('button', { name: 'Place scene on page' }).click();
    await expect(studio).toHaveCount(0);
    const crowd = await page.evaluate(
        () =>
            (
                window.__fateboard!.state('canvas') as {
                    getObjects: () => { sceneData?: { scene: { set: { crowd: number } } } }[];
                }
            ).getObjects()[0].sceneData!.scene.set.crowd,
    );
    expect(crowd).toBe(60);
});

test('saved scenes: save, reload the page, open it from Your scenes in a new scene', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('textbox', { name: 'Scene name' }).fill('Evening ghat');
    await studio.getByRole('button', { name: 'River' }).click();
    await studio.getByRole('radio', { name: 'Night' }).click();
    await studio.getByRole('button', { name: 'Save to my scenes' }).click();
    await expect(page.getByText('Saved "Evening ghat" to your scenes')).toBeVisible();

    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    await studio.getByRole('radio', { name: 'Start' }).click();
    await expect(studio.getByText('Your scenes (1)')).toBeVisible();
    await studio.getByTitle('Open "Evening ghat"').click();
    await expect(studio.getByRole('img', { name: /Evening ghat: River/ })).toBeVisible();
    await studio.getByRole('radio', { name: 'Place' }).click();
    await expect(studio.getByRole('radio', { name: 'Night', checked: true })).toBeVisible();
});

test('export: the picture downloads as a real PNG at 1920 × 1080 with the scene drawn in it', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('button', { name: 'Park' }).click();
    await studio.getByRole('radio', { name: 'Frame' }).click();
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        studio.getByRole('button', { name: 'Download picture (PNG)' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('scene.png');
    const bytes = readFileSync((await download.path())!);
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    // IHDR: width and height, big-endian
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([1920, 1080]);
    // a picture, not a blank: a few KB at least (the sky, the park and a character)
    expect(bytes.length).toBeGreaterThan(20_000);
});

test('export: the picture downloads as a real one-page PDF sized to the frame', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('textbox', { name: 'Scene name' }).fill('Park walk');
    await studio.getByRole('button', { name: 'Park' }).click();
    await studio.getByRole('radio', { name: 'Frame' }).click();
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        studio.getByRole('button', { name: 'Download picture (PDF)' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('park-walk.pdf');
    const bytes = readFileSync((await download.path())!);
    const text = bytes.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/MediaBox [0 0 1440 810]');
    expect(text).toContain('/Width 1920 /Height 1080 /ColorSpace /DeviceRGB');
    expect(text).toContain('/Title (Park walk)');
    // the startxref offset points at the xref table
    const start = Number(/startxref\n(\d+)\n%%EOF/.exec(text)![1]);
    expect(text.slice(start, start + 4)).toBe('xref');
    // a picture, not a blank page: the compressed pixels are not tiny
    expect(bytes.length).toBeGreaterThan(30_000);
});

test('export: the layers download as a ZIP with the background, each character and the frame', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('radio', { name: 'Cast' }).click();
    await studio.getByRole('button', { name: 'Add character' }).click();
    await studio.getByRole('radio', { name: 'Frame' }).click();
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        studio.getByRole('button', { name: 'Download layers (ZIP)' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('scene.zip');
    const bytes = readFileSync((await download.path())!);
    expect(bytes.subarray(0, 4).toString('hex')).toBe('504b0304');
    const text = bytes.toString('latin1');
    for (const name of [
        'composite.svg',
        'layers/00-background.svg',
        'layers/01-',
        'layers/02-',
        'scene.json',
        'layers.json',
    ])
        expect(text, name).toContain(name);
});

// one test per tab and colour scheme: all five tabs in one test ran five full-page scans and passed the time limit on
// CI Firefox (the same scans and rules, split)
for (const scheme of ['light', 'dark'] as const)
    for (const tab of ['Start', 'Place', 'Cast', 'Camera', 'Frame']) {
        test(`Scene mode ${tab} tab has no axe violations (${scheme})`, async ({
            editor,
            page,
        }) => {
            await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
            await editor.openPanel('Characters');
            await page.getByRole('button', { name: 'New scene' }).click();
            const studio = page.getByRole('dialog', { name: 'Character Studio' });
            await expect(studio.getByRole('radio', { name: 'Scene', checked: true })).toBeVisible();
            await studio.getByRole('radio', { name: 'Cast' }).click();
            await studio.getByRole('button', { name: 'Add character' }).click();
            await studio.getByRole('radio', { name: tab }).click();
            const { violations } = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
                .analyze();
            expect(
                violations.map(
                    (v) =>
                        `${tab}: ${v.id} (${v.impact}): ${v.nodes
                            .slice(0, 3)
                            .map((n) => n.target.join(' '))
                            .join(' | ')}`,
                ),
            ).toEqual([]);
        });
    }

test('Together: a pair pose changes both people so their hands meet', async ({ editor, page }) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'New scene' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('radio', { name: 'Cast' }).click();
    await studio.getByRole('button', { name: 'Add character' }).click();
    await studio.getByRole('button', { name: 'Add character' }).click();
    const actors = () =>
        page.evaluate(() =>
            JSON.stringify(
                (
                    window.__fateboard!.state('studioScene') as {
                        actors: { x: number; z: number; character: { rig: { pose: unknown } } }[];
                    }
                ).actors.map((a) => [a.x, a.z, a.character.rig.pose]),
            ),
        );
    const before = await actors();
    const pairs = studio.getByRole('group', { name: 'Pair poses' });
    await expect(pairs).toBeVisible();
    await pairs.getByRole('button', { name: 'Handshake' }).click();
    await expect.poll(actors).not.toBe(before);
    // one undo puts both back
    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(actors).toBe(before);
});
