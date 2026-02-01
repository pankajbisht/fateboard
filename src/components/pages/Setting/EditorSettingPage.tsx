import { MBrandLogo } from '@/components/molecules/BrandLogo';
import Preferences from '@/components/organisms/settings/ui/Preferences';
import { useState } from 'react';

const tools = [{ id: 'preferences', label: 'Preferences', component: Preferences }];

export default function EditorSettingPage() {
    const [activeTool, setActiveTool] = useState(tools[0].id);
    const [expandedSections, setExpandedSections] = useState<string[]>([]);
    const ActiveComponent = tools.find((tool) => tool.id === activeTool)?.component;

    const toggleSection = (sectionId: string) => {
        setExpandedSections((prev) =>
            prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
        );
    };

    return (
        <div className="flex h-full bg-gray-50 text-gray-800">
            {/* Sidebar */}
            <aside className="w-72 p-6 bg-white flex flex-col">
                <h3 className="flex gap-x-2 text-xl font-semibold mb-6 text-gray-900">
                    <MBrandLogo />
                    Settings
                </h3>
                <input
                    type="text"
                    placeholder="Search topics..."
                    className="mb-4 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    onChange={(e) => {
                        const query = e.target.value.toLowerCase();
                        const firstMatch = tools.find((tool) =>
                            tool.label.toLowerCase().includes(query),
                        );
                        if (firstMatch) setActiveTool(firstMatch.id);
                    }}
                />
                <ul className="space-y-2 flex-1 overflow-y-auto">
                    {tools.map((tool) => (
                        <li key={tool.id}>
                            <button
                                className={`w-full text-left px-4 py-2 rounded-lg transition-colors duration-200 hover:bg-blue-100 hover:text-blue-900 ${
                                    tool.id === activeTool
                                        ? 'bg-blue-200 text-blue-900 font-semibold shadow-inner'
                                        : 'text-gray-700'
                                }`}
                                onClick={() => setActiveTool(tool.id)}
                            >
                                {tool.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <div className="rounded-2xl p-6 transition-all duration-300">
                    {ActiveComponent ? (
                        <ActiveComponent
                            toggleSection={toggleSection}
                            expandedSections={expandedSections}
                        />
                    ) : (
                        <p className="text-gray-500">Select a topic from the left.</p>
                    )}
                </div>
            </main>
        </div>
    );
}

// import Dropdown from '@/components/atoms/Dropdown';
// import IconButton from '@/components/atoms/IconButton';
// import Select from '@/components/atoms/Select';
// import SettingRow from '@/components/molecules/SettingRow';
// import Card from '@/components/organisms/Card';
// import { useStore } from '@/store/index.ts';
// import db from 'opendb-store';

// export default function EditorSettingPage() {
//     const settings = useStore((s) => s.settings);
//     const toggleFreehand = useStore((s) => s.toggleFreehand);

//     const updateSetting = useStore((s) => s.updateSetting);
//     const setFormat = useStore((s) => s.setFormat);
//     const setOrientation = useStore((s) => s.setOrientation);
//     const setMode = useStore((s) => s.setMode);

//     return (
//         <div className="min-h-screen bg-gray-100 p-8">
//             <div className="max-w-3xl mx-auto space-y-6">
//                 <h1 className="text-2xl font-semibold">Settings</h1>

//                 <Card title='Settings'>
//                     <SettingRow
//                         label="Freehand"
//                         value={settings.freehand}
//                         onChange={() => toggleFreehand()} // just call toggleFreehand
//                     />

//                     {!settings.freehand && (
//                         <SettingRow label="Page Size">
//                             <div className="flex flex-wrap gap-2">
//                                 {[
//                                     { label: 'A4', value: 'A4' },
//                                     { label: 'A3', value: 'A3' },
//                                     { label: 'A5', value: 'A5' },
//                                     { label: 'Letter', value: 'LETTER' },
//                                     { label: 'Custom', value: 'CUSTOM' },
//                                 ].map((item) => (
//                                     <button
//                                         key={item.value}
//                                         onClick={() => setFormat(item.value)}
//                                         className={`px-3 py-1 rounded text-sm border transition
//                                 ${
//                                     settings.format === item.value
//                                         ? 'bg-black text-white border-black'
//                                         : 'bg-white border-gray-300 hover:bg-gray-100'
//                                 }`}
//                                     >
//                                         {item.label}
//                                     </button>
//                                 ))}
//                             </div>
//                         </SettingRow>
//                     )}

//                     {!settings.freehand && (
//                         <SettingRow label="Orientation">
//                             <div className="flex gap-2">
//                                 {[
//                                     { label: 'Landscape', value: 'LANDSCAPE' },
//                                     { label: 'Portrait', value: 'PORTRAIT' },
//                                 ].map((o) => (
//                                     <button
//                                         key={o.value}
//                                         onClick={() => setOrientation(o.value)}
//                                         className={`px-3 py-1 rounded text-sm border transition
//                                 ${
//                                     settings.orientation === o.value
//                                         ? 'bg-black text-white border-black'
//                                         : 'bg-white border-gray-300 hover:bg-gray-100'
//                                 }`}
//                                     >
//                                         {o.label}
//                                     </button>
//                                 ))}
//                             </div>
//                         </SettingRow>
//                     )}

//                     <SettingRow label="Icon Size">
//                         <div className="flex gap-2">
//                             {['sm', 'md', 'lg'].map((size) => (
//                                 <button
//                                     key={size}
//                                     onClick={() => updateSetting('iconSize', size)}
//                                     className={`px-3 py-1 rounded text-sm border transition
//                     ${
//                         settings.iconSize === size
//                             ? 'bg-black text-white border-black'
//                             : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
//                     }`}
//                                 >
//                                     {size === 'sm' && 'Small'}
//                                     {size === 'md' && 'Medium'}
//                                     {size === 'lg' && 'Large'}
//                                 </button>
//                             ))}
//                         </div>
//                     </SettingRow>

//                     <SettingRow label="Theme">
//                         <Dropdown
//                             value={settings.mode}
//                             onChange={(v) => setMode(v)}
//                             options={[
//                                 { label: "Dark", value: "dark" },
//                                 { label: "Light", value: "light" },
//                                 { label: "System", value: "system" },
//                             ]}
//                         />
//                     </SettingRow>
//                 </Card>
//             </div>
//         </div>
//     );
// }

{
    /* Profile */
}
{
    /*<Card>
<CardContent className="space-y-4">
<h2 className="text-lg font-medium">Profile</h2>
<div className="space-y-2">
<Label>Username</Label>
{/*<Input
value={settings.username}
onChange={(e) => update("username", e.target.value)}
/>*/
}
{
    /*</div>
<div className="space-y-2">
<Label>Email</Label>
{/*<Input
type="email"
value={settings.email}
onChange={(e) => update("email", e.target.value)}
/>*/
}
{
    /*</div>
</CardContent>
// </Card>**/
}

{
    /* Preferences */
}

// <Card>
//     <CardContent className="space-y-4">
//         <h2 className="text-lg font-medium">Preferences</h2>
//         <SettingRow label="Reset">
//             <IconButton
//                 icon={<i className="fa-solid fa-trash-arrow-up"></i>}
//                 onClick={() => {
//                     db.local.clear();
//                 }}
//             />
//         </SettingRow>

//         {/*<SettingRow
//           label="Theme"
//           value={settings.mode}
//           options={[
//             { label: "Dark", value: "dark" },
//             { label: "Light", value: "light" },
//             { label: "System", value: "system" },
//           ]}
//           onChange={(v) => setMode(v)}
//         />*/}

//         {/*<SettingRow label="Theme">
//           <Select
//             value={settings.mode}
//             onChange={(v) => setMode(v)}
//             options={[
//               { label: "Dark", value: "dark" },
//               { label: "Light", value: "light" },
//               { label: "System", value: "system" },
//             ]}
//           />
//         </SettingRow>*/}

//         <SettingRow label="Page Size">
//             <div className="flex flex-wrap gap-2">
//                 {[
//                     { label: 'Dark', value: 'dark' },
//                     { label: 'Light', value: 'light' },
//                     { label: 'System', value: 'system' },
//                 ].map((item) => (
//                     <button
//                         key={item.value}
//                         onClick={() => {
//                             console.log(item);
//                             setMode(item.value);
//                         }}
//                         className={`px-3 py-1 rounded text-sm border transition
//                 ${
//                     settings.mode === item.value
//                         ? 'bg-black text-white border-black'
//                         : 'bg-white border-gray-300 hover:bg-gray-100'
//                 }`}
//                     >
//                         {item.label}
//                     </button>
//                 ))}
//             </div>
//         </SettingRow>
//         {/*)}*/}

//         <SettingRow
//             label="Freehand"
//             value={settings.freehand}
//             onChange={() => toggleFreehand()} // just call toggleFreehand
//         />

//         {!settings.freehand && (
//             <SettingRow label="Page Size">
//                 <div className="flex flex-wrap gap-2">
//                     {[
//                         { label: 'A4', value: 'A4' },
//                         { label: 'A3', value: 'A3' },
//                         { label: 'A5', value: 'A5' },
//                         { label: 'Letter', value: 'LETTER' },
//                         { label: 'Custom', value: 'CUSTOM' },
//                     ].map((item) => (
//                         <button
//                             key={item.value}
//                             onClick={() => setFormat(item.value)}
//                             className={`px-3 py-1 rounded text-sm border transition
//                     ${
//                         settings.format === item.value
//                             ? 'bg-black text-white border-black'
//                             : 'bg-white border-gray-300 hover:bg-gray-100'
//                     }`}
//                         >
//                             {item.label}
//                         </button>
//                     ))}
//                 </div>
//             </SettingRow>
//         )}

//         {!settings.freehand && (
//             <SettingRow label="Orientation">
//                 <div className="flex gap-2">
//                     {[
//                         { label: 'Landscape', value: 'LANDSCAPE' },
//                         { label: 'Portrait', value: 'PORTRAIT' },
//                     ].map((o) => (
//                         <button
//                             key={o.value}
//                             onClick={() => setOrientation(o.value)}
//                             className={`px-3 py-1 rounded text-sm border transition
//                     ${
//                         settings.orientation === o.value
//                             ? 'bg-black text-white border-black'
//                             : 'bg-white border-gray-300 hover:bg-gray-100'
//                     }`}
//                         >
//                             {o.label}
//                         </button>
//                     ))}
//                 </div>
//             </SettingRow>
//         )}

//         <SettingRow label="Icon Size">
//             <div className="flex gap-2">
//                 {['sm', 'md', 'lg'].map((size) => (
//                     <button
//                         key={size}
//                         onClick={() => updateSetting('iconSize', size)}
//                         className={`px-3 py-1 rounded text-sm border transition
//         ${
//             settings.iconSize === size
//                 ? 'bg-black text-white border-black'
//                 : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
//         }`}
//                     >
//                         {size === 'sm' && 'Small'}
//                         {size === 'md' && 'Medium'}
//                         {size === 'lg' && 'Large'}
//                     </button>
//                 ))}
//             </div>
//         </SettingRow>
//     </CardContent>
// </Card>
