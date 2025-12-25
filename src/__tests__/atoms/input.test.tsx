import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input } from 'src/components/atoms/Input';

describe('Input atom', () => {
    it('renders label and value, shows error text when error string provided', () => {
        render(<Input label="Name" value="Alice" onChange={() => {}} error="Required" />);

        expect(screen.getByText('Name')).toBeInTheDocument();
        const input = screen.getByDisplayValue('Alice') as HTMLInputElement;
        expect(input).toBeInTheDocument();
        expect(screen.getByText('Required')).toBeInTheDocument();
    });
});
