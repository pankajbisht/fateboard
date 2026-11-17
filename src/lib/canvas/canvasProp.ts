/**
 * A saved canvas-level prop (listed in `CUSTOM_PROPS`, like `docLayers`, `pageSetup`): Fabric's canvas
 * `toObject(props)` writes it and `loadFromJSON` sets it back, so it travels with undo, pages and autosave.
 * This accessor normalizes every write and reports it (the store mirror). `release` leaves a plain value.
 */
export interface CanvasProp<T> {
    get: () => T;
    /** Back to the default (on `canvas:cleared`: a load then sets the saved value). */
    reset: () => void;
    release: () => void;
}

export function defineCanvasProp<T>(
    canvas: object,
    key: string,
    normalize: (v: unknown) => T,
    onChange: (v: T) => void,
): CanvasProp<T> {
    let value = normalize((canvas as Record<string, unknown>)[key]);
    Object.defineProperty(canvas, key, {
        configurable: true,
        get: () => value,
        set: (v: unknown) => {
            value = normalize(v);
            onChange(value);
        },
    });
    onChange(value);
    return {
        get: () => value,
        reset: () => {
            value = normalize(undefined);
            onChange(value);
        },
        release: () =>
            Object.defineProperty(canvas, key, {
                configurable: true,
                writable: true,
                enumerable: true,
                value,
            }),
    };
}
