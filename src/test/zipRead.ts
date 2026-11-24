import { crc32 } from '@/lib/zip';

/** An independent reader: walks the central directory, checks every CRC and size, returns name → bytes. */
export function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let end = bytes.length - 22;
    while (end >= 0 && v.getUint32(end, true) !== 0x06054b50) end--;
    if (end < 0) throw new Error('no end of central directory');
    const count = v.getUint16(end + 10, true);
    let p = v.getUint32(end + 16, true);
    const out = new Map<string, Uint8Array>();
    for (let i = 0; i < count; i++) {
        if (v.getUint32(p, true) !== 0x02014b50) throw new Error('bad central header');
        const crc = v.getUint32(p + 16, true);
        const size = v.getUint32(p + 24, true);
        const nameLen = v.getUint16(p + 28, true);
        const local = v.getUint32(p + 42, true);
        const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
        if (v.getUint32(local, true) !== 0x04034b50) throw new Error('bad local header');
        const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
        const data = bytes.slice(start, start + size);
        if (crc32(data) !== crc) throw new Error(`crc mismatch: ${name}`);
        out.set(name, data);
        p += 46 + nameLen + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    }
    return out;
}
