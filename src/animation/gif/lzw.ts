/**
 * GIF building blocks: a growable byte buffer and the GIF flavour of LZW (variable code size up to 12 bits,
 * a clear code when the table is full, data in sub-blocks of at most 255 bytes). Pure, no DOM: it also runs
 * in the encoder worker.
 */

export class ByteWriter {
    private buf = new Uint8Array(1 << 16);
    length = 0;

    private room(n: number) {
        if (this.length + n <= this.buf.length) return;
        let size = this.buf.length * 2;
        while (size < this.length + n) size *= 2;
        const next = new Uint8Array(size);
        next.set(this.buf.subarray(0, this.length));
        this.buf = next;
    }

    byte(b: number) {
        this.room(1);
        this.buf[this.length++] = b & 0xff;
    }

    /** 16-bit little endian (GIF numbers). */
    u16(n: number) {
        this.byte(n);
        this.byte(n >> 8);
    }

    bytes(data: ArrayLike<number>) {
        this.room(data.length);
        this.buf.set(data, this.length);
        this.length += data.length;
    }

    text(s: string) {
        for (let i = 0; i < s.length; i++) this.byte(s.charCodeAt(i));
    }

    /** A copy of what was written. */
    result(): Uint8Array {
        return this.buf.slice(0, this.length);
    }
}

const MAX_CODE = 4096;

/**
 * Writes `indices` as GIF image data: the minimum code size byte, the LZW codes packed LSB-first into
 * sub-blocks, and the block terminator. `minCodeSize` is 8 for a 256-entry colour table.
 */
export function writeLzw(out: ByteWriter, indices: Uint8Array, minCodeSize = 8) {
    out.byte(minCodeSize);
    const clear = 1 << minCodeSize;
    const eoi = clear + 1;
    const mask = clear - 1;
    let next = eoi + 1;
    let size = minCodeSize + 1;
    let table = new Map<number, number>();

    const block = new Uint8Array(255);
    let blockLen = 0;
    let cur = 0;
    let bits = 0;
    const pushByte = (b: number) => {
        block[blockLen++] = b;
        if (blockLen === 255) {
            out.byte(255);
            out.bytes(block);
            blockLen = 0;
        }
    };
    const emit = (code: number) => {
        cur |= code << bits;
        bits += size;
        while (bits >= 8) {
            pushByte(cur & 0xff);
            cur >>>= 8;
            bits -= 8;
        }
    };

    emit(clear);
    if (indices.length) {
        let prefix = indices[0] & mask;
        for (let i = 1; i < indices.length; i++) {
            const k = indices[i] & mask;
            const key = (prefix << 8) | k;
            const code = table.get(key);
            if (code !== undefined) {
                prefix = code;
                continue;
            }
            emit(prefix);
            if (next === MAX_CODE) {
                emit(clear);
                table = new Map();
                next = eoi + 1;
                size = minCodeSize + 1;
            } else {
                if (next >= 1 << size) size++;
                table.set(key, next++);
            }
            prefix = k;
        }
        emit(prefix);
    }
    emit(eoi);
    if (bits > 0) pushByte(cur & 0xff);
    if (blockLen) {
        out.byte(blockLen);
        out.bytes(block.subarray(0, blockLen));
    }
    out.byte(0); // block terminator
}
