/** The rail shows the REAL tool (store `activeTool`) or the open panel: one lit button at a time. */
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

    it('only one rail button is lit: an open panel switches the tool to Select (Geometry + Shapes bug, BUG-286)', () => {
        const onToolChange = vi.fn();
        const geometryItems: SidebarItem[] = [
            ...items,
            { id: 'geometry', label: 'Geometry', icon: 'geometry', kind: 'action', shortcut: 'D' },
        ];
        const { rerender } = render(
            <EditorSidebar
                items={geometryItems}
                activeTool="geometry"
                defaultExpanded={false}
                onToolChange={onToolChange}
            />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Shapes' }));
        expect(onToolChange).toHaveBeenCalledWith('select');
        rerender(
            <EditorSidebar
                items={geometryItems}
                activeTool="select"
                defaultExpanded={false}
                onToolChange={onToolChange}
            />,
        );
        expect(pressed('Shapes')).toBe('true');
        expect(pressed('Geometry')).toBe('false');
        expect(pressed('Select')).toBe('false');
        fireEvent.click(screen.getByRole('button', { name: 'Shapes' })); // close
        expect(pressed('Shapes')).toBe('false');
        expect(pressed('Select')).toBe('true');
    });

    it('a tool picked elsewhere (shortcut, Escape) closes the open panel', () => {
        const { rerender } = render(
            <EditorSidebar items={items} activeTool="select" defaultExpanded={false} />,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Shapes' }));
        expect(screen.getByText('shapes panel')).toBeTruthy();
        rerender(<EditorSidebar items={items} activeTool="node" defaultExpanded={false} />);
        expect(pressed('Node Tool')).toBe('true');
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

        fireEvent.click(screen.getByRole('button', { name: 'Shapes' })); // another panel: only it lights up
        expect(pressed('Shapes')).toBe('true');
        expect(pressed('Brush')).toBe('false');
        expect(pressed('Draw')).toBe('false');
    });
});
