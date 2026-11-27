import { useStore } from '@store';
import { SPRAY_MODES, type SprayMode } from '@/store/sprayStyle';
import { BarSelect } from './drawToolParts';

/** The Spray tool's mode (Paint, Mist, Splatter, Copy): first control of both Spray bars. */
export function SprayModeSelect() {
    const mode = useStore((s) => s.sprayStyle.mode);
    const setSprayStyle = useStore((s) => s.setSprayStyle);
    return (
        <BarSelect<SprayMode>
            label="Spray mode"
            value={mode}
            options={SPRAY_MODES}
            onChange={(next) => setSprayStyle({ mode: next })}
        />
    );
}
