/** The rail shows the REAL tool (store `activeTool`), plus the open panel. */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorSidebar } from '../ui/EditorSidebar';
import type { SidebarItem } from '../editorsidebar.type';

const items: SidebarItem[] = [
    { id: 'select', label: 'Select', icon: 'arrow-pointer', kind: 'action', shortcut: 'V' },
    { id: 'node', label: 'Node Tool', icon: 'share-nodes', kind: 'action', shortcut: 'A' },
    { id: 'shapes', label: 'Shapes', icon: 'shapes', kind: 'panel', panel: <p>shapes panel</p> },
];
const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

describe('EditorSidebar tool state', () => {
    it('follows activeTool when the tool changes elsewhere (Escape, shortcuts, double-click)', () => {
        const { rerender } = render(<EditorSidebar items={items} activeTool="node" />);
        expect(pressed('Node Tool')).toBe('true');
        expect(pressed('Select')).toBe('false');

        rerender(<EditorSidebar items={items} activeTool="select" />);
        expect(pressed('Select')).toBe('true');
        expect(pressed('Node Tool')).toBe('false');
    });

    it('an open panel is shown next to the tool, not instead of it', () => {
        render(<EditorSidebar items={items} activeTool="node" defaultExpanded={false} />);
        fireEvent.click(screen.getByRole('button', { name: 'Shapes' }));
        expect(pressed('Shapes')).toBe('true');
        expect(pressed('Node Tool')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Shapes' })); // close
        expect(pressed('Shapes')).toBe('false');
    });

    it('clicking a tool still reports it; tooltips name the shortcut', () => {
        const onToolChange = vi.fn();
        render(<EditorSidebar items={items} activeTool="select" onToolChange={onToolChange} />);
        const node = screen.getByRole('button', { name: 'Node Tool' });
        expect(node.getAttribute('title')).toBe('Node Tool (A)');
        fireEvent.click(node);
        expect(onToolChange).toHaveBeenCalledWith('node');
    });

    it('Brush and Draw share the Draw tool: only the one picked lights up', () => {
        const drawItems: SidebarItem[] = [
            ...items,
            {
                id: 'brush',
                label: 'Brush',
                icon: 'paintbrush',
                kind: 'panel',
                activateTool: 'draw',
                panel: <p>b</p>,
            },
            {
                id: 'draw',
                label: 'Draw',
                icon: 'pencil',
                kind: 'panel',
                activateTool: 'draw',
                panel: <p>d</p>,
            },
        ];
        const { rerender } = render(<EditorSidebar items={drawItems} activeTool="select" />);
        fireEvent.click(screen.getByRole('button', { name: 'Brush' }));
        rerender(<EditorSidebar items={drawItems} activeTool="draw" />);
        expect(pressed('Brush')).toBe('true');
        expect(pressed('Draw')).toBe('false');

        fireEvent.click(screen.getByRole('button', { name: 'Shapes' })); // another panel: Draw tool still on
        expect(pressed('Brush')).toBe('true');
        expect(pressed('Draw')).toBe('true');
    });
});
