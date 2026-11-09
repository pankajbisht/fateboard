import { useStore } from '@store';
import type { Unit } from '@/lib/units';

/** Settings > Units (rulers and size fields, BUG-082). */
export const useUnit = (): Unit =>
    useStore((s) => (s as unknown as { settings?: { unit?: Unit } }).settings?.unit ?? 'px');
