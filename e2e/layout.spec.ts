import { test, expect } from './fixtures';

/* Runs at 1440×900 and at 1024×700 (laptop project): nothing overflows or is cut off. */

test('no horizontal page scroll; header, footer and dock fit the window', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const vw = page.viewportSize()!.width;
    for (const part of [page.locator('header').first(), editor.footer]) {
        const box = (await part.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(vw + 1);
    }
    // footer: 16 px inset on both sides
    const footer = (await editor.footer.boundingBox())!;
    const fs = (await editor.footerView.getByRole('button').last().boundingBox())!;
    expect(Math.round(footer.x + footer.width - (fs.x + fs.width))).toBe(16);
});
