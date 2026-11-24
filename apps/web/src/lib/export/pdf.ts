/**
 * A one-page PDF from an RGB picture, written by hand (no library): header, a catalog, one page sized to the picture,
 * a content stream that draws the image over the whole page, the image itself (8-bit RGB, deflate-compressed with the
 * browser's CompressionStream), an info dictionary and a cross-reference table with exact byte offsets.
 */
export interface PdfImage {
    width: number;
    height: number;
    /** width × height × 3 bytes, rows top to bottom */
    rgb: Uint8Array;
}

export interface PdfOptions {
    /** page size in points (1/72 inch); default: the picture's pixels at 96 dpi */
    pageWidth?: number;
    pageHeight?: number;
    title?: string;
}

const enc = new TextEncoder();

/** Alpha-over-white: RGBA (what a canvas gives) → RGB. */
export function rgbaOverWhite(rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
    const out = new Uint8Array((rgba.length / 4) * 3);
    for (let i = 0, o = 0; i < rgba.length; i += 4, o += 3) {
        const a = rgba[i + 3] / 255;
        out[o] = Math.round(rgba[i] * a + 255 * (1 - a));
        out[o + 1] = Math.round(rgba[i + 1] * a + 255 * (1 - a));
        out[o + 2] = Math.round(rgba[i + 2] * a + 255 * (1 - a));
    }
    return out;
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
    if (typeof CompressionStream === 'undefined')
        throw new Error('This browser cannot make a PDF.');
    const source = new ReadableStream<BufferSource>({
        start(controller) {
            controller.enqueue(data as Uint8Array<ArrayBuffer>);
            controller.close();
        },
    });
    const stream = source.pipeThrough(new CompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A PDF string literal: only ASCII is kept, parentheses and backslashes are escaped. */
const literal = (s: string) => `(${s.replace(/[^\x20-\x7e]/g, '?').replace(/([()\\])/g, '\\$1')})`;
const num = (n: number) => String(Math.round(n * 100) / 100);

export async function pdfFromImage(image: PdfImage, opts: PdfOptions = {}): Promise<Uint8Array> {
    const { width, height, rgb } = image;
    if (!(width > 0 && height > 0) || rgb.length !== width * height * 3)
        throw new Error('The picture does not match its size.');
    const pw = opts.pageWidth ?? width * 0.75;
    const ph = opts.pageHeight ?? height * 0.75;
    const pixels = await deflate(rgb);
    const content = enc.encode(`q ${num(pw)} 0 0 ${num(ph)} 0 0 cm /Im0 Do Q`);

    const chunks: Uint8Array[] = [];
    let size = 0;
    const push = (c: Uint8Array | string) => {
        const b = typeof c === 'string' ? enc.encode(c) : c;
        chunks.push(b);
        size += b.length;
    };
    const offsets: number[] = [];
    const object = (n: number, dict: string, stream?: Uint8Array) => {
        offsets[n] = size;
        push(`${n} 0 obj\n`);
        if (stream) {
            push(`<< ${dict} /Length ${stream.length} >>\nstream\n`);
            push(stream);
            push('\nendstream\nendobj\n');
        } else push(`${dict}\nendobj\n`);
    };

    push('%PDF-1.4\n%âãÏÓ\n');
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    object(
        3,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(pw)} ${num(ph)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`,
    );
    object(4, '', content);
    object(
        5,
        `/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode`,
        pixels,
    );
    object(6, `<< /Title ${literal(opts.title ?? 'Scene')} /Producer (fateboard) >>`);

    const xref = size;
    push(`xref\n0 7\n0000000000 65535 f \n`);
    for (let n = 1; n <= 6; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
    push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

    const out = new Uint8Array(size);
    let p = 0;
    for (const c of chunks) {
        out.set(c, p);
        p += c.length;
    }
    return out;
}
