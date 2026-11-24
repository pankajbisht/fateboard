import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';
import { compose, decodeGif } from '../src/animation/gif/__tests__/decodeGif';

/**
 * GIF export in a real browser (2026-11-17): the encoder runs in its Web Worker, the file downloads,
 * and it is a valid looping GIF89a of the chosen width whose frame delays add up to the timeline.
 */

/** Walks the GIF blocks: size, loop, frames and their delays (1/100 s). */
function readGif(b: Buffer) {
    expect(b.subarray(0, 6).toString('latin1')).toBe('GIF89a');
    const width = b.readUInt16LE(6);
    const height = b.readUInt16LE(8);
    let p = 13 + (b[10] & 0x80 ? 3 * (1 << ((b[10] & 7) + 1)) : 0);
    const skipBlocks = () => {
        for (let len = b[p++]; len; len = b[p++]) p += len;
    };
    let loop = false;
    const delays: number[] = [];
    for (;;) {
        const tag = b[p++];
        if (tag === 0x3b) break;
        if (tag === 0x21) {
            const label = b[p++];
            if (label === 0xf9) {
                delays.push(b.readUInt16LE(p + 2));
                p += 6;
            } else {
                if (
                    label === 0xff &&
                    b.subarray(p + 1, p + 12).toString('latin1') === 'NETSCAPE2.0'
                )
                    loop = true;
                skipBlocks();
            }
        } else if (tag === 0x2c) {
            p += 9;
            if (b[p - 1] & 0x80) throw new Error('unexpected local colour table');
            p++; // LZW minimum code size
            skipBlocks();
        } else throw new Error(`bad block 0x${tag.toString(16)}`);
    }
    return { width, height, loop, delays };
}

test('a GIF of the animation downloads: right size, looping, delays add up to the timeline', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    const dock = await editor.openTimeline();
    await dock.getByRole('button', { name: 'Slide from left', exact: true }).click();
    await expect.poll(() => editor.state('isPlaying')).toBe(false);

    const panes = dock.getByRole('radiogroup', { name: 'Timeline panes' });
    await panes.getByRole('radio', { name: 'Export' }).click();
    await dock.getByRole('combobox', { name: 'Output' }).click();
    await page.getByRole('option', { name: /^GIF/ }).click();
    await dock.getByRole('combobox', { name: 'Size' }).click();
    await page.getByRole('option', { name: /320 px wide/ }).click();

    const download = page.waitForEvent('download');
    const encoder = page.waitForEvent('worker'); // encoded off the main thread
    await dock.getByRole('button', { name: 'Export GIF' }).click();
    expect((await encoder).url()).toMatch(/gif\.worker/);
    const file = await download;
    if (process.env.GIF_COPY) await file.saveAs(process.env.GIF_COPY);
    expect(file.suggestedFilename()).toBe('animation.gif');
    await expect(dock.getByRole('status')).toHaveText('Saved animation.gif');

    const gif = readGif(await readFile((await file.path())!));
    const board = await page.evaluate(() => {
        const c = window.__fateboard!.state('canvas') as {
            getWidth: () => number;
            getHeight: () => number;
        };
        return { w: c.getWidth(), h: c.getHeight() };
    });
    expect(gif.width).toBe(320);
    expect(gif.height).toBe(Math.round((320 * board.h) / board.w));
    expect(gif.loop).toBe(true);
    // the slide moves (several frames); the long still end is one frame, not dozens
    expect(gif.delays.length).toBeGreaterThan(3);
    expect(gif.delays.length).toBeLessThan(20);
    // 5 s at 15 fps = 76 frames of 1/15 s: 506 or 507 hundredths in all
    const total = gif.delays.reduce((a, d) => a + d, 0);
    expect(Math.abs(total - 507)).toBeLessThanOrEqual(1);
});

// fate-reviewer (2026-11-17), P1: Fabric painted the page colour into every frame, so this GIF was opaque
test('a transparent-background GIF has no page colour: the corners are transparent', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    const dock = await editor.openTimeline();
    await dock.getByRole('button', { name: 'Fade in', exact: true }).click();
    await expect.poll(() => editor.state('isPlaying')).toBe(false);
    await dock
        .getByRole('radiogroup', { name: 'Timeline panes' })
        .getByRole('radio', { name: 'Export' })
        .click();
    await dock.getByRole('combobox', { name: 'Output' }).click();
    await page.getByRole('option', { name: /^GIF/ }).click();
    await dock.getByRole('switch', { name: 'Transparent background' }).click();

    const download = page.waitForEvent('download');
    await dock.getByRole('button', { name: 'Export GIF' }).click();
    const gif = decodeGif(new Uint8Array(await readFile((await (await download).path())!)));
    const last = compose(gif).at(-1)!;
    expect(last[0]).toBe(-1); // top-left corner: nothing drawn
    expect(last[gif.width * gif.height - 1]).toBe(-1); // bottom-right corner
    expect(last[(gif.height >> 1) * gif.width + (gif.width >> 1)]).toBeGreaterThanOrEqual(0); // the shape
});

// fate-reviewer (2026-11-17): a worker that cannot load failed the export; it now encodes on the page
test('with the encoder worker blocked, the GIF is still made (on the page)', async ({
    editor,
    page,
    consoleErrors,
}) => {
    await page.route(/gif\.worker/, (route) => route.abort());
    await editor.addShape('Rectangle');
    const dock = await editor.openTimeline();
    await dock
        .getByRole('radiogroup', { name: 'Timeline panes' })
        .getByRole('radio', { name: 'Export' })
        .click();
    await dock.getByRole('combobox', { name: 'Output' }).click();
    await page.getByRole('option', { name: /^GIF/ }).click();

    const download = page.waitForEvent('download');
    await dock.getByRole('button', { name: 'Export GIF' }).click();
    const gif = decodeGif(new Uint8Array(await readFile((await (await download).path())!)));
    expect(gif.width).toBe(480);
    await expect(dock.getByRole('status')).toHaveText('Saved animation.gif');
    // the only errors: the browser reporting the blocked worker script
    expect(
        consoleErrors.every((t) => /Failed to load|worker|NetworkError|gif\.worker/i.test(t)),
    ).toBe(true);
    consoleErrors.length = 0;
});
