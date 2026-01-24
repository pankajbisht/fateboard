import IconButton from '@/components/atoms/IconButton';
import { useStore } from '@/store/index.ts';
import db from 'opendb-store';

function Card({ children }) {
    return <div className="rounded-2xl bg-white shadow-sm border border-gray-200">{children}</div>;
}

function CardContent({ children, className = '' }) {
    return <div className={`p-4 ${className}`}>{children}</div>;
}

function Switch({ checked, onCheckedChange }) {
    return (
        <button
            onClick={() => onCheckedChange(!checked)}
            className={`w-11 h-6 rounded-full relative transition ${
                checked ? 'bg-black' : 'bg-gray-300'
            }`}
        >
            <span
                className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    );
}

function SettingRow({ label, value, onChange, children }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium">{label}</span>

            <div className="flex items-center gap-2">
                {children ?? <Switch checked={Boolean(value)} onCheckedChange={onChange} />}
            </div>
        </div>
    );
}

export default function EditorSettingPage() {
    const settings = useStore((s) => s.settings);
    const toggleFreehand = useStore((s) => s.toggleFreehand);

    const updateSetting = useStore((s) => s.updateSetting);
    const setFormat = useStore((s) => s.setFormat);
    const setOrientation = useStore((s) => s.setOrientation);
    const setMode = useStore((s) => s.setMode);

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-3xl mx-auto space-y-6">
                <h1 className="text-2xl font-semibold">Settings</h1>

                {/* Profile */}
                {/*<Card>
          <CardContent className="space-y-4">
            <h2 className="text-lg font-medium">Profile</h2>
            <div className="space-y-2">
              <Label>Username</Label>
              {/*<Input
                value={settings.username}
                onChange={(e) => update("username", e.target.value)}
              />*/}
                {/*</div>
            <div className="space-y-2">
              <Label>Email</Label>
              {/*<Input
                type="email"
                value={settings.email}
                onChange={(e) => update("email", e.target.value)}
              />*/}
                {/*</div>
          </CardContent>
        // </Card>**/}

                {/* Preferences */}
                <Card>
                    <CardContent className="space-y-4">
                        <h2 className="text-lg font-medium">Preferences</h2>
                        <SettingRow label="Reset">
                            <IconButton
                                icon={<i className="fa-solid fa-trash-arrow-up"></i>}
                                onClick={() => {
                                    db.local.clear();
                                }}
                            />
                        </SettingRow>

                        {/*<SettingRow
                          label="Theme"
                          value={settings.mode}
                          options={[
                            { label: "Dark", value: "dark" },
                            { label: "Light", value: "light" },
                            { label: "System", value: "system" },
                          ]}
                          onChange={(v) => setMode(v)}
                        />*/}

                        {/*<SettingRow label="Theme">
                          <Select
                            value={settings.mode}
                            onChange={(v) => setMode(v)}
                            options={[
                              { label: "Dark", value: "dark" },
                              { label: "Light", value: "light" },
                              { label: "System", value: "system" },
                            ]}
                          />
                        </SettingRow>*/}

                        <SettingRow label="Page Size">
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: 'Dark', value: 'dark' },
                                    { label: 'Light', value: 'light' },
                                    { label: 'System', value: 'system' },
                                ].map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => {
                                            console.log(item);
                                            setMode(item.value);
                                        }}
                                        className={`px-3 py-1 rounded text-sm border transition
                                ${
                                    settings.mode === item.value
                                        ? 'bg-black text-white border-black'
                                        : 'bg-white border-gray-300 hover:bg-gray-100'
                                }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </SettingRow>
                        {/*)}*/}

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
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
