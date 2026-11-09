/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Google Analytics measurement id (e.g. `G-XXXX`); unset = no analytics. */
    readonly VITE_GA_ID?: string;
    /** Public site origin, e.g. `https://www.example.com` (canonical, Open Graph, sitemap). Required for builds. */
    readonly VITE_SITE_URL?: string;
}
