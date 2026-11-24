/**
 * Icon audit (2026-11-16, BUG-208): every tool in the left rail and every right-dock tab has its own icon,
 * the icon exists in the registry, and none borrows an icon that means something else (the Node tool used a
 * "share" icon; Tiling and Along Path both showed the Settings gear).
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ICONS, Icon, type IconName } from '../Icon';
import editorsidebarconfig from '@/components/organisms/editorsidebar/editorsidebar.config';
import { TABS_CONFIG } from '@/components/config/tabs.config';
import { ToolBarConfig } from '@/components/config/toolbars/ui/ToolBarConfig';

/** Icons that mean one specific thing elsewhere in the app; a tool or tab must not reuse them. */
const RESERVED: Partial<Record<IconName, string>> = {
    gear: 'Settings',
    'screwdriver-wrench': 'Settings (renders the gear)',
    'share-nodes': 'Share',
    'table-cells-large': 'the grid toggle',
};

const rail = editorsidebarconfig.map((i) => ({ id: i.id, icon: i.icon as IconName }));
const dock = (TABS_CONFIG as unknown as { id: string; icon: string }[]).map((t) => ({
    id: t.id,
    icon: t.icon as IconName,
}));

describe('icon audit', () => {
    it('every rail item and dock tab names a registered icon', () => {
        for (const { id, icon } of [...rail, ...dock])
            expect(ICONS[icon], `${id}: ${icon}`).toBeTruthy();
    });

    it('rail items have distinct icons, and so do dock tabs', () => {
        const dupes = (list: { icon: string }[]) =>
            list.map((i) => i.icon).filter((icon, i, all) => all.indexOf(icon) !== i);
        expect(dupes(rail)).toEqual([]);
        expect(dupes(dock)).toEqual([]);
    });

    it('no tool or tab borrows an icon reserved for another meaning', () => {
        const tools = ToolBarConfig.map(
            (t) => (t.icon as { props: { name: IconName } }).props.name,
        );
        for (const icon of [...rail.map((i) => i.icon), ...dock.map((t) => t.icon), ...tools])
            expect(RESERVED[icon], `${icon} is reserved for ${RESERVED[icon]}`).toBeUndefined();
    });

    it('custom icons render as Lucide-style SVGs (24 grid, currentColor stroke)', () => {
        for (const name of [
            'node-tool',
            'tiling',
            'drafter',
            'symmetry-radial',
            'color-wheel',
        ] as const) {
            const { container, unmount } = render(<Icon name={name} />);
            const svg = container.querySelector('svg');
            expect(svg?.getAttribute('viewBox'), name).toBe('0 0 24 24');
            expect(svg?.getAttribute('stroke'), name).toBe('currentColor');
            expect(svg?.children.length, name).toBeGreaterThan(0);
            unmount();
        }
    });
});
