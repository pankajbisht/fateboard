#!/usr/bin/env node
/**
 * Character contact sheets for visual checks (skill `fate-character`). Renders cast characters through the real
 * renderer (src/character, loaded with Vite's SSR loader) and screenshots the grid with Playwright's Chromium.
 * Not a test: it asserts nothing, it makes pictures to look at.
 *
 *   node scripts/character/render-sheet.mjs <mode> --out <file.png> [options]
 *
 * Modes
 *   angles    full body per character × yaw                  --char sakura,haruto --yaw 0,25,335
 *   wardrobe  one garment slot swept, cropped to it          --char sakura --slot top|bottom --kinds tshirt,tank --yaw 25
 *   outfits   full body per top/bottom pair                  --char haruto --outfits tshirt/shorts,kurta/pants --yaw 15
 *   sweep     arms raised out to the side (gap check)        --char sakura --spread 0,30,60,90 --yaw 0,330
 *   poses     full body per pose id (posture check)           --char haruto --poses star-jump,sit-chair --top vest
 *   parts     print part key, depth, role and screen bbox      --char sakura --yaw 25 --match 'neck|collar'
 *             (no --out; add --top <kind> / --bottom <kind> to dress the character first)
 * Options
 *   --pose <id>      a pose from data/poses (default: the character's own)
 *   --height <px>    figure height (default 640; wardrobe 1000 with a crop)
 *   --offset t,l     wardrobe: move the crop window (px), for close-ups of a large --height render
 *   --effects k=v,…  wind, windDir, updraft, twirl, wet (0..1; windDir in degrees) on every figure
 *   --clip x,y,w,h   also save that region of the sheet (repeat with ';' between regions) as <out>-<i>.png
 * Run from apps/web. Writes <out>.html next to the PNG.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const [mode, ...rest] = process.argv.slice(2);
const opt = {};
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, '')] = rest[i + 1];
const list = (v, d = '') =>
    String(v ?? d)
        .split(',')
        .filter(Boolean);
if (
    !['angles', 'wardrobe', 'outfits', 'sweep', 'parts', 'poses'].includes(mode) ||
    (mode !== 'parts' && !opt.out)
) {
    process.stderr.write(
        'usage: render-sheet.mjs angles|wardrobe|outfits|sweep|poses --out <file.png> [...] | parts --char <id>\n',
    );
    process.exit(1);
}

const WEB = process.cwd();
const server = await createServer({
    root: WEB,
    configFile: false,
    logLevel: 'silent',
    optimizeDeps: { noDiscovery: true },
    resolve: { alias: { '@': `${WEB}/src` } },
    server: { middlewareMode: true },
    appType: 'custom',
});
const load = (p) => server.ssrLoadModule(`${WEB}/src/character/${p}`);
const { renderCharacter } = await load('render/renderCharacter.ts');
const { characterSvg } = await load('render/toSvg.ts');
const { castRecipes, castCharacter } = await load('data/cast.ts');
const { applyEdit } = await load('studio/edit.ts');
const { poseById } = await load('data/poses.ts');
const { pose } = await load('data/poseDsl.ts');

const person = (id, edit = {}) => {
    const r = castRecipes().find((x) => x.id === id);
    if (!r) throw new Error(`no cast member "${id}"`);
    const p = opt.pose ? poseById(opt.pose) : undefined;
    // --effects wind=0.8,windDir=0,updraft=0,twirl=0,wet=0 (schema/effects.ts)
    const effects = opt.effects
        ? Object.fromEntries(
              list(opt.effects).map((kv) => {
                  const [k, v] = kv.split('=');
                  return [k, Number(v)];
              }),
          )
        : undefined;
    return applyEdit(castCharacter(r, r.id), {
        ...(p ? { pose: p } : {}),
        ...(effects ? { effects } : {}),
        ...edit,
    });
};
const svgOf = (c, yaw, h) =>
    characterSvg(renderCharacter(c, { yaw: Number(yaw), pitch: 0, roll: 0, shot: 'full' }), h);

if (mode === 'parts') {
    const edit = {
        ...(opt.top ? { top: { kind: opt.top } } : {}),
        ...(opt.bottom ? { bottom: { kind: opt.bottom } } : {}),
    };
    const model = renderCharacter(person(opt.char ?? 'sakura', edit), {
        yaw: Number(opt.yaw ?? 25),
        pitch: 0,
        roll: 0,
        shot: 'full',
    });
    const re = new RegExp(opt.match ?? '.');
    for (const p of model.parts.filter((x) => re.test(x.key))) {
        const n = (p.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
        const xs = n.filter((_, i) => i % 2 === 0);
        const ys = n.filter((_, i) => i % 2 === 1);
        const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
            .map((v) => v.toFixed(1))
            .join(' ');
        process.stdout.write(`${p.key}\tdepth ${p.depth.toFixed(3)}\t${p.role}\tbbox ${box}\n`);
    }
    await server.close();
    process.exit(0);
}

const cells = [];
const H = Number(opt.height ?? (mode === 'wardrobe' ? 1000 : 640));
if (mode === 'angles')
    for (const id of list(opt.char, 'sakura,haruto'))
        for (const yaw of list(opt.yaw, '0,25,335'))
            cells.push([`${id} ${yaw}°`, svgOf(person(id), yaw, H)]);
if (mode === 'outfits')
    for (const id of list(opt.char, 'sakura'))
        for (const o of list(opt.outfits)) {
            const [top, bottom] = o.split('/');
            const edit = {
                ...(top ? { top: { kind: top } } : {}),
                ...(bottom ? { bottom: { kind: bottom } } : {}),
            };
            cells.push([`${id} ${o}`, svgOf(person(id, edit), opt.yaw ?? 15, H)]);
        }
if (mode === 'wardrobe') {
    const slot = opt.slot === 'bottom' ? 'bottom' : 'top';
    // crop to the slot (the upper body for a top, the hips and legs for a bottom), or --offset top,left (px) to move
    // the 340×330 window, e.g. onto the neck of a large render
    const [oy, ox] = opt.offset
        ? opt.offset.split(',').map(Number)
        : [slot === 'top' ? -H * 0.15 : -H * 0.43, -170];
    for (const id of list(opt.char, 'sakura'))
        for (const k of list(opt.kinds)) {
            const svg = svgOf(person(id, { [slot]: { kind: k } }), opt.yaw ?? 25, H);
            cells.push([
                `${id} ${k}`,
                `<div class="crop"><div style="margin:${oy}px 0 0 ${ox}px">${svg}</div></div>`,
            ]);
        }
}
if (mode === 'poses') {
    const edit = {
        ...(opt.top ? { top: { kind: opt.top } } : {}),
        ...(opt.bottom ? { bottom: { kind: opt.bottom } } : {}),
    };
    for (const id of list(opt.char, 'sakura'))
        for (const pid of list(opt.poses)) {
            const p = poseById(pid);
            if (!p) throw new Error(`no pose "${pid}"`);
            cells.push([`${id} ${pid}`, svgOf(person(id, { ...edit, pose: p }), opt.yaw ?? 15, H)]);
        }
}
if (mode === 'sweep')
    for (const id of list(opt.char, 'sakura'))
        for (const a of list(opt.spread, '0,30,60,90'))
            for (const yaw of list(opt.yaw, '0,330')) {
                const p = pose(`spread${a}`, `spread ${a}`, 'standing', [], {
                    armL: { spread: Number(a) },
                    armR: { spread: Number(a) },
                });
                cells.push([`${id} spread ${a} @${yaw}°`, svgOf(person(id, { pose: p }), yaw, H)]);
            }

const cols = Math.min(5, cells.length);
const html = `<!doctype html><body style="margin:0;background:#fff;font:13px sans-serif">
<div style="display:grid;grid-template-columns:repeat(${cols},340px)">${cells
    .map(([t, s]) => `<figure><figcaption>${t}</figcaption>${s}</figure>`)
    .join('')}</div>
<style>figure{margin:0;text-align:center;overflow:hidden}svg{height:${H}px;width:auto${
    mode === 'wardrobe' ? '' : ';max-width:340px'
}}.crop{height:330px;width:340px;overflow:hidden}</style></body>`;
const out = resolve(opt.out);
writeFileSync(out.replace(/\.png$/, '.html'), html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: cols * 340, height: 700 } });
await page.setContent(html);
await page.screenshot({ path: out, fullPage: true });
for (const [i, c] of list(opt.clip).length ? String(opt.clip).split(';').entries() : []) {
    const [x, y, width, height] = c.split(',').map(Number);
    await page.screenshot({
        path: out.replace(/\.png$/, `-${i}.png`),
        clip: { x, y, width, height },
    });
}
await browser.close();
await server.close();
process.stdout.write(`${out} (${cells.length} figures)\n`);
