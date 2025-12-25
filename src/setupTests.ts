import '@testing-library/jest-dom';

// Minimal window mocks useful for many components
if (typeof window !== 'undefined') {
    // matchMedia polyfill
    if (!window.matchMedia) {
        // adding minimal matchMedia shim for tests
        window.matchMedia = (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        });
    }
}
