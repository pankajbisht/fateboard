// Override/loosen Fabric module types during incremental migration.
// This file forces imports from 'fabric' to be treated as `any`.

declare module 'fabric' {
    const fabric: unknown;
    export = fabric;
}

declare module 'fabric/index' {
    const fabric: unknown;
    export = fabric;
}

export {};
