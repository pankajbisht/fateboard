/**
 * Upright phones: the property bar (X / Y / W / H) only takes a row when it has something to show:
 * a selection, or a tool with options. Idle, the board gets the space.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { HeaderViewTool } from '@/components/templates/HeaderViewTool.template';
import { render } from '@testing-library/react';
import { propertyBarIdle } from '../ui/Header';

afterEach(cleanup);

describe('phone property bar', () => {
    it('is idle with the select or pan (hand) tool and nothing selected', () => {
        expect(propertyBarIdle('select', false)).toBe(true);
        expect(propertyBarIdle('pan', false)).toBe(true);
        expect(propertyBarIdle('select', true)).toBe(false);
        expect(propertyBarIdle('pen', false)).toBe(false);
        expect(propertyBarIdle('draw', false)).toBe(false);
    });

    it('an idle bar hides on phones only', () => {
        const { getByTestId, rerender } = render(
            <HeaderViewTool
                brand={null}
                toolbar={null}
                transform={<span />}
                transformPhoneHidden
            />,
        );
        expect(getByTestId('property-bar').className).toContain('max-sm:hidden');
        rerender(<HeaderViewTool brand={null} toolbar={null} transform={<span />} />);
        expect(getByTestId('property-bar').className).not.toContain('max-sm:hidden');
    });
});
