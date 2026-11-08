/** BUG-093: TransformInput forwards `min`, so angle / offset fields accept negative values. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { TransformInput } from '../TransformInput';

afterEach(cleanup);

const commit = (input: HTMLElement, value: string) => {
    fireEvent.change(input, { target: { value } });
    fireEvent.keyDown(input, { key: 'Enter' });
};

describe('TransformInput min', () => {
    it('keeps a negative value when min allows it', () => {
        const onChange = vi.fn();
        render(<TransformInput label="Angle" min={-360} max={360} value={0} onChange={onChange} />);
        commit(screen.getByRole('spinbutton'), '-45');
        expect(onChange).toHaveBeenLastCalledWith(-45);
    });

    it('still clamps at 0 by default', () => {
        const onChange = vi.fn();
        render(<TransformInput label="Rows" value={3} onChange={onChange} />);
        commit(screen.getByRole('spinbutton'), '-2');
        expect(onChange).toHaveBeenLastCalledWith(0);
    });
});
