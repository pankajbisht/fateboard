// import { useState, useEffect } from 'react';

// export function Switch({ checked, onCheckedChange }) {
//     return (
//         <button
//             type="button"
//             role="switch"
//             aria-checked={checked}
//             onClick={() => onCheckedChange(!checked)}
//             className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
//                 checked ? 'bg-blue-600' : 'bg-gray-300'
//             }`}
//         >
//             <span
//                 className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
//                     checked ? 'translate-x-6' : 'translate-x-1'
//                 }`}
//             />
//         </button>
//     );
// }

// export default function EditorSettingPage() {
//     const [darkMode, setDarkMode] = useState(false);

//     useEffect(() => {
//         if (darkMode) {
//             document.documentElement.classList.add('dark'); // ✅ add .dark to <html>
//         } else {
//             document.documentElement.classList.remove('dark');
//         }
//     }, [darkMode]);

//     return (
//         <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 transition-colors">
//             <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
//                 ⚙️ Settings
//             </h1>

//             <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
//                 <div className="rounded-2xl shadow p-4 bg-white dark:bg-gray-800 transition-colors">
//                     <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
//                         Appearance
//                     </h2>
//                     <div className="flex items-center justify-between mt-3">
//                         <span className="text-gray-700 dark:text-gray-300">Dark Mode</span>
//                         <Switch checked={darkMode} onCheckedChange={setDarkMode} />
//                     </div>
//                 </div>
//             </div>
//         </div>
//     );
// }

import { useState } from 'react';
import { useStore } from '@/store/index.ts';

/* =====================
   BASIC UI COMPONENTS
   ===================== */

function Card({ children }) {
    return <div className="rounded-2xl bg-white shadow-sm border border-gray-200">{children}</div>;
}

function CardContent({ children, className = '' }) {
    return <div className={`p-4 ${className}`}>{children}</div>;
}

function Button({ children, variant = 'primary', onClick }) {
    const base = 'px-4 py-2 rounded-lg text-sm font-medium transition';
    const styles = {
        primary: 'bg-black text-white hover:bg-gray-800',
        secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    };

    return (
        <button onClick={onClick} className={`${base} ${styles[variant]}`}>
            {children}
        </button>
    );
}

function Input({ value, onChange, type = 'text' }) {
    return (
        <input
            type={type}
            value={value}
            onChange={onChange}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
    );
}

function Label({ children }) {
    return <label className="text-sm font-medium">{children}</label>;
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

function Select({ value, onChange, options = [], disabled = false }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black transition
        ${
            disabled
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white text-black border-gray-300 hover:border-gray-400'
        }`}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
}

/* =====================
   SETTINGS PAGE
   ===================== */

export default function EditorSettingPage() {
    // const [settings, setSettings] = useState({
    //   username: "pankaj",
    //   email: "pankaj@example.com",
    //   darkMode: true,
    //   notifications: true,
    //   autoSave: false,
    // });

    // const update = (key, value) =>
    //   setSettings((s) => ({ ...s, [key]: value }));

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

// function SettingRow({ label, value, onChange }) {
//   return (
//     <div className="flex items-center justify-between">
//       <span className="text-sm">{label}</span>
//       <Switch checked={value} onCheckedChange={onChange} />
//     </div>
//   );
// }

// function SettingRow({ label, value, onChange, children }) {
//     return (
//         <div className="flex items-center justify-between gap-4">
//             <span className="text-sm font-medium">{label}</span>

//             {children ? children : <Switch checked={value} onCheckedChange={onChange} />}
//         </div>
//     );
// }

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
