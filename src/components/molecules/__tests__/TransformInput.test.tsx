import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TransformInput } from '../TransformInput';

afterEach(cleanup);

describe('TransformInput (footer stroke width, effect panels)', () => {
    it('same typing rules as the transform row: commit on Enter, empty reverts, decimals ok', () => {
        const onChange = vi.fn();
        render(<TransformInput label="Rows" value={4} onChange={onChange} max={50} />);
        const input = screen.getByRole('spinbutton', { name: 'Rows' });

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.blur(input);
        expect(onChange).not.toHaveBeenCalled();
        expect((input as HTMLInputElement).value).toBe('4');

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: '1' } });
        fireEvent.change(input, { target: { value: '12' } });
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onChange).toHaveBeenCalledWith(12);

        fireEvent.change(input, { target: { value: '80' } });
        fireEvent.keyDown(input, { key: 'Enter' });
        expect(onChange).toHaveBeenLastCalledWith(50); // clamped to max
    });
});
