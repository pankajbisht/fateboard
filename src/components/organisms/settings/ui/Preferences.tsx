import SettingRow from '@/components/molecules/SettingRow';
import { useStore } from '@/store';
import Card from '../../Card';
import Dropdown from '@/components/atoms/Dropdown';

function Preferences() {
    const settings = useStore((s) => s.settings);
    const toggleFreehand = useStore((s) => s.toggleFreehand);

    const updateSetting = useStore((s) => s.updateSetting);
    const setFormat = useStore((s) => s.setFormat);
    const setOrientation = useStore((s) => s.setOrientation);
    const setMode = useStore((s) => s.setMode);

    return (
        <div className="min-h-screen">
            {/*<h1 className="text-xl">Settings</h1>*/}

            <Card title="Settings">
                <SettingRow
                    label="Freehand"
                    value={settings.freehand}
                    onChange={() => toggleFreehand()} // just call toggleFreehand
                />

                {!settings.freehand && (
                    <SettingRow label="Page Size">
                        <div className="flex flex-wrap gap-2">
                            {[
                                { label: 'A4', value: 'A4' },
                                { label: 'A3', value: 'A3' },
                                { label: 'A5', value: 'A5' },
                                { label: 'Letter', value: 'LETTER' },
                                { label: 'Custom', value: 'CUSTOM' },
                            ].map((item) => (
                                <button
                                    key={item.value}
                                    onClick={() => setFormat(item.value)}
                                    className={`px-3 py-1 rounded text-sm border transition
                                ${
                                    settings.format === item.value
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white border-gray-300 hover:bg-gray-100'
                                }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </SettingRow>
                )}

                {!settings.freehand && (
                    <SettingRow label="Orientation">
                        <div className="flex gap-2">
                            {[
                                { label: 'Landscape', value: 'LANDSCAPE' },
                                { label: 'Portrait', value: 'PORTRAIT' },
                            ].map((o) => (
                                <button
                                    key={o.value}
                                    onClick={() => setOrientation(o.value)}
                                    className={`px-3 py-1 rounded text-sm border transition
                                ${
                                    settings.orientation === o.value
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white border-gray-300 hover:bg-gray-100'
                                }`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </SettingRow>
                )}

                <SettingRow label="Icon Size">
                    <div className="flex gap-2">
                        {['sm', 'md', 'lg'].map((size) => (
                            <button
                                key={size}
                                onClick={() => updateSetting('iconSize', size)}
                                className={`px-3 py-1 rounded text-sm border transition
                    ${
                        settings.iconSize === size
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                            >
                                {size === 'sm' && 'Small'}
                                {size === 'md' && 'Medium'}
                                {size === 'lg' && 'Large'}
                            </button>
                        ))}
                    </div>
                </SettingRow>

                <SettingRow label="Theme">
                    <Dropdown
                        value={settings.mode}
                        onChange={(v) => setMode(v)}
                        options={[
                            { label: 'Dark', value: 'dark' },
                            { label: 'Light', value: 'light' },
                            { label: 'System', value: 'system' },
                        ]}
                    />
                </SettingRow>
            </Card>
        </div>
    );
}

export default Preferences;
