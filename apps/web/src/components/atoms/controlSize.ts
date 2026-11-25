import { createContext, useContext } from 'react';
import type { ControlSize } from './control.styles';

/**
 * Default size for every control below a provider. `PanelLayout` provides "sm", so all inputs,
 * selects, segmented controls and buttons in a panel share one compact height (h-7) without
 * passing `size` at each call site. Outside panels (dialogs, settings) the default is "md" (h-8).
 */
export const ControlSizeContext = createContext<ControlSize | undefined>(undefined);

/** The explicit `size` prop wins, then the surrounding provider, then "md". */
export function useControlSize<S extends string = ControlSize>(size?: S): S | ControlSize {
    const ctx = useContext(ControlSizeContext);
    return size ?? ctx ?? 'md';
}
