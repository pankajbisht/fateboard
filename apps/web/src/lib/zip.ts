/**
 * A minimal ZIP writer: "stored" entries (no compression), which is all layered export needs (SVG, JSON: small, and
 * every tool opens them). No dependency (docs/CHARACTER_STUDIO.md §9.3). Names are UTF-8; the date is fixed
 * (1980-01-01), so the same files always give the same bytes. Limits of the format used here: 65,535 entries and
 * 4 GB, far beyond a scene export.
 */
export interface ZipFile {
    /** path inside the archive, with `/` between folders */
    name: string;
    data: Uint8Array | string;
}

const enc = new TextEncoder();

let table: Uint32Array | null = null;
/** CRC-32 (IEEE) of the bytes. */
export function crc32(bytes: Uint8Array): number {
    if (!table) {
        table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            table[n] = c >>> 0;
        }
    }
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01

export function zip(files: ZipFile[]): Uint8Array {
    if (files.length > 0xffff) throw new Error('A ZIP holds at most 65,535 files here.');
    const entries = files.map((f) => {
        const name = enc.encode(f.name.replace(/^\/+/, ''));
        const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
        return { name, data, crc: crc32(data) };
    });
    let size = 22;
    for (const e of entries) size += 30 + e.name.length + e.data.length + 46 + e.name.length;
    const out = new Uint8Array(size);
    const v = new DataView(out.buffer);
    let p = 0;
    const offsets: number[] = [];
    for (const e of entries) {
        offsets.push(p);
        v.setUint32(p, 0x04034b50, true);
        v.setUint16(p + 4, 20, true); // version needed
        v.setUint16(p + 6, 0x0800, true); // UTF-8 names
        v.setUint16(p + 8, 0, true); // stored
        v.setUint16(p + 10, 0, true); // time
        v.setUint16(p + 12, DOS_DATE, true);
        v.setUint32(p + 14, e.crc, true);
        v.setUint32(p + 18, e.data.length, true);
        v.setUint32(p + 22, e.data.length, true);
        v.setUint16(p + 26, e.name.length, true);
        v.setUint16(p + 28, 0, true);
        out.set(e.name, p + 30);
        out.set(e.data, p + 30 + e.name.length);
        p += 30 + e.name.length + e.data.length;
    }
    const dir = p;
    entries.forEach((e, i) => {
        v.setUint32(p, 0x02014b50, true);
        v.setUint16(p + 4, 20, true); // made by
        v.setUint16(p + 6, 20, true); // needed
        v.setUint16(p + 8, 0x0800, true);
        v.setUint16(p + 10, 0, true);
        v.setUint16(p + 12, 0, true);
        v.setUint16(p + 14, DOS_DATE, true);
        v.setUint32(p + 16, e.crc, true);
        v.setUint32(p + 20, e.data.length, true);
        v.setUint32(p + 24, e.data.length, true);
        v.setUint16(p + 28, e.name.length, true);
        v.setUint32(p + 42, offsets[i], true);
        out.set(e.name, p + 46);
        p += 46 + e.name.length;
    });
    v.setUint32(p, 0x06054b50, true);
    v.setUint16(p + 8, entries.length, true);
    v.setUint16(p + 10, entries.length, true);
    v.setUint32(p + 12, p - dir, true);
    v.setUint32(p + 16, dir, true);
    return out;
}
