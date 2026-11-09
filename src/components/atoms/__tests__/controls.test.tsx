import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button } from '../Button';
import { IconButton } from '../IconButton';
import { Slider } from '../Slider';
import { Switch } from '../Switch';
import { Input } from '../Input';
import { Dropdown } from '../Dropdown';
import { Badge } from '../Badge';

afterEach(cleanup);

describe('Button', () => {
    it('renders the variant and an optional icon', () => {
        render(
            <Button variant="secondary" icon="download">
                Export
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Export' });
        expect(btn.getAttribute('type')).toBe('button');
        expect(btn.className).toContain('border-line-strong');
        expect(btn.querySelector('svg')).toBeTruthy();
    });

    it('loading disables the button and marks it busy', () => {
        const onClick = vi.fn();
        render(
            <Button loading onClick={onClick}>
                Save
            </Button>,
        );
        const btn = screen.getByRole('button', { name: 'Save' });
        expect(btn).toHaveProperty('disabled', true);
        expect(btn.getAttribute('aria-busy')).toBe('true');
        fireEvent.click(btn);
        expect(onClick).not.toHaveBeenCalled();
    });
});

describe('IconButton', () => {
    it('exposes the pressed state only when `active` is given', () => {
        const { rerender } = render(<IconButton icon="x" aria-label="Grid" />);
        expect(
            screen.getByRole('button', { name: 'Grid' }).getAttribute('aria-pressed'),
        ).toBeNull();
        rerender(<IconButton icon="x" aria-label="Grid" active />);
        const btn = screen.getByRole('button', { name: 'Grid' });
        expect(btn.getAttribute('aria-pressed')).toBe('true');
        expect(btn.className).toContain('bg-primary-100');
    });
});

describe('Slider', () => {
    it('reports changes and commits once on release', () => {
        const onChange = vi.fn();
        const onCommit = vi.fn();
        render(
            <Slider
                aria-label="Opacity"
                min={0}
                max={100}
                value={40}
                onChange={onChange}
                onCommit={onCommit}
            />,
        );
        const range = screen.getByRole('slider', { name: 'Opacity' });

        fireEvent.change(range, { target: { value: '55' } });
        expect(onChange).toHaveBeenCalledWith(55);
        expect(onCommit).not.toHaveBeenCalled();

        fireEvent.pointerUp(range);
        expect(onCommit).toHaveBeenCalledTimes(1);
    });
});

describe('Switch', () => {
    it('is a switch that toggles', () => {
        const onChange = vi.fn();
        render(<Switch aria-label="Snap" checked={false} onChange={onChange} />);
        const sw = screen.getByRole('switch', { name: 'Snap' });
        expect(sw.getAttribute('aria-checked')).toBe('false');
        fireEvent.click(sw);
        expect(onChange).toHaveBeenCalledWith(true);
    });
});

describe('Input', () => {
    it('links its label and marks errors', () => {
        render(<Input label="Width (px)" error="Too large" />);
        const input = screen.getByLabelText('Width (px)');
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(screen.getByText('Too large')).toBeTruthy();
    });
});

describe('Dropdown (toolbar wrapper)', () => {
    it('uses the app Select and returns string values', () => {
        const onChange = vi.fn();
        render(
            <Dropdown
                label="Size"
                value="12"
                onChange={onChange}
                options={[
                    { value: 12, label: '12' },
                    { value: 14, label: '14' },
                ]}
            />,
        );
        fireEvent.click(screen.getByRole('combobox', { name: 'Size' }));
        fireEvent.click(screen.getByRole('option', { name: '14' }));
        expect(onChange).toHaveBeenCalledWith('14');
    });
});

describe('Badge', () => {
    it('renders the tone', () => {
        render(<Badge tone="primary">3</Badge>);
        expect(screen.getByText('3').className).toContain('bg-primary-100');
    });
});
