import { test, expect, type Editor } from './fixtures';
import type { Page } from '@playwright/test';

/*
 * Tablets and touch screens (iPad, Android): pinch zoom, two-finger pan, one-finger drawing, long
 * press = context menu, double tap = double click (lib/canvas/touchGestures). Touch events are
 * built in the page, the way the browser sends them: `touches` = all fingers down,
 * `changedTouches` = the ones that changed, target = where each finger first landed.
 */
test.use({ hasTouch: true, viewport: { width: 1180, height: 820 } }); // iPad Air, landscape

type Finger = { id: number; x: number; y: number };

async function touch(page: Page, type: string, down: Finger[], changed: Finger[]) {
    await page.evaluate(
        ({ type, down, changed }) => {
            const w = window as unknown as { __touchTargets?: Map<number, Element> };
            const targets = (w.__touchTargets ??= new Map());
            for (const f of changed)
                if (type === 'touchstart')
                    targets.set(f.id, document.elementFromPoint(f.x, f.y) ?? document.body);
            const plain = (f: { id: number; x: number; y: number }) => ({
                identifier: f.id,
                target: targets.get(f.id) ?? document.body,
                clientX: f.x,
                clientY: f.y,
                pageX: f.x,
                pageY: f.y,
                screenX: f.x,
                screenY: f.y,
            });
            const target = targets.get(changed[0].id) ?? document.body;
            let event: Event;
            try {
                const make = (f: { id: number; x: number; y: number }) => new Touch(plain(f));
                event = new TouchEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    composed: true,
                    touches: down.map(make),
                    targetTouches: down.map(make),
                    changedTouches: changed.map(make),
                });
            } catch {
                // WebKit cannot construct Touch from script: same lists on a plain event (the app
                // and Fabric only read type, touches, changedTouches and their coordinates)
                event = new Event(type, { bubbles: true, cancelable: true, composed: true });
                for (const [k, v] of [
                    ['touches', down.map(plain)],
                    ['targetTouches', down.map(plain)],
                    ['changedTouches', changed.map(plain)],
                ] as const)
                    Object.defineProperty(event, k, { value: v });
            }
            target.dispatchEvent(event);
            if (type === 'touchend') for (const f of changed) targets.delete(f.id);
        },
        { type, down, changed },
    );
}

/** One finger from `a` to `b` in steps. */
async function drag(page: Page, a: Finger, b: { x: number; y: number }, steps = 10) {
    await touch(page, 'touchstart', [a], [a]);
    let f = a;
    for (let i = 1; i <= steps; i++) {
        f = { id: a.id, x: a.x + ((b.x - a.x) * i) / steps, y: a.y + ((b.y - a.y) * i) / steps };
        await touch(page, 'touchmove', [f], [f]);
    }
    await touch(page, 'touchend', [], [f]);
}

/** Two fingers around (cx, cy): from `d0` px apart to `d1`, the midpoint moving by (mx, my). */
async function pinch(page: Page, cx: number, cy: number, d0: number, d1: number, mx = 0, my = 0) {
    const at = (t: number) => {
        const d = d0 + (d1 - d0) * t;
        const x = cx + mx * t;
        const y = cy + my * t;
        return [
            { id: 1, x: x - d / 2, y },
            { id: 2, x: x + d / 2, y },
        ];
    };
    const [a, b] = at(0);
    await touch(page, 'touchstart', [a], [a]);
    await touch(page, 'touchstart', [a, b], [b]);
    let last = at(0);
    for (let i = 1; i <= 8; i++) {
        last = at(i / 8);
        await touch(page, 'touchmove', last, last);
    }
    await touch(page, 'touchend', [last[0]], [last[1]]);
    await touch(page, 'touchend', [], [last[0]]);
}

async function centreOf(editor: Editor, index = 0) {
    const box = await editor.settledCanvasBox();
    const b = await editor.page.evaluate((i) => window.__fateboard!.bounds(i), index);
    const k = box.width / b.canvasWidth;
    return { x: box.x + (b.left + b.width / 2) * k, y: box.y + (b.top + b.height / 2) * k };
}

test('one finger draws; a pinch zooms the page and draws nothing', async ({ editor, page }) => {
    await page.keyboard.press('Shift+P'); // pencil
    await expect.poll(() => editor.state('activeTool')).toBe('pencil');
    const box = await editor.settledCanvasBox();
    const x = box.x + box.width * 0.3;
    const y = box.y + box.height * 0.5;

    await drag(page, { id: 1, x, y }, { x: x + 160, y: y - 40 });
    await expect.poll(async () => (await editor.objects()).length).toBe(1);
    expect((await editor.objects())[0].type).toBe('path');

    const zoom = await editor.state<number>('zoom');
    await pinch(page, box.x + box.width / 2, box.y + box.height / 2, 100, 220);
    await expect.poll(() => editor.state<number>('zoom')).toBeGreaterThan(zoom * 1.5);
    expect((await editor.objects()).length).toBe(1); // the first finger never started a stroke
    // the browser did not zoom the page itself
    expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1);
});

test('long press on a shape selects it and opens its context menu', async ({ editor, page }) => {
    await editor.addShape('Rectangle');
    await editor.clickEmptyCanvas();
    await expect.poll(async () => (await editor.selection()).length).toBe(0);
    const c = await centreOf(editor);

    const f = { id: 1, ...c };
    await touch(page, 'touchstart', [f], [f]);
    await expect(page.getByText('Copy', { exact: true })).toBeVisible(); // after ~500 ms
    await touch(page, 'touchend', [], [f]);
    await expect(page.getByText('Copy', { exact: true })).toBeVisible(); // lifting keeps it open
    expect((await editor.selection()).length).toBe(1);
    expect((await editor.objects())[0].width).toBeGreaterThan(0); // not moved or resized
});

test('double tap on a shape edits its nodes (touch sends no dblclick)', async ({
    editor,
    page,
}) => {
    await editor.addShape('Rectangle');
    await editor.clickEmptyCanvas();
    await page
        .getByRole('navigation', { name: 'Editor tools and panels' })
        .getByRole('button', { name: 'Select', exact: true })
        .click();
    const f = { id: 1, ...(await centreOf(editor)) };
    for (let i = 0; i < 2; i++) {
        await touch(page, 'touchstart', [f], [f]);
        await touch(page, 'touchend', [], [f]);
    }
    await expect.poll(() => editor.state('nodeMode')).toBe(true);
});

test('whiteboard: two fingers pan the board and pinch zooms at the fingers', async ({
    editor,
    page,
}) => {
    await page.goto('/setting');
    await page.getByRole('switch', { name: /Freehand/i }).click();
    await editor.open();
    const vpt = () =>
        page.evaluate(
            () =>
                [
                    ...(window.__fateboard!.state('canvas') as { viewportTransform: number[] })
                        .viewportTransform,
                ] as number[],
        );
    const box = await editor.settledCanvasBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await pinch(page, cx, cy, 150, 150, 80, 40); // same spread: a pan
    await expect.poll(async () => (await vpt())[4]).toBeGreaterThan(40);
    expect((await vpt())[0]).toBe(1);

    await pinch(page, cx, cy, 100, 200);
    await expect.poll(() => editor.state<number>('zoom')).toBeGreaterThan(1.5);
    expect((await editor.objects()).length).toBe(0);
});

test('Hand tool: one finger scrolls the design board', async ({ editor, page }) => {
    await editor.page.getByRole('button', { name: 'Zoom in' }).first().click();
    await editor.page.getByRole('button', { name: 'Zoom in' }).first().click();
    await page.keyboard.press('h');
    await expect.poll(() => editor.state('activeTool')).toBe('pan');
    const scroll = () =>
        page.evaluate(() => document.querySelector('[data-board-scroll]')!.scrollTop);
    const before = await scroll();
    const box = await editor.settledCanvasBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await drag(page, { id: 1, x, y }, { x, y: y - 120 });
    await expect.poll(scroll).toBeGreaterThan(before + 60);
});
