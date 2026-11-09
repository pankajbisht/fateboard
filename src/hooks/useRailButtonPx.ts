import { useStore } from '@store';
import type { IconSize } from '@/store/slices/createSettingSlice';

/** Rail button size in px per icon size. Must match --ui-rail-btn in index.css (tested). */
export const RAIL_BUTTON_PX: Record<IconSize, number> = { sm: 32, md: 40, lg: 48 };

/** Rail button px for layout math (e.g. how many dock tabs fit before "More"). */
export function useRailButtonPx(): number {
    const size = useStore((s) => s.settings.iconSize);
    return RAIL_BUTTON_PX[size] ?? RAIL_BUTTON_PX.md;
}
