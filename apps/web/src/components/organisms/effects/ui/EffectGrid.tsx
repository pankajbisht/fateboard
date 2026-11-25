import type { ReactNode } from 'react';

/** Two-column grid for small numeric inputs inside an effect section. */
export const EffectGrid = ({ children }: { children: ReactNode }) => (
    <div className="grid grid-cols-2 gap-x-5 gap-y-3">{children}</div>
);
