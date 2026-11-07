import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Field } from '../Field';
import { SliderField } from '../LabeledSlider';
import LabeledToggle from '../LabeledToggle';
import { SegmentedControl } from '../SegmentedControl';
import { PanelSection } from '../PanelSection';
import { EmptyState } from '../EmptyState';
import { SelectField } from '../SelectField';
import { PanelLayout } from '../../templates/PanelLayout';

afterEach(cleanup);

describe('Field', () => {
    it('labels its control by id or by wrapping', () => {
        const { rerender } = render(
            <Field label="Name" htmlFor="f-name">
                <input id="f-name" />
            </Field>,
        );
        expect(screen.getByLabelText('Name')).toBeTruthy();

        rerender(
            <Field label="Length" wrap>
                <input />
            </Field>,
        );
        expect(screen.getByLabelText('Length')).toBeTruthy();
    });
});

describe('SliderField', () => {
    it('shows the value with the step precision and unit, and resets on double-click', () => {
        const onChange = vi.fn();
        const onCommit = vi.fn();
        render(
            <SliderField
                label="Opacity"
                min={0}
                max={1}
                step={0.05}
                value={0.5}
                defaultValue={1}
                unit="×"
                onChange={onChange}
                onCommit={onCommit}
            />,
        );
        expect(screen.getByText('0.50')).toBeTruthy();
        const slider = screen.getByRole('slider', { name: 'Opacity' });
        expect(slider.getAttribute('aria-valuetext')).toBe('0.50 ×');

        fireEvent.doubleClick(slider);
        expect(onChange).toHaveBeenCalledWith(1);
        expect(onCommit).toHaveBeenCalledWith(1);
    });
});

describe('LabeledToggle', () => {
    it('is a labelled switch', () => {
        const onChange = vi.fn();
        render(<LabeledToggle label="Snap to grid" checked={false} onChange={onChange} />);
        fireEvent.click(screen.getByRole('switch', { name: 'Snap to grid' }));
        expect(onChange).toHaveBeenCalledWith(true);
    });
});

describe('SegmentedControl', () => {
    function Harness() {
        const [v, setV] = useState<'a' | 'b' | 'c'>('a');
        return (
            <SegmentedControl
                aria-label="Mode"
                value={v}
                onChange={setV}
                options={[
                    { value: 'a', label: 'A' },
                    { value: 'b', label: 'B', disabled: true },
                    { value: 'c', label: 'C' },
                ]}
            />
        );
    }

    it('is a radio group; arrows move the selection and skip disabled options', () => {
        render(<Harness />);
        const group = screen.getByRole('radiogroup', { name: 'Mode' });
        expect(group).toBeTruthy();
        const a = screen.getByRole('radio', { name: 'A' });
        expect(a.getAttribute('aria-checked')).toBe('true');

        fireEvent.keyDown(a, { key: 'ArrowRight' });
        expect(screen.getByRole('radio', { name: 'C' }).getAttribute('aria-checked')).toBe('true');
        expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'C' }));
    });
});

describe('PanelSection', () => {
    it('shows a title, a reset link, and collapses', () => {
        const onReset = vi.fn();
        render(
            <PanelSection title="Color" onReset={onReset} collapsible>
                <p>body</p>
            </PanelSection>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
        expect(onReset).toHaveBeenCalled();

        const toggle = screen.getByRole('button', { name: /Color/ });
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        fireEvent.click(toggle);
        expect(screen.queryByText('body')).toBeNull();
    });
});

describe('SelectField', () => {
    it('labels its Select', () => {
        render(
            <SelectField
                label="Paint"
                value="fill"
                onChange={() => {}}
                options={[
                    { value: 'fill', label: 'Fill' },
                    { value: 'stroke', label: 'Stroke' },
                ]}
            />,
        );
        expect(screen.getByRole('combobox', { name: 'Paint' }).textContent).toContain('Fill');
    });
});

describe('EmptyState', () => {
    it('renders title, description and action', () => {
        render(
            <EmptyState
                title="No layers"
                description="Add a shape"
                action={<button>Add</button>}
            />,
        );
        expect(screen.getByText('No layers')).toBeTruthy();
        expect(screen.getByText('Add a shape')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy();
    });
});

describe('PanelLayout (template)', () => {
    it('renders exactly one header with the title and a close button', () => {
        const onClose = vi.fn();
        render(
            <PanelLayout
                title="Layers"
                icon="layer-group"
                onClose={onClose}
                footer={<span>footer</span>}
            >
                <p>content</p>
            </PanelLayout>,
        );
        expect(screen.getAllByRole('heading')).toHaveLength(1);
        expect(screen.getByRole('heading', { name: 'Layers' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Close Layers panel' }));
        expect(onClose).toHaveBeenCalled();
        expect(screen.getByText('footer')).toBeTruthy();
    });
});
