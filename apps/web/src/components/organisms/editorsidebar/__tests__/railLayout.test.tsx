/**
 * Rail layout (owner 2026-11-28): Pen, Pencil and Brush sit together in one block; the Laser is a mode
 * of the Pencil (no rail button); Pages and Layers live in the right dock.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RAIL from '../editorsidebar.config';
import { EditorSidebar } from '../ui/EditorSidebar';
import { TABS_CONFIG } from '../../../config/tabs.config';
import type { SidebarItem } from '../editorsidebar.type';

const items = RAIL as SidebarItem[];
const ids = items.map((i) => i.id);

describe('left rail layout', () => {
    it('Pen, Pencil and Brush are one block right after the selection tools', () => {
        expect(ids.slice(0, 6)).toEqual(['select', 'pan', 'node', 'pen', 'pencil', 'brush']);
        const block = items.filter((i) => i.group === 'draw').map((i) => i.id);
        expect(block).toEqual(['pen', 'pencil', 'brush']);
    });

    it('has no Laser, Pages or Layers button', () => {
        expect(ids).not.toContain('laser');
        expect(ids).not.toContain('Pages');
        expect(ids).not.toContain('layers');
    });

    it('draws a separator before and after the drawing block', () => {
        render(<EditorSidebar items={items} activeTool="select" />);
        const rail = screen.getByRole('navigation', { name: 'Editor tools and panels' });
        const kids = [...rail.children];
        const at = (label: string) =>
            kids.findIndex((el) => el.getAttribute('aria-label') === label);
        expect(kids[at('Pen') - 1].getAttribute('role')).toBe('separator');
        expect(kids[at('Brush') + 1].getAttribute('role')).toBe('separator');
        expect(kids[at('Pencil') - 1].getAttribute('role')).not.toBe('separator');
    });

    it('the Pencil button stays lit while its Laser mode is on', () => {
        render(<EditorSidebar items={items} activeTool="laser" />);
        expect(screen.getByRole('button', { name: 'Pencil' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });
});

describe('right dock', () => {
    it('Pages and Layers are its first two tabs', () => {
        expect(TABS_CONFIG.slice(0, 2).map((t) => [t.id, t.label])).toEqual([
            ['pages', 'Pages'],
            ['layers', 'Layers'],
        ]);
    });
});
