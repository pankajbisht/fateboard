declare global {
    // Temporary global RootState to satisfy slice type references.
    // For full typing, create a proper RootState type after refactoring store composition.
    type RootState = unknown;
}

export {};
