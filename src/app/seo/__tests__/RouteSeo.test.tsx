/** Head follows client-side navigation; old hash URLs are rewritten before the router mounts. */
import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { RouteSeo } from '../RouteSeo';
import { redirectLegacyHashUrl } from '../legacyHashUrl';
const SITE_URL = 'https://fateboard.test'; // vitest.config.ts env

const head = () => ({
    title: document.title,
    description: document.head.querySelector('meta[name="description"]')?.getAttribute('content'),
    robots: document.head.querySelector('meta[name="robots"]')?.getAttribute('content'),
    canonical: document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
});

describe('RouteSeo', () => {
    it('sets title, description, robots and canonical per route', () => {
        let go: (to: string) => void = () => {};
        function Nav() {
            go = useNavigate();
            return null;
        }
        render(
            <MemoryRouter initialEntries={['/help']}>
                <RouteSeo />
                <Nav />
            </MemoryRouter>,
        );
        expect(head()).toMatchObject({
            title: expect.stringMatching(/help/i),
            robots: expect.stringMatching(/^index/),
            canonical: `${SITE_URL}/help`,
        });

        act(() => go('/setting'));
        expect(head()).toMatchObject({
            title: expect.stringMatching(/settings/i),
            robots: 'noindex',
            canonical: undefined,
        });

        act(() => go('/'));
        expect(head()).toMatchObject({
            title: expect.stringMatching(/whiteboard/i),
            canonical: `${SITE_URL}/`,
        });
        expect(head().description).toMatch(/whiteboard/i);
    });
});

describe('redirectLegacyHashUrl', () => {
    const fake = (hash: string) => {
        const calls: string[] = [];
        return {
            calls,
            win: {
                location: { hash } as Location,
                history: {
                    state: null,
                    replaceState: (_s: unknown, _t: string, url?: string | URL | null) =>
                        calls.push(String(url)),
                } as unknown as History,
            },
        };
    };

    it('rewrites /#/path?query to /path?query', () => {
        const { win, calls } = fake('#/share/abc?mode=view');
        expect(redirectLegacyHashUrl(win)).toBe(true);
        expect(calls).toEqual(['/share/abc?mode=view']);
    });

    it('rewrites /#/ to /', () => {
        const { win, calls } = fake('#/');
        redirectLegacyHashUrl(win);
        expect(calls).toEqual(['/']);
    });

    it.each(['', '#features', '#'])('leaves %j alone', (hash) => {
        const { win, calls } = fake(hash);
        expect(redirectLegacyHashUrl(win)).toBe(false);
        expect(calls).toEqual([]);
    });
});
