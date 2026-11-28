// @vitest-environment node
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { pdfFromImage, rgbaOverWhite } from '../export/pdf';

const latin = (b: Uint8Array) => Buffer.from(b).toString('latin1');

/** An independent reader: trailer → xref → each object by its byte offset (every offset must be exact). */
function read(pdf: Uint8Array) {
    const text = latin(pdf);
    const start = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(text)![1]);
    expect(text.slice(start, start + 4)).toBe('xref');
    const table = text.slice(start).split('\n').slice(2, 9);
    const objects = new Map<number, { dict: string; stream?: Buffer }>();
    table.slice(1).forEach((row, i) => {
        const n = i + 1;
        const off = Number(row.slice(0, 10));
        expect(row.endsWith(' n '), row).toBe(true);
        expect(text.slice(off, off + `${n} 0 obj`.length)).toBe(`${n} 0 obj`);
        const end = text.indexOf('endobj', off);
        const body = text.slice(off + `${n} 0 obj\n`.length, end);
        const s = body.indexOf('stream\n');
        if (s < 0) return void objects.set(n, { dict: body.trim() });
        const len = Number(/\/Length (\d+)/.exec(body)![1]);
        const from = off + `${n} 0 obj\n`.length + s + 'stream\n'.length;
        expect(text.slice(from + len, from + len + 10)).toBe('\nendstream');
        objects.set(n, {
            dict: body.slice(0, s),
            stream: Buffer.from(pdf.subarray(from, from + len)),
        });
    });
    return { text, objects, trailer: text.slice(text.indexOf('trailer')) };
}

describe('pdfFromImage', () => {
    // 3 × 2: red, green, blue / white, black, grey
    const rgb = Uint8Array.from([
        255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 128, 128, 128,
    ]);

    it('is a valid one-page PDF: header, exact xref offsets, trailer, end marker', async () => {
        const pdf = await pdfFromImage({ width: 3, height: 2, rgb });
        expect(latin(pdf.subarray(0, 8))).toBe('%PDF-1.4');
        const { objects, trailer } = read(pdf);
        expect(objects.size).toBe(6);
        expect(trailer).toContain('/Size 7 /Root 1 0 R /Info 6 0 R');
        expect(objects.get(1)!.dict).toContain('/Type /Catalog');
        expect(objects.get(2)!.dict).toContain('/Count 1');
        expect(objects.get(3)!.dict).toMatch(/\/MediaBox \[0 0 2\.25 1\.5\]/);
    });

    it('the page is the picture at 96 dpi unless a size is given, and the title is escaped ASCII', async () => {
        const a = read(
            await pdfFromImage({ width: 1920, height: 1080, rgb: new Uint8Array(1920 * 1080 * 3) }),
        );
        expect(a.objects.get(3)!.dict).toContain('/MediaBox [0 0 1440 810]');
        const b = read(
            await pdfFromImage(
                { width: 3, height: 2, rgb },
                { pageWidth: 600, pageHeight: 400, title: 'Café (best) \\ photo' },
            ),
        );
        expect(b.objects.get(3)!.dict).toContain('/MediaBox [0 0 600 400]');
        expect(b.objects.get(6)!.dict).toContain('/Title (Caf? \\(best\\) \\\\ photo)');
        expect(latin(b.objects.get(4)!.stream!)).toBe('q 600 0 0 400 0 0 cm /Im0 Do Q');
    });

    it('the image is stored deflated and decompresses to exactly the pixels given', async () => {
        const { objects } = read(await pdfFromImage({ width: 3, height: 2, rgb }));
        const img = objects.get(5)!;
        expect(img.dict).toContain(
            '/Width 3 /Height 2 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode',
        );
        expect(new Uint8Array(inflateSync(img.stream!))).toEqual(rgb);
    });

    it('compresses a flat picture to a small file, and refuses a picture that does not match its size', async () => {
        const flat = await pdfFromImage({
            width: 1000,
            height: 1000,
            rgb: new Uint8Array(3_000_000).fill(200),
        });
        expect(flat.length).toBeLessThan(20_000);
        await expect(
            pdfFromImage({ width: 3, height: 2, rgb: rgb.subarray(0, 10) }),
        ).rejects.toThrow(/does not match/);
        await expect(pdfFromImage({ width: 0, height: 2, rgb: new Uint8Array() })).rejects.toThrow(
            /does not match/,
        );
    });
});

describe('rgbaOverWhite', () => {
    it('composites transparent pixels over white, keeps opaque ones, blends half-transparent ones', () => {
        const out = rgbaOverWhite(Uint8Array.from([10, 20, 30, 255, 0, 0, 0, 0, 0, 0, 0, 128]));
        expect([...out.slice(0, 3)]).toEqual([10, 20, 30]);
        expect([...out.slice(3, 6)]).toEqual([255, 255, 255]);
        expect(out[6]).toBeGreaterThan(120);
        expect(out[6]).toBeLessThan(135);
        expect(out).toHaveLength(9);
    });
});
