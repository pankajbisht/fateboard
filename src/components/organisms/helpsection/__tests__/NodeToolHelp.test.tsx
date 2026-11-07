/** The Help page must describe the Node tool that ships (path node editing), not flowchart nodes. */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NodeToolHelp from '../ui/NodeToolHelp';

describe('Node tool help', () => {
    it('explains the real gestures', () => {
        render(<NodeToolHelp />);
        const text = document.body.textContent ?? '';
        expect(screen.getByRole('heading', { level: 1, name: 'Node Tool' })).toBeInTheDocument();
        for (const gesture of [
            /click a shape or a drawn path/i,
            /drag a node/i,
            /double-click the outline/i,
            /double-click a node/i,
            /alt/i,
            /enter/i,
            /escape/i,
        ]) {
            expect(text).toMatch(gesture);
        }
    });

    it('does not promise features the tool does not have', () => {
        render(<NodeToolHelp />);
        const text = document.body.textContent ?? '';
        expect(text).not.toMatch(/flowchart|mind map|connection handle|new node will be created/i);
    });
});
