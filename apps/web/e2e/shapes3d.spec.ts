import { test, expect } from './fixtures';

const THREE_D = [
    'Cube',
    'Box',
    'Cylinder',
    'Cone',
    'Sphere',
    'Pyramid',
    'Prism',
    'Hexagonal Prism',
    'Torus',
];

test('3D shapes: each one is added as one path, can be undone, and survives a reload', async ({
    editor,
    page,
}) => {
    await editor.openPanel('Shapes');
    await page.getByRole('button', { name: '3D', exact: true }).click();

    for (const label of THREE_D) {
        await editor.addShape(label);
        await page.waitForTimeout(350); // history is debounced: one undo step per shape
    }
    const objects = await editor.objects();
    expect(objects).toHaveLength(THREE_D.length);
    expect(objects.every((o) => o.type === 'path')).toBe(true);
    expect(objects.every((o) => o.width > 0 && o.height > 0)).toBe(true);

    await page.keyboard.press('ControlOrMeta+z');
    await expect.poll(async () => (await editor.objects()).length).toBe(THREE_D.length - 1);

    await page.waitForTimeout(1500); // autosave debounce
    await page.reload();
    await page.waitForFunction(() => !!window.__fateboard?.ready());
    await expect.poll(async () => (await editor.objects()).length).toBe(THREE_D.length - 1);
});
