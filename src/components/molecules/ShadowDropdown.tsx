import { useStore } from '@/store';
import Dropdown from '../atoms/Dropdown';

const SHADOW_PRESETS = {
    soft: { blur: 12, offsetX: 0, offsetY: 6, color: 'rgba(0,0,0,0.2)' },
    medium: { blur: 20, offsetX: 0, offsetY: 10, color: 'rgba(0,0,0,0.25)' },
    strong: { blur: 40, offsetX: 0, offsetY: 20, color: 'rgba(0,0,0,0.3)' },
};

const ShadowDropdown = ({ disabled }) => {
    const activeShadow = useStore((s) => s.activeObjectShadow);
    const applyShadowPreset = useStore((s) => s.applyShadowPreset);
    const removeShadow = useStore((s) => s.removeShadow);

    const value = activeShadow
        ? (Object.entries(SHADOW_PRESETS).find(
              ([, preset]) =>
                  preset.blur === activeShadow.blur &&
                  preset.offsetX === activeShadow.offsetX &&
                  preset.offsetY === activeShadow.offsetY &&
                  preset.color === activeShadow.color,
          )?.[0] ?? 'custom')
        : 'none';

    return (
        <Dropdown
            value={value}
            disabled={disabled}
            options={[
                { label: 'None', value: 'none' },
                ...Object.keys(SHADOW_PRESETS).map((key) => ({
                    label: key.charAt(0).toUpperCase() + key.slice(1),
                    value: key,
                })),
            ]}
            onChange={(val) => {
                if (val === 'none') return removeShadow();
                applyShadowPreset(val);
            }}
        />
    );
};

export default ShadowDropdown;
