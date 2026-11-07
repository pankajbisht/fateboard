import { test, expect } from './fixtures';

test('footer is the one zoom control: + / − / 100% / Fit', async ({ editor }) => {
    const view = editor.footerView;
    const pct = view.getByRole('button', { name: /Zoom to 100%/ });
    const read = async () => Number((await pct.textContent())!.replace('%', ''));
    const fit = await read();
    await view.getByRole('button', { name: 'Zoom in' }).click();
    await expect.poll(read).toBeGreaterThan(fit);
    await view.getByRole('button', { name: 'Zoom out' }).click();
    await view.getByRole('button', { name: 'Zoom out' }).click();
    await expect.poll(read).toBeLessThan(fit);
    await pct.click();
    await expect.poll(read).toBe(100);
    await view.getByRole('button', { name: 'Fit to screen' }).click();
    await expect.poll(read).toBe(fit);
});
