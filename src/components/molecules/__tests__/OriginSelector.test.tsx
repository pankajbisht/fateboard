import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import OriginSelector, { type OriginChoice } from '../OriginSelector';

afterEach(cleanup);

const NAMES = [
    'Top left',
    'Top',
    'Top right',
    'Left',
    'Center',
    'Right',
    'Bottom left',
    'Bottom',
    'Bottom right',
];

describe('OriginSelector (anchor point)', () => {
    it('offers the 9 standard anchor points as a radio group', () => {
        render(<OriginSelector value="c" onChange={() => {}} />);
        const group = screen.getByRole('radiogroup', { name: 'Anchor point' });
        expect(group).toBeTruthy();
        expect(screen.getAllByRole('radio').map((r) => r.getAttribute('aria-label'))).toEqual(
            NAMES,
        );
        expect(screen.getByRole('radio', { name: 'Center' }).getAttribute('aria-checked')).toBe(
            'true',
        );
    });

    it.each([
        ['Top', 't', 'center', 'top'],
        ['Left', 'l', 'left', 'center'],
        ['Bottom right', 'br', 'right', 'bottom'],
    ])('clicking %s reports id %s (%s / %s)', (name, id, originX, originY) => {
        const onChange = vi.fn();
        render(<OriginSelector value="c" onChange={onChange} />);
        fireEvent.click(screen.getByRole('radio', { name }));
        expect(onChange).toHaveBeenCalledWith({ id, originX, originY } as OriginChoice);
    });

    it('arrow keys move the anchor around the 3×3 grid', () => {
        function Harness() {
            const [v, setV] = useState('c');
            return <OriginSelector value={v} onChange={(o) => setV(o.id)} />;
        }
        render(<Harness />);
        const center = screen.getByRole('radio', { name: 'Center' });
        fireEvent.keyDown(center, { key: 'ArrowUp' });
        expect(screen.getByRole('radio', { name: 'Top' }).getAttribute('aria-checked')).toBe(
            'true',
        );
        fireEvent.keyDown(screen.getByRole('radio', { name: 'Top' }), { key: 'ArrowLeft' });
        expect(screen.getByRole('radio', { name: 'Top left' }).getAttribute('aria-checked')).toBe(
            'true',
        );
    });
});

describe('placement', () => {
    it('sits with the X / Y / W / H / R fields it controls, not in the top toolbar', async () => {
        const raw = import.meta.glob<string>(
            [
                '/src/components/organisms/toolbars/ui/TopToolbar.tsx',
                '/src/components/organisms/ShapeToolsHeader.tsx',
            ],
            { query: '?raw', import: 'default', eager: true },
        );
        expect(raw['/src/components/organisms/toolbars/ui/TopToolbar.tsx']).not.toMatch(
            /OriginSelector|OriginBar/,
        );
        const header = raw['/src/components/organisms/ShapeToolsHeader.tsx'];
        expect(header).toMatch(/<OriginSelector\b/);
        // right before the transform fields
        expect(header.indexOf('<OriginSelector')).toBeLessThan(
            header.indexOf('transformFieldsConfig.map'),
        );
    });

    it('is drawn like a selection box: 9 square handles, the chosen one filled', () => {
        render(<OriginSelector value="tr" onChange={() => {}} />);
        const handle = (name: string) =>
            screen.getByRole('radio', { name }).querySelector('[data-handle]')!;
        expect(handle('Top right').className).toContain('bg-primary-500');
        expect(handle('Center').className).not.toContain('bg-primary-500');
        expect(
            screen.getByRole('radiogroup', { name: 'Anchor point' }).querySelector('[data-box]'),
        ).toBeTruthy();
    });
});
