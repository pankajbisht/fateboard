// Lightweight Fabric shims to reduce TypeScript noise during incremental migration.
// This file intentionally keeps types permissive; we'll tighten these later.

declare global {
    interface Window {
        fabric: unknown;
    }
}

declare const fabric: unknown;

export {};
