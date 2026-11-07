/**
 * Keeps the document head in step with the route on client-side navigation (the static `<route>.html` from the
 * build covers the first load). The only writer of `document.title` (replaces the old per-page `usePageTitle`).
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalUrl, seoForPath, type SeoRoute } from './routes';

function setMeta(doc: Document, attr: 'name' | 'property', key: string, value: string) {
    let el = doc.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
    if (!el) {
        el = doc.createElement('meta');
        el.setAttribute(attr, key);
        doc.head.appendChild(el);
    }
    el.setAttribute('content', value);
}

export function applySeo(doc: Document, route: SeoRoute) {
    doc.title = route.title;
    setMeta(doc, 'name', 'description', route.description);
    setMeta(
        doc,
        'name',
        'robots',
        route.index ? 'index, follow, max-image-preview:large' : 'noindex',
    );
    setMeta(doc, 'property', 'og:title', route.title);
    setMeta(doc, 'property', 'og:description', route.description);
    setMeta(doc, 'name', 'twitter:title', route.title);
    setMeta(doc, 'name', 'twitter:description', route.description);

    let canonical = doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (route.index) {
        if (!canonical) {
            canonical = doc.createElement('link');
            canonical.rel = 'canonical';
            doc.head.appendChild(canonical);
        }
        canonical.href = canonicalUrl(route);
        setMeta(doc, 'property', 'og:url', canonicalUrl(route));
    } else {
        canonical?.remove(); // a noindex page is not a copy of another URL
    }
}

export function RouteSeo() {
    const { pathname } = useLocation();
    useEffect(() => {
        applySeo(document, seoForPath(pathname));
    }, [pathname]);
    return null;
}
