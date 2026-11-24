import { render, screen } from '@testing-library/react';

describe('smoke', () => {
    it('runs test environment', () => {
        render(<div>Hello Vitest</div>);
        expect(screen.getByText('Hello Vitest')).toBeInTheDocument();
    });
});
