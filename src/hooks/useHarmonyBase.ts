import { useState } from 'react';

/**
 * The base color harmonies are built from. It follows `color`, except for the echo of a pick made
 * from the harmonies themselves (call `markPicked` first): then the rows stay put, so the rest of
 * the scheme and the base stay one click away. One-shot: any other change of `color` re-bases.
 */
export function useHarmonyBase(color: string | null) {
    const [base, setBase] = useState(color);
    const [seen, setSeen] = useState(color);
    const [picked, setPicked] = useState<string | null>(null);
    if (color !== seen) {
        setSeen(color);
        if (picked === null || color !== picked) setBase(color);
        setPicked(null);
    }
    return [base, setPicked] as const;
}
