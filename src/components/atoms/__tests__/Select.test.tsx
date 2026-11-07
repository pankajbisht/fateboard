import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Select, type SelectOption } from '../Select';

afterEach(cleanup);

const OPTIONS: SelectOption<string>[] = [
    { value: 'normal', label: 'Normal' },
    { value: 'multiply', label: 'Multiply' },
    { value: 'screen', label: 'Screen', disabled: true },
    { value: 'overlay', label: 'Overlay' },
];

function Harness({ onChange = vi.fn() }: { onChange?: (v: string) => void }) {
    const [value, setValue] = useState('normal');
    return (
        <Select
            aria-label="Blend mode"
            options={OPTIONS}
            value={value}
            onChange={(v) => {
                setValue(v);
                onChange(v);
            }}
        />
    );
}

const trigger = () => screen.getByRole('combobox', { name: 'Blend mode' });

describe('Select', () => {
    it('shows the selected label on a combobox trigger, closed by default', () => {
        render(<Harness />);
        expect(trigger().textContent).toContain('Normal');
        expect(trigger().getAttribute('aria-expanded')).toBe('false');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('opens on click, marks the selected option, picks with a click and closes', () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);

        fireEvent.click(trigger());
        const list = screen.getByRole('listbox');
        expect(trigger().getAttribute('aria-expanded')).toBe('true');
        expect(trigger().getAttribute('aria-controls')).toBe(list.id);
        expect(screen.getByRole('option', { name: 'Normal' }).getAttribute('aria-selected')).toBe(
            'true',
        );

        fireEvent.click(screen.getByRole('option', { name: 'Multiply' }));
        expect(onChange).toHaveBeenCalledWith('multiply');
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(trigger().textContent).toContain('Multiply');
    });

    it('keyboard: ArrowDown opens, arrows skip disabled options, Enter selects', () => {
        const onChange = vi.fn();
        render(<Harness onChange={onChange} />);

        fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
        expect(screen.getByRole('listbox')).toBeTruthy();

        fireEvent.keyDown(trigger(), { key: 'ArrowDown' }); // Multiply
        fireEvent.keyDown(trigger(), { key: 'ArrowDown' }); // skips Screen -> Overlay
        const active = trigger().getAttribute('aria-activedescendant');
        expect(document.getElementById(active!)?.textContent).toContain('Overlay');

        fireEvent.keyDown(trigger(), { key: 'Enter' });
        expect(onChange).toHaveBeenCalledWith('overlay');
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('type-ahead jumps to the first matching option', () => {
        render(<Harness />);
        fireEvent.keyDown(trigger(), { key: 'ArrowDown' });
        fireEvent.keyDown(trigger(), { key: 'o' });
        const active = trigger().getAttribute('aria-activedescendant');
        expect(document.getElementById(active!)?.textContent).toContain('Overlay');
    });

    it('Escape closes the list without reaching parent listeners (e.g. a modal)', () => {
        const parent = vi.fn();
        const { container } = render(
            <div onKeyDown={parent}>
                <Harness />
            </div>,
        );
        container.addEventListener('keydown', parent);

        fireEvent.click(trigger());
        fireEvent.keyDown(trigger(), { key: 'Escape' });
        expect(screen.queryByRole('listbox')).toBeNull();
        expect(parent).not.toHaveBeenCalled();
    });

    it('closes on an outside mousedown', () => {
        render(<Harness />);
        fireEvent.click(trigger());
        fireEvent.mouseDown(document.body);
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('does not open when disabled', () => {
        render(
            <Select aria-label="X" options={OPTIONS} value="normal" onChange={() => {}} disabled />,
        );
        fireEvent.click(screen.getByRole('combobox', { name: 'X' }));
        expect(screen.queryByRole('listbox')).toBeNull();
    });
});

describe('Select groups and previews (font pickers)', () => {
    it('shows a header when the group changes and styles labels (font preview)', () => {
        render(
            <Select
                aria-label="Font"
                value="b"
                onChange={() => {}}
                options={[
                    { value: 'a', label: 'Inter', group: 'Sans', style: { fontFamily: 'Inter' } },
                    { value: 'b', label: 'Roboto', group: 'Sans' },
                    { value: 'c', label: 'Lora', group: 'Serif', style: { fontFamily: 'Lora' } },
                ]}
            />,
        );
        fireEvent.click(screen.getByRole('combobox', { name: 'Font' }));
        const list = screen.getByRole('listbox');
        const headers = [...list.querySelectorAll('[role="presentation"][data-group]')].map(
            (h) => h.textContent,
        );
        expect(headers).toEqual(['Sans', 'Serif']);
        const lora = screen.getByRole('option', { name: 'Lora' });
        expect((lora.querySelector('[data-label]') as HTMLElement).style.fontFamily).toBe('Lora');
    });
});
