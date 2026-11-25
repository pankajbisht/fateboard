import { GifEncoder, type GifInit } from './gifEncoder';

/**
 * The GIF encoder off the main thread: colour mapping, frame differences and LZW for each frame while the
 * page renders the next one. Started by `renderGif` (`new Worker(new URL(...))`); one worker per export.
 */
export type GifWorkerRequest =
    | { type: 'init'; init: GifInit }
    | { type: 'frame'; rgba: Uint8ClampedArray; delay: number }
    | { type: 'finish' };

export type GifWorkerReply =
    | { type: 'ready' }
    | { type: 'ack' }
    | { type: 'done'; bytes: Uint8Array }
    | { type: 'error'; message: string };

const scope = self as unknown as {
    onmessage: ((e: MessageEvent<GifWorkerRequest>) => void) | null;
    postMessage: (m: GifWorkerReply, transfer?: Transferable[]) => void;
};

let encoder: GifEncoder | null = null;

scope.onmessage = (e) => {
    const m = e.data;
    try {
        if (m.type === 'init') {
            encoder = new GifEncoder(m.init);
            scope.postMessage({ type: 'ready' }); // the script loaded and the encoder started
        } else if (!encoder) throw new Error('The GIF encoder was not started.');
        else if (m.type === 'frame') {
            encoder.addFrame(m.rgba, m.delay);
            scope.postMessage({ type: 'ack' });
        } else {
            const bytes = encoder.finish();
            encoder = null;
            scope.postMessage({ type: 'done', bytes }, [bytes.buffer]);
        }
    } catch (err) {
        scope.postMessage({
            type: 'error',
            message: err instanceof Error ? err.message : String(err),
        });
    }
};
