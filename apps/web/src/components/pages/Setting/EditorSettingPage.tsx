import { useMemo, useState, type ComponentType } from 'react';
import { MBrandLogo } from '@/components/molecules/BrandLogo';
import Preferences from '@/components/organisms/settings/ui/Preferences';
import { Input } from '@/components/atoms/Input';

interface SettingsSection {
    id: string;
    label: string;
    /** Extra words the search box matches, so "dark" finds Preferences. */
    keywords?: string[];
    component: ComponentType;
}

// Add new sections here; the sidebar, search and routing pick them up automatically.
const SECTIONS: SettingsSection[] = [
    {
        id: 'preferences',
        label: 'Preferences',
        keywords: [
            'theme',
            'dark',
            'light',
            'icon',
            'size',
            'page',
            'canvas',
            'default',
            'orientation',
            'portrait',
            'landscape',
            'freehand',
            'unit',
            'reset',
        ],
        component: Preferences,
    },
];

export default function EditorSettingPage() {
    const [activeId, setActiveId] = useState(SECTIONS[0].id);
    const [query, setQuery] = useState('');

    const visibleSections = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return SECTIONS;
        return SECTIONS.filter(
            (s) => s.label.toLowerCase().includes(q) || s.keywords?.some((k) => k.includes(q)),
        );
    }, [query]);

    const active = SECTIONS.find((s) => s.id === activeId) ?? SECTIONS[0];
    const ActiveComponent = active.component;

    return (
        <div className="flex min-h-dvh flex-col bg-surface-muted text-ink md:flex-row">
            {/* Sidebar */}
            <aside className="flex w-full shrink-0 flex-col md:sticky md:top-0 md:h-dvh border-b border-line bg-surface p-5 md:w-72 md:border-b-0 md:border-r">
                <div className="mb-5 flex items-center gap-x-2">
                    <MBrandLogo />
                    <h2 className="text-lg font-semibold text-ink">Settings</h2>
                </div>

                <Input
                    id="settings-search"
                    type="search"
                    leadingIcon="magnifying-glass"
                    aria-label="Search settings"
                    value={query}
                    placeholder="Search settings"
                    autoComplete="off"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && visibleSections[0])
                            setActiveId(visibleSections[0].id);
                        if (e.key === 'Escape') setQuery('');
                    }}
                    className="mb-4"
                />

                <nav aria-label="Settings sections" className="min-h-0 flex-1 overflow-y-auto">
                    {visibleSections.length > 0 ? (
                        <ul className="space-y-1">
                            {visibleSections.map((section) => {
                                const isActive = section.id === active.id;
                                return (
                                    <li key={section.id}>
                                        <button
                                            type="button"
                                            aria-current={isActive ? 'page' : undefined}
                                            onClick={() => setActiveId(section.id)}
                                            className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors
                                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                                                ${
                                                    isActive
                                                        ? 'bg-primary-50 text-primary-ink dark:bg-primary-500/15 dark:text-primary-300'
                                                        : 'text-ink hover:bg-surface-muted'
                                                }`}
                                        >
                                            {section.label}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="px-3 py-2 text-sm text-ink-muted">
                            No settings match “{query}”.
                        </p>
                    )}
                </nav>
            </aside>

            {/* Content */}
            <main className="min-w-0 flex-1">
                <ActiveComponent />
            </main>
        </div>
    );
}
