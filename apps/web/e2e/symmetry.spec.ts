/**
 * Symmetry Pro: the Mirror Chain, the M key, mirror sources (page edge, reference pin) and dragging a pin with
 * Alt while drawing. Unit tests cover the maths (lib/canvas/__tests__/symmetry*.test.ts) and the slice.
 */
import { test, expect, type Editor } from './fixtures';

const count = async (editor: Editor) => (await editor.objects()).length;

async function at(editor: Editor) {
    const box = await editor.settledCanvasBox();
    return (fx: number, fy: number) => [box.x + box.width * fx, box.y + box.height * fy] as const;
}

async function drag(
    editor: Editor,
    from: readonly [number, number],
    to: readonly [number, number],
    alt = false,
) {
    const { mouse, keyboard } = editor.page;
    if (alt) await keyboard.down('Alt');
    await mouse.move(...from);
    await mouse.down();
    await mouse.move(...to, { steps: 8 });
    await mouse.up();
    if (alt) await keyboard.up('Alt');
}

test('Mirror chain: a mirror then a 6-fold turn gives 12 pieces; M turns symmetry off', async ({
    editor,
    page,
}) => {
    await editor.openDockTab('Symmetry');
    await page
        .getByRole('group', { name: 'Drawing symmetry' })
        .getByRole('button', { name: 'Mirror chain' })
        .click();
    const add = page.getByRole('group', { name: 'Add a chain step' });
    await add.getByRole('button', { name: 'Mirror', exact: true }).click();
    await add.getByRole('button', { name: 'Turn', exact: true }).click();
    await expect(
        page.getByRole('status').filter({ hasText: '12 pieces per stroke' }),
    ).toBeVisible();

    const p = await at(editor);
    await page.keyboard.press('b');
    await drag(editor, p(0.55, 0.3), p(0.6, 0.2));
    await expect.poll(() => count(editor)).toBe(12);

    await page.keyboard.press('m');
    await expect.poll(() => editor.state<string>('symmetry')).toBe('none');
    await drag(editor, p(0.3, 0.7), p(0.35, 0.75));
    await expect.poll(() => count(editor)).toBe(13);

    await page.keyboard.press('m'); // back to the chain
    await expect.poll(() => editor.state<string>('symmetry')).toBe('chain');
});

test('Page source: the right page edge mirrors a stroke to the other side of that edge', async ({
    editor,
    page,
}) => {
    await editor.openDockTab('Symmetry');
    await page
        .getByRole('group', { name: 'Mirror source' })
        .getByRole('button', { name: 'Page' })
        .click();
    await page
        .getByRole('group', { name: 'Mirror through' })
        .getByRole('button', { name: 'Right edge' })
        .click();
    await expect.poll(() => editor.state<string>('symmetry')).toBe('x');
    const p = await at(editor);
    await page.keyboard.press('b');
    await drag(editor, p(0.4, 0.4), p(0.45, 0.45));
    await expect.poll(() => count(editor)).toBe(2);
    // the two pieces sit either side of the page's right edge, at the same distance
    const { centres, right } = await page.evaluate(() => {
        const fb = window.__fateboard!;
        const canvas = fb.state('canvas') as {
            getObjects: () => {
                excludeFromExport?: boolean;
                getCenterPoint: () => { x: number };
            }[];
        };
        return {
            centres: canvas
                .getObjects()
                .filter((o) => !o.excludeFromExport)
                .map((o) => o.getCenterPoint().x),
            right: fb.state('pageWidth') as number,
        };
    });
    expect((centres[0] + centres[1]) / 2).toBeCloseTo(right, 0);
});

test('Reference pin: Alt + drag moves it while drawing, without drawing a stroke', async ({
    editor,
    page,
}) => {
    await editor.openDockTab('Symmetry');
    await page
        .getByRole('group', { name: 'Mirror source' })
        .getByRole('button', { name: 'Reference pin' })
        .click();
    await expect(page.getByRole('textbox', { name: 'Name of Pin 1' })).toHaveValue('Pin 1');
    const pins = () => editor.state<{ x: number; y: number }[]>('symmetryPins');
    const before = (await pins())[0];

    const p = await at(editor);
    await page.keyboard.press('b');
    await drag(editor, p(0.5, 0.5), p(0.3, 0.6), true);
    await expect.poll(async () => (await pins())[0].x).not.toBeCloseTo(before.x, 0);
    expect(await count(editor)).toBe(0); // the grab never starts a stroke
});

const centres = (editor: Editor) =>
    editor.page.evaluate(() => {
        const canvas = window.__fateboard!.state('canvas') as {
            getObjects: () => {
                excludeFromExport?: boolean;
                getCenterPoint: () => { x: number };
            }[];
        };
        return canvas
            .getObjects()
            .filter((o) => !o.excludeFromExport)
            .map((o) => o.getCenterPoint().x);
    });

test('Linked copies follow edits; check, animate and a challenge leave the page clean', async ({
    editor,
    page,
}) => {
    await editor.openDockTab('Symmetry');
    await editor.addShape('Rectangle');
    for (let i = 0; i < 4; i++) await page.keyboard.press('Shift+ArrowRight');
    await page.getByRole('radio', { name: 'Page centre' }).click();
    await page.getByRole('button', { name: 'Reflect selection' }).click();
    await expect.poll(() => count(editor)).toBe(2);
    const pageMid = (await editor.state<number>('pageWidth')) / 2;
    const mid = async () => {
        const [a, b] = await centres(editor);
        return (a + b) / 2;
    };
    expect(await mid()).toBeCloseTo(pageMid, 0);

    // both selected and nudged: the copy is rebuilt as the mirror of the moved source
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
    await expect.poll(mid).toBeCloseTo(pageMid, 0);

    await page.getByRole('button', { name: 'Make and fix' }).click();
    await page.getByRole('button', { name: 'Check symmetry' }).click();
    await expect(page.getByRole('status').filter({ hasText: '100% symmetric' })).toBeVisible();

    await page.getByRole('button', { name: 'Animate' }).click();
    const before = await centres(editor);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => editor.state<boolean>('symmetryAnimating')).toBe(true);
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    await expect.poll(() => editor.state<boolean>('symmetryAnimating')).toBe(false);
    expect(await centres(editor)).toEqual(before);

    await page.getByRole('button', { name: 'Symmetry challenge' }).click();
    await page.getByRole('button', { name: 'Start a challenge' }).click();
    await expect.poll(() => count(editor)).toBeGreaterThanOrEqual(5);
    await page.getByRole('button', { name: 'End challenge' }).click();
    await expect.poll(() => count(editor)).toBe(2);
});
