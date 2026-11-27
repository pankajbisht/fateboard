/** Scene Objects phase 6 (docs/PROPS.md): user props, SVG sanitising, prop packs. */
import { describe, expect, it } from 'vitest';
import {
    MAX_SVG_CHARS,
    makePropPack,
    newUserPropId,
    parseUserProp,
    readPropPack,
    sanitizeSvg,
} from '../userProps';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const entry = (over: Record<string, unknown> = {}) => ({
    id: 'user-abc123',
    label: 'My lamp',
    kind: 'svg',
    data: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    width: 10,
    height: 10,
    ...over,
});

describe('sanitizeSvg', () => {
    it('keeps drawing, drops scripts, handlers, foreign content and outside links', () => {
        const dirty = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="40" height="30" onload="alert(1)">
            <script>alert(1)</script>
            <defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs>
            <rect width="40" height="30" fill="url(#g)" onclick="x()"/>
            <a href="javascript:alert(1)"><circle r="3"/></a>
            <foreignObject><div>hi</div></foreignObject>
            <image href="https://evil.example/x.png"/>
            <use xlink:href="#g"/>
            <use href="https://evil.example/s.svg#a"/>
        </svg>`;
        const out = sanitizeSvg(dirty)!;
        expect(out).toContain('<rect');
        expect(out).toContain('linearGradient');
        expect(out).not.toMatch(
            /script|onload|onclick|javascript:|foreignObject|evil\.example|<image/i,
        );
        expect(out).toContain('href="#g"'); // a local reference stays
        expect(sanitizeSvg(out)).toBe(out); // stable
    });

    it('is null for anything that is not an SVG, or too big', () => {
        expect(sanitizeSvg('<html><body/></html>')).toBeNull();
        expect(sanitizeSvg('not xml <')).toBeNull();
        expect(
            sanitizeSvg(
                `<svg xmlns="http://www.w3.org/2000/svg">${' '.repeat(MAX_SVG_CHARS)}</svg>`,
            ),
        ).toBeNull();
    });
});

describe('user prop entries', () => {
    it('reads a valid SVG or PNG entry, sanitising the SVG again', () => {
        expect(parseUserProp(entry())).toMatchObject({
            id: 'user-abc123',
            kind: 'svg',
            label: 'My lamp',
        });
        const tricky = parseUserProp(
            entry({ data: '<svg xmlns="http://www.w3.org/2000/svg"><script/><rect/></svg>' }),
        );
        expect(tricky!.data).not.toContain('script');
        expect(parseUserProp(entry({ kind: 'png', data: PNG }))).toMatchObject({ kind: 'png' });
    });

    it('rejects bad entries', () => {
        expect(parseUserProp(entry({ id: 'tree-round' }))).toBeNull(); // not a user id
        expect(parseUserProp(entry({ kind: 'gif' }))).toBeNull();
        expect(parseUserProp(entry({ kind: 'png', data: 'data:image/jpeg;base64,xx' }))).toBeNull();
        expect(parseUserProp(entry({ width: 0 }))).toBeNull();
        expect(parseUserProp(null)).toBeNull();
    });

    it('tidies the label', () => {
        expect(parseUserProp(entry({ label: '  ' }))!.label).toBe('My prop');
        expect(parseUserProp(entry({ label: 'x'.repeat(200) }))!.label).toHaveLength(60);
    });

    it('new ids are user ids', () => {
        expect(newUserPropId()).toMatch(/^user-[a-z0-9]{8,}$/);
        expect(newUserPropId()).not.toBe(newUserPropId());
    });
});

describe('prop packs', () => {
    it('round-trip through JSON', () => {
        const json = makePropPack([parseUserProp(entry())!]);
        const back = readPropPack(json);
        expect(back.props.map((p) => p.id)).toEqual(['user-abc123']);
        expect(back.skipped).toBe(0);
    });

    it('skip bad entries and refuse other files', () => {
        const json = JSON.stringify({
            format: 'fateboard-prop-pack',
            version: 1,
            props: [entry(), entry({ kind: 'nope' }), 5],
        });
        expect(readPropPack(json)).toMatchObject({ skipped: 2 });
        expect(() => readPropPack('{"format":"something-else"}')).toThrow(/not a prop pack/i);
        expect(() => readPropPack('{oops')).toThrow(/not a prop pack/i);
        expect(() =>
            readPropPack(JSON.stringify({ format: 'fateboard-prop-pack', version: 9, props: [] })),
        ).toThrow(/newer/i);
    });
});
