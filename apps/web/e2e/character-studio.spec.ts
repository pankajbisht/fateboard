import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';

/**
 * Character Studio phase 1 (docs/CHARACTER_STUDIO.md): make, pose, turn, place on the page; the character
 * is saved with the page, opens again for editing, updates in place, and the board's undo brings it back.
 */
const characters = (page: import('@playwright/test').Page) =>
    page.evaluate(() =>
        (
            window.__fateboard!.state('canvas') as {
                getObjects: () => {
                    characterData?: {
                        character: {
                            name: string;
                            hair: { style: string };
                            rig: { pose: { id: string } };
                        };
                    };
                }[];
            }
        )
            .getObjects()
            .filter((o) => o.characterData)
            .map((o) => ({
                name: o.characterData!.character.name,
                hair: o.characterData!.character.hair.style,
                pose: o.characterData!.character.rig.pose.id,
            })),
    );

test('make a character, pose and turn it, place it; it stays after a reload and updates in place', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: /^Meera/ }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await expect(studio).toBeVisible();

    await studio.getByRole('radio', { name: 'Poses' }).click();
    await studio.getByRole('textbox', { name: 'Search poses' }).fill('wave');
    await studio.getByRole('button', { name: 'Wave', exact: true }).click();
    await studio.getByRole('button', { name: '¾' }).click();
    await expect(studio.getByRole('img', { name: 'Meera, wave' })).toBeVisible();

    await studio.getByRole('button', { name: 'Place on page' }).click();
    await expect(studio).toHaveCount(0);
    await expect
        .poll(() => characters(page))
        .toEqual([{ name: 'Meera', hair: 'long', pose: 'wave' }]);

    await page.waitForTimeout(1500); // autosave
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect
        .poll(() => characters(page))
        .toEqual([{ name: 'Meera', hair: 'long', pose: 'wave' }]);

    // select it on the board, edit it in the studio, update it in place
    const b = await page.evaluate(() => window.__fateboard!.bounds(0));
    const box = (await editor.settledCanvasBox())!;
    const k = box.width / b.canvasWidth;
    await page.mouse.click(box.x + (b.left + b.width / 2) * k, box.y + (b.top + b.height / 2) * k);
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'Edit Meera' }).click();
    await expect(studio.getByRole('button', { name: 'Update on page' })).toBeVisible();
    await studio.getByRole('radio', { name: 'Look' }).click();
    await studio.getByRole('combobox', { name: 'Hair style' }).click();
    await page.getByRole('option', { name: 'Tied up: Bun', exact: true }).click();
    await studio.getByRole('button', { name: 'Update on page' }).click();
    await expect(studio).toHaveCount(0);
    await expect
        .poll(() => characters(page))
        .toEqual([{ name: 'Meera', hair: 'bun', pose: 'wave' }]);

    // one board undo step puts the earlier character back
    await page.keyboard.press('ControlOrMeta+z');
    await expect
        .poll(() => characters(page))
        .toEqual([{ name: 'Meera', hair: 'long', pose: 'wave' }]);
});

// fate-reviewer (2026-11-18): recolouring had no working control in the studio; focus could leave the dialog
test('recolour a part with a custom colour; the keyboard stays in the studio', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'Open Character Studio' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await expect(studio).toBeVisible();

    // Tab never leaves the studio for the editor behind it
    for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        expect(
            await page.evaluate(() => !!document.activeElement?.closest('[data-character-studio]')),
        ).toBe(true);
    }

    await studio
        .locator('svg[role="img"] path[data-part="torso"]')
        .first()
        .dispatchEvent('pointerdown');
    await expect(studio.getByRole('combobox', { name: 'Part' })).toHaveText(/Torso/);
    await studio.getByRole('button', { name: 'Torso: top colour' }).click();
    const picker = page.getByRole('dialog', { name: 'Custom color' });
    await picker.getByRole('textbox', { name: 'Hex' }).fill('#123456');
    await picker.getByRole('textbox', { name: 'Hex' }).press('Enter');
    await picker.getByRole('textbox', { name: 'Hex' }).press('Escape');
    await expect(picker).toHaveCount(0);
    await expect(studio).toBeVisible();

    await studio.getByRole('button', { name: 'Place on page' }).click();
    await expect(studio).toHaveCount(0);
    const top = await page.evaluate(
        () =>
            (
                window.__fateboard!.state('canvas') as {
                    getObjects: () => {
                        characterData?: { character: { dress: { top: { color: string } } } };
                    }[];
                }
            ).getObjects()[0].characterData!.character.dress.top.color,
    );
    expect(top).toBe('#123456');
});

// style packs S1 (2026-11-18): the 5 styles switch in one click; manga screentone reaches the page as a tone fill
test('switch art style; a manga character is placed with real screentone', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: /^Ananya/ }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    for (const style of ['Anime', 'Webtoon', 'Realistic', 'Manga B/W']) {
        await studio.getByRole('combobox', { name: 'Art style' }).click();
        await page.getByRole('option', { name: style, exact: true }).click();
        await expect(studio.getByRole('combobox', { name: 'Art style' })).toHaveText(style);
    }
    if (process.env.STYLE_SHOTS)
        await page.screenshot({ path: `${process.env.STYLE_SHOTS}/studio-manga.png` });
    await studio.getByRole('button', { name: 'Place on page' }).click();
    await expect(studio).toHaveCount(0);
    const toned = await page.evaluate(() => {
        const g = (
            window.__fateboard!.state('canvas') as {
                getObjects: () => {
                    getObjects: () => { toneParams?: unknown }[];
                    characterData?: { character: { style: string } };
                }[];
            }
        ).getObjects()[0];
        return {
            style: g.characterData!.character.style,
            toned: g.getObjects().filter((o) => o.toneParams).length,
        };
    });
    expect(toned.style).toBe('manga');
    expect(toned.toned).toBeGreaterThan(3);
    if (process.env.STYLE_SHOTS)
        await page.screenshot({ path: `${process.env.STYLE_SHOTS}/board-manga.png` });
});

test('the Cast tab browses 100 people: filter, search, start from one', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'Open Character Studio' }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('radio', { name: 'Cast' }).click();
    await expect(studio.getByText('Cast (100)')).toBeVisible();
    await studio.getByRole('button', { name: 'Children' }).click();
    const count = await studio.locator('button[title^="Start from "]').count();
    expect(count).toBeGreaterThanOrEqual(12);
    await studio.getByRole('button', { name: 'All ages' }).click();
    await studio.getByRole('textbox', { name: 'Search the cast' }).fill('teacher');
    const first = studio.locator('button[title^="Start from "]').first();
    const name = (await first.getAttribute('title'))!.replace('Start from ', '');
    await first.click();
    await expect(studio.getByRole('textbox', { name: 'Character name' })).toHaveValue(name);
});

test('the Face tab: an emotion and a mouth shape change the face the page gets', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: /^Meera/ }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('radio', { name: 'Face' }).click();
    await studio.getByRole('button', { name: 'Angry' }).click();
    await studio.getByRole('slider', { name: /Eyes closed/ }).fill('100');
    await studio.getByRole('button', { name: 'Place on page' }).click();
    await expect(studio).toHaveCount(0);
    const face = await page.evaluate(() => {
        const g = (
            window.__fateboard!.state('canvas') as {
                getObjects: () => {
                    characterData?: {
                        character: { emotion: { id: string }; face: { blink: number } };
                    };
                }[];
            }
        ).getObjects()[0];
        return {
            emotion: g.characterData!.character.emotion.id,
            blink: g.characterData!.character.face.blink,
        };
    });
    expect(face).toEqual({ emotion: 'angry', blink: 1 });
});

for (const scheme of ['light', 'dark'] as const) {
    test(`the open studio has no axe violations (${scheme})`, async ({ editor, page }) => {
        // six tabs, each scanned whole: the Cast and Poses tabs hold hundreds of SVG previews, so axe takes about 12 s
        // in Chromium here and far longer in Firefox on a 2-vCPU CI runner (it timed out at 30 s)
        test.slow();
        await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
        await editor.openPanel('Characters');
        await page.getByRole('button', { name: 'Open Character Studio' }).click();
        const studio = page.getByRole('dialog', { name: 'Character Studio' });
        await expect(studio).toBeVisible();
        const seen: string[] = [];
        for (const tab of ['Cast', 'Body', 'Look', 'Wardrobe', 'Face', 'Poses']) {
            await studio.getByRole('radio', { name: tab }).click();
            const { violations } = await new AxeBuilder({ page })
                .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
                .analyze();
            for (const v of violations)
                seen.push(
                    `${tab}: ${v.id} (${v.impact}): ${v.nodes
                        .slice(0, 3)
                        .map((n) => n.target.join(' '))
                        .join(' | ')}`,
                );
        }
        expect(seen).toEqual([]);
    });
}

test('Wardrobe: an outfit, shoes and an accessory change the character; a conflicting one is refused', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: /^Meera/ }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await studio.getByRole('radio', { name: 'Wardrobe' }).click();
    const dress = () =>
        page.evaluate(
            () =>
                (
                    window.__fateboard!.state('studioCharacter') as {
                        dress: {
                            top: { kind: string };
                            shoes: { kind: string };
                            accessories: { kind: string }[];
                            held: { kind: string; hand: string }[];
                        };
                    }
                ).dress,
        );
    await studio.getByRole('combobox', { name: 'School outfit' }).click();
    await page.getByRole('option', { name: 'School skirt', exact: true }).click();
    await expect.poll(async () => (await dress()).top.kind).toBe('school-shirt');
    await studio.getByRole('combobox', { name: 'Shoes' }).click();
    await page.getByRole('option', { name: 'Boots', exact: true }).click();
    await studio.getByRole('combobox', { name: 'Right hand holds' }).click();
    await page.getByRole('option', { name: 'Katana', exact: true }).click();
    await expect.poll(async () => (await dress()).held).toEqual([{ kind: 'katana', hand: 'R' }]);
    await studio.getByRole('switch', { name: /^Glasses/ }).click();
    await expect
        .poll(async () => (await dress()).accessories.map((a) => a.kind))
        .toContain('glasses');
    expect((await dress()).shoes.kind).toBe('boots');
    // a tie needs a shirt collar: a tank top refuses it, and says why
    await studio.getByRole('radio', { name: 'Look' }).click();
    await studio.getByRole('combobox', { name: 'Top' }).click();
    await page.getByRole('option', { name: 'Tank top', exact: true }).click();
    await studio.getByRole('radio', { name: 'Wardrobe' }).click();
    await expect(studio.getByRole('switch', { name: /^Tie/ })).toBeDisabled();
});

// manga look (2026-11-24): a new character is manga-friendly (anime style, relaxed idle); body style, variant,
// eyelashes and an ahoge reach the page, survive a reload, and switching to classic updates it in place
const look = (page: import('@playwright/test').Page) =>
    page.evaluate(() =>
        (
            window.__fateboard!.state('canvas') as {
                getObjects: () => {
                    characterData?: {
                        character: {
                            style: string;
                            body: { bodyStyle: string; mangaVariant: string };
                            hair: { ahoge: boolean };
                            rig: { pose: { id: string } };
                        };
                    };
                }[];
            }
        )
            .getObjects()
            .filter((o) => o.characterData)
            .map((o) => {
                const c = o.characterData!.character;
                return {
                    style: c.style,
                    body: c.body.bodyStyle,
                    variant: c.body.mangaVariant,
                    ahoge: c.hair.ahoge,
                    pose: c.rig.pose.id,
                };
            }),
    );

test('body style: a manga character with its variant and ahoge is placed, reloads, and switches to classic', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: /^Meera/ }).click();
    const studio = page.getByRole('dialog', { name: 'Character Studio' });
    await expect(studio.getByRole('img', { name: 'Meera, relaxed idle' })).toBeVisible();

    await studio.getByRole('radio', { name: 'Body' }).click();
    await expect(studio.getByRole('radio', { name: 'Manga' })).toBeChecked();
    await studio.getByRole('combobox', { name: 'Manga variant' }).click();
    await page.getByRole('option', { name: /Webtoon/ }).click();
    await studio.getByRole('radio', { name: 'Look' }).click();
    await studio.getByRole('switch', { name: /Ahoge/ }).click();

    await studio.getByRole('button', { name: 'Place on page' }).click();
    await expect(studio).toHaveCount(0);
    const manga = {
        style: 'anime',
        body: 'manga',
        variant: 'webtoon',
        ahoge: true,
        pose: 'manga-idle',
    };
    await expect.poll(() => look(page)).toEqual([manga]);

    await page.waitForTimeout(1500); // autosave
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(() => look(page)).toEqual([manga]);

    // edit it again and switch the body to classic: the relaxed idle becomes the plain stand
    const b = await page.evaluate(() => window.__fateboard!.bounds(0));
    const box = (await editor.settledCanvasBox())!;
    const k = box.width / b.canvasWidth;
    await page.mouse.click(box.x + (b.left + b.width / 2) * k, box.y + (b.top + b.height / 2) * k);
    await editor.openPanel('Characters');
    await page.getByRole('button', { name: 'Edit Meera' }).click();
    await studio.getByRole('radio', { name: 'Body' }).click();
    await studio.getByRole('radio', { name: 'Classic' }).click();
    await studio.getByRole('button', { name: 'Update on page' }).click();
    await expect(studio).toHaveCount(0);
    await expect.poll(() => look(page)).toEqual([{ ...manga, body: 'classic', pose: 'stand' }]);
});
