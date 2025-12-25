import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { Button } from 'src/components/atoms/Button';

describe('Button atom', () => {
    it('renders children and fires onClick', () => {
        const handle = vi.fn();
        render(<Button onClick={handle}>Click me</Button>);

        const btn = screen.getByRole('button', { name: /Click me/i });
        expect(btn).toBeInTheDocument();

        fireEvent.click(btn);
        expect(handle).toHaveBeenCalledTimes(1);
    });

    it('respects disabled prop', () => {
        const handle = vi.fn();
        render(
            <Button onClick={handle} disabled>
                Disabled
            </Button>,
        );

        const btn = screen.getByRole('button', { name: /Disabled/i });
        expect(btn).toBeDisabled();

        fireEvent.click(btn);
        expect(handle).not.toHaveBeenCalled();
    });
});
