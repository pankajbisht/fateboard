/** Google Analytics loads only with a real id (BUG-131: CI shipped the literal `%VITE_GA_ID%`). */
import { afterEach, describe, expect, it } from 'vitest';
import { initAnalytics } from '../analytics';

const gaScripts = () => document.head.querySelectorAll('script[src*="googletagmanager.com"]');

describe('initAnalytics', () => {
    afterEach(() => {
        gaScripts().forEach((s) => s.remove());
        delete (window as { dataLayer?: unknown[] }).dataLayer;
        delete (window as { gtag?: unknown }).gtag;
    });

    it.each([undefined, '', '   ', '%VITE_GA_ID%'])('does nothing for id %j', (id) => {
        expect(initAnalytics(id)).toBe(false);
        expect(gaScripts()).toHaveLength(0);
        expect((window as { dataLayer?: unknown[] }).dataLayer).toBeUndefined();
    });

    it('loads gtag once and queues js + config for a real id', () => {
        expect(initAnalytics('G-TEST123')).toBe(true);
        expect(initAnalytics('G-TEST123')).toBe(false); // second call is a no-op
        const scripts = gaScripts();
        expect(scripts).toHaveLength(1);
        expect(scripts[0].getAttribute('src')).toBe(
            'https://www.googletagmanager.com/gtag/js?id=G-TEST123',
        );
        expect((scripts[0] as HTMLScriptElement).async).toBe(true);
        const queue = (window as { dataLayer?: IArguments[] }).dataLayer ?? [];
        expect(queue.map((args) => Array.from(args))).toEqual([
            ['js', expect.any(Date)],
            ['config', 'G-TEST123'],
        ]);
    });
});
