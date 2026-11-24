/**
 * Test helper: a small, independent GIF89a reader (no shared code with the encoder), so tests check the
 * real bytes: header, colour table, loop extension, frames, delays, disposal, transparency, LZW data.
 */
export interface DecodedFrame {
    x: number;
    y: number;
    w: number;
    h: number;
    /** centiseconds */
    delay: number;
    disposal: number;
    transparentIndex: number | null;
    indices: Uint8Array;
}

export interface DecodedGif {
    width: number;
    height: number;
    palette: Uint8Array;
    loop: boolean;
    frames: DecodedFrame[];
}

export function lzwDecode(data: Uint8Array, minCodeSize: number, count: number): Uint8Array {
    const out = new Uint8Array(count);
    let n = 0;
    const clear = 1 << minCodeSize;
    const eoi = clear + 1;
    let size = minCodeSize + 1;
    let next = eoi + 1;
    let table: number[][] = [];
    const reset = () => {
        table = [];
        for (let i = 0; i < clear; i++) table[i] = [i];
        size = minCodeSize + 1;
        next = eoi + 1;
    };
    reset();
    let pos = 0;
    const read = () => {
        let code = 0;
        for (let i = 0; i < size; i++) {
            const bit = (data[pos >> 3] >> (pos & 7)) & 1;
            code |= bit << i;
            pos++;
        }
        return code;
    };
    let prev: number[] | null = null;
    while (pos + size <= data.length * 8) {
        const code = read();
        if (code === clear) {
            reset();
            prev = null;
            continue;
        }
        if (code === eoi) break;
        let entry: number[];
        if (code < next && table[code]) entry = table[code];
        else if (code === next && prev) entry = [...prev, prev[0]];
        else throw new Error(`bad LZW code ${code} (next ${next})`);
        for (const v of entry) if (n < count) out[n++] = v;
        if (prev && next < 4096) {
            table[next++] = [...prev, entry[0]];
            if (next >= 1 << size && size < 12) size++;
        }
        prev = entry;
    }
    if (n !== count) throw new Error(`LZW gave ${n} pixels, expected ${count}`);
    return out;
}

export function decodeGif(bytes: Uint8Array): DecodedGif {
    let p = 0;
    const u8 = () => bytes[p++];
    const u16 = () => {
        const v = bytes[p] | (bytes[p + 1] << 8);
        p += 2;
        return v;
    };
    const text = (n: number) => String.fromCharCode(...bytes.subarray(p, (p += n)));
    const subBlocks = () => {
        const parts: number[] = [];
        for (let len = u8(); len; len = u8()) for (let i = 0; i < len; i++) parts.push(u8());
        return new Uint8Array(parts);
    };

    if (text(6) !== 'GIF89a') throw new Error('not a GIF89a');
    const width = u16();
    const height = u16();
    const packed = u8();
    u8(); // background index
    u8(); // aspect
    const tableSize = packed & 0x80 ? 3 * (1 << ((packed & 7) + 1)) : 0;
    const palette = bytes.slice(p, p + tableSize);
    p += tableSize;

    let loop = false;
    const frames: DecodedFrame[] = [];
    let gce = { delay: 0, disposal: 0, transparentIndex: null as number | null };
    for (;;) {
        const tag = u8();
        if (tag === 0x3b) break;
        if (tag === 0x21) {
            const label = u8();
            if (label === 0xf9) {
                u8(); // block size 4
                const f = u8();
                const delay = u16();
                const ti = u8();
                u8(); // terminator
                gce = { delay, disposal: (f >> 2) & 7, transparentIndex: f & 1 ? ti : null };
            } else if (label === 0xff) {
                const app = text(u8());
                const data = subBlocks();
                if (app === 'NETSCAPE2.0' && data[0] === 1) loop = true;
            } else subBlocks();
            continue;
        }
        if (tag !== 0x2c) throw new Error(`unexpected block 0x${tag.toString(16)} at ${p - 1}`);
        const x = u16();
        const y = u16();
        const w = u16();
        const h = u16();
        if (u8() & 0x80) throw new Error('local colour tables are not expected');
        const min = u8();
        frames.push({ x, y, w, h, ...gce, indices: lzwDecode(subBlocks(), min, w * h) });
        gce = { delay: 0, disposal: 0, transparentIndex: null };
    }
    return { width, height, palette, loop, frames };
}

/** What a viewer shows after each frame (palette indices; -1 = nothing / transparent). */
export function compose(gif: DecodedGif): Int16Array[] {
    const screen = new Int16Array(gif.width * gif.height).fill(-1);
    const shown: Int16Array[] = [];
    for (const f of gif.frames) {
        for (let y = 0; y < f.h; y++)
            for (let x = 0; x < f.w; x++) {
                const v = f.indices[y * f.w + x];
                if (v === f.transparentIndex) continue;
                screen[(f.y + y) * gif.width + f.x + x] = v;
            }
        shown.push(screen.slice());
        if (f.disposal === 2)
            for (let y = 0; y < f.h; y++)
                screen.fill(-1, (f.y + y) * gif.width + f.x, (f.y + y) * gif.width + f.x + f.w);
    }
    return shown;
}
