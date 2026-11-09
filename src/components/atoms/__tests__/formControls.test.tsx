import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Input } from '../Input';
import { Select } from '../Select';
import { Button } from '../Button';
import { Chip } from '../Chip';
import { Textarea } from '../Textarea';
import { SegmentedControl } from '../../molecules/SegmentedControl';
import { PanelLayout } from '../../templates/PanelLayout';

afterEach(cleanup);

function Controls() {
    return (
        <>
            <Input aria-label="Name" />
            <Select
                aria-label="Blend"
                value="a"
                onChange={() => {}}
                options={[{ value: 'a', label: 'A' }]}
            />
            <Button>Go</Button>
            <SegmentedControl
                aria-label="Mode"
                value={'x' as 'x' | 'y'}
                onChange={() => {}}
                options={[
                    { value: 'x', label: 'X' },
                    { value: 'y', label: 'Y' },
                ]}
            />
        </>
    );
}

const heights = () => [
    screen.getByLabelText('Name').className,
    screen.getByRole('combobox', { name: 'Blend' }).className,
    screen.getByRole('button', { name: 'Go' }).className,
    screen.getByRole('radiogroup', { name: 'Mode' }).className,
];

describe('one control density', () => {
    it('outside panels controls are the regular height (h-8)', () => {
        render(<Controls />);
        for (const cls of heights()) expect(cls).toContain('h-8');
    });

    it('inside PanelLayout every control is the compact panel height (h-7)', () => {
        render(
            <PanelLayout title="Test">
                <Controls />
            </PanelLayout>,
        );
        for (const cls of heights()) expect(cls).toContain('h-7');
    });
});

describe('Input', () => {
    it('can show a leading icon (search fields)', () => {
        render(<Input aria-label="Search" leadingIcon="magnifying-glass" />);
        const input = screen.getByLabelText('Search');
        expect(input.className).toContain('pl-7');
        expect(input.parentElement?.querySelector('svg')).toBeTruthy();
    });
});

describe('Textarea', () => {
    it('uses the shared control box and links its label', () => {
        render(<Textarea label="SVG path" />);
        expect(screen.getByLabelText('SVG path').className).toContain('border-line-strong');
    });
});

describe('Chip', () => {
    it('is a pressed-state filter pill', () => {
        const onClick = vi.fn();
        render(
            <Chip active onClick={onClick}>
                Social
            </Chip>,
        );
        const chip = screen.getByRole('button', { name: 'Social' });
        expect(chip.getAttribute('aria-pressed')).toBe('true');
        expect(chip.className).toContain('bg-primary-100');
        fireEvent.click(chip);
        expect(onClick).toHaveBeenCalled();
    });
});
