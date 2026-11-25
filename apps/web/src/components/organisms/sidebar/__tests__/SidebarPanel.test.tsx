import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SidebarPanel } from '../ui/SidebarPanel';
import type { SidebarPanelItem } from '../../editorsidebar/editorsidebar.type';

afterEach(cleanup);

const item: SidebarPanelItem = {
    id: 'text',
    label: 'Text',
    icon: 'font',
    kind: 'panel',
    panel: <p>panel body</p>,
};

describe('SidebarPanel', () => {
    it('renders one PanelLayout header (title + close) around the panel content', () => {
        const onClose = vi.fn();
        render(<SidebarPanel item={item} expanded width={300} onClose={onClose} />);

        expect(screen.getAllByRole('heading')).toHaveLength(1);
        expect(screen.getByRole('heading', { name: 'Text' })).toBeTruthy();
        expect(screen.getByText('panel body')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Close Text panel' }));
        expect(onClose).toHaveBeenCalled();
    });

    it('renders nothing inside when collapsed', () => {
        render(<SidebarPanel item={item} expanded={false} width={300} onClose={() => {}} />);
        expect(screen.queryByRole('heading')).toBeNull();
    });
});
