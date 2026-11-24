import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStore } from '@store';
import { ColorPickerPopover } from '../ColorPickerPopover';

afterEach(cleanup);

function setup(color = '#ff0000', props: Partial<Parameters<typeof ColorPickerPopover>[0]> = {}) {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
        <ColorPickerPopover
            anchor={null}
            color={color}
            onChange={onChange}
            onClose={onClose}
            {...props}
        />,
    );
    const dialog = screen.getByRole('dialog', { name: 'Custom color' });
    const hex = screen.getByRole('textbox', { name: 'Hex' }) as HTMLInputElement;
    return { dialog, hex, onChange, onClose };
}

describe('ColorPickerPopover', () => {
    it('renders on <body>, above the editor header and footer bars', () => {
        const { dialog } = setup();
        expect(dialog.parentElement).toBe(document.body);
    });

    it('shows the color as hex and R / G / B', () => {
        const { hex } = setup('#2b7fff');
        expect(hex.value).toBe('2b7fff');
        expect((screen.getByRole('spinbutton', { name: 'Red' }) as HTMLInputElement).value).toBe(
            '43',
        );
        expect((screen.getByRole('spinbutton', { name: 'Green' }) as HTMLInputElement).value).toBe(
            '127',
        );
        expect((screen.getByRole('spinbutton', { name: 'Blue' }) as HTMLInputElement).value).toBe(
            '255',
        );
    });

    it('hex: typing does nothing until Enter; 3-digit and no-# input are accepted', () => {
        const { hex, onChange } = setup();
        fireEvent.focus(hex);
        fireEvent.change(hex, { target: { value: '0f0' } });
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.keyDown(hex, { key: 'Enter' });
        expect(onChange).toHaveBeenLastCalledWith('#00ff00');
        expect(hex.value).toBe('00ff00');
    });

    it('hex: invalid input reverts on blur, Escape in the field reverts without closing', () => {
        const { hex, onChange, onClose } = setup('#123456');
        fireEvent.focus(hex);
        fireEvent.change(hex, { target: { value: 'zz' } });
        fireEvent.blur(hex);
        expect(hex.value).toBe('123456');
        fireEvent.focus(hex);
        fireEvent.change(hex, { target: { value: 'abcdef' } });
        fireEvent.keyDown(hex, { key: 'Escape' });
        expect(hex.value).toBe('123456');
        expect(onChange).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
    });

    it('R / G / B fields apply one channel', () => {
        const { hex, onChange } = setup('#000000');
        const g = screen.getByRole('spinbutton', { name: 'Green' });
        fireEvent.focus(g);
        fireEvent.change(g, { target: { value: '128' } });
        fireEvent.keyDown(g, { key: 'Enter' });
        expect(onChange).toHaveBeenLastCalledWith('#008000');
        expect(hex.value).toBe('008000');
    });

    it('saturation / brightness square and hue slider work from the keyboard', () => {
        const { onChange } = setup('#ff0000'); // h 0, s 100, v 100
        const sv = screen.getByRole('slider', { name: 'Saturation and brightness' });
        fireEvent.keyDown(sv, { key: 'ArrowDown', shiftKey: true }); // brightness 90
        expect(onChange).toHaveBeenLastCalledWith('#e60000');
        fireEvent.keyDown(sv, { key: 'ArrowLeft', shiftKey: true }); // saturation 90
        expect(onChange).toHaveBeenLastCalledWith('#e61717');

        const hue = screen.getByRole('slider', { name: 'Hue' });
        expect(hue.getAttribute('aria-valuenow')).toBe('0');
        fireEvent.keyDown(hue, { key: 'End' }); // 360 = red again
        fireEvent.keyDown(hue, { key: 'Home' });
        fireEvent.keyDown(hue, { key: 'ArrowRight' }); // 1°
        expect(hue.getAttribute('aria-valuenow')).toBe('1');
        // keeps the hue when the color turns gray (no jump back to red)
        for (let i = 0; i < 12; i++) fireEvent.keyDown(sv, { key: 'ArrowLeft', shiftKey: true });
        expect(hue.getAttribute('aria-valuenow')).toBe('1');
    });

    it('Original swatch reverts to the color the picker opened with', () => {
        const { hex, onChange } = setup('#123456');
        fireEvent.focus(hex);
        fireEvent.change(hex, { target: { value: 'ff0000' } });
        fireEvent.keyDown(hex, { key: 'Enter' });
        fireEvent.click(screen.getByRole('button', { name: 'Original color #123456' }));
        expect(onChange).toHaveBeenLastCalledWith('#123456');
        expect(hex.value).toBe('123456');
    });

    it('follows outside changes (a palette click) while open', () => {
        const onChange = vi.fn();
        const { rerender } = render(
            <ColorPickerPopover
                anchor={null}
                color="#ff0000"
                onChange={onChange}
                onClose={() => {}}
            />,
        );
        rerender(
            <ColorPickerPopover
                anchor={null}
                color="#00ff00"
                onChange={onChange}
                onClose={() => {}}
            />,
        );
        expect((screen.getByRole('textbox', { name: 'Hex' }) as HTMLInputElement).value).toBe(
            '00ff00',
        );
    });

    it('recent colors apply in one click', () => {
        act(() => useStore.setState({ recentColors: ['#abcdef'] } as never));
        const { onChange } = setup();
        fireEvent.click(screen.getByRole('button', { name: 'Recent color #abcdef' }));
        expect(onChange).toHaveBeenLastCalledWith('#abcdef');
        act(() => useStore.setState({ recentColors: [] } as never));
    });

    it('Escape and a click outside close it; keys never reach canvas shortcuts', () => {
        const outer = vi.fn();
        window.addEventListener('keydown', outer);
        const { dialog, onClose } = setup();
        fireEvent.keyDown(dialog, { key: 'Delete' });
        expect(outer).not.toHaveBeenCalled();
        fireEvent.keyDown(dialog, { key: 'Escape' });
        expect(onClose).toHaveBeenLastCalledWith(true);
        fireEvent.pointerDown(document.body);
        expect(onClose).toHaveBeenLastCalledWith(false);
        window.removeEventListener('keydown', outer);
    });
    it('format switch: HSL / HSB / CMYK fields show and edit the color; HEX hides the channels', () => {
        const { hex, onChange } = setup('#ffffff');
        fireEvent.click(screen.getByRole('radio', { name: 'CMYK' }));
        const k = screen.getByRole('spinbutton', { name: 'Black' }) as HTMLInputElement;
        expect(k.value).toBe('0');
        expect(screen.getByRole('spinbutton', { name: 'Cyan' })).toBeTruthy();
        fireEvent.focus(k);
        fireEvent.change(k, { target: { value: '50' } });
        fireEvent.keyDown(k, { key: 'Enter' });
        expect(onChange).toHaveBeenLastCalledWith('#808080');
        expect(hex.value).toBe('808080');

        fireEvent.click(screen.getByRole('radio', { name: 'HSL' }));
        const l = screen.getByRole('spinbutton', { name: 'Lightness' }) as HTMLInputElement;
        expect(l.value).toBe('50');
        fireEvent.click(screen.getByRole('radio', { name: 'HSB' }));
        expect(
            (screen.getByRole('spinbutton', { name: 'Brightness' }) as HTMLInputElement).value,
        ).toBe('50');

        fireEvent.click(screen.getByRole('radio', { name: 'HEX' }));
        expect(screen.queryByRole('spinbutton')).toBeNull();
        expect(screen.getByRole('textbox', { name: 'Hex' })).toBeTruthy();
    });

    it('HSB / HSL hue edits on a gray keep the hue (no jump back to red)', () => {
        setup('#808080');
        fireEvent.click(screen.getByRole('radio', { name: 'HSB' }));
        const h = screen.getByRole('spinbutton', { name: 'Hue' }) as HTMLInputElement;
        fireEvent.focus(h);
        fireEvent.change(h, { target: { value: '200' } });
        fireEvent.keyDown(h, { key: 'Enter' });
        expect((screen.getByRole('spinbutton', { name: 'Hue' }) as HTMLInputElement).value).toBe(
            '200',
        );
        expect(screen.getByRole('slider', { name: 'Hue' }).getAttribute('aria-valuenow')).toBe(
            '200',
        );
    });

    it('copy button copies the color in the chosen format', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        setup('#2b7fff');
        fireEvent.click(screen.getByRole('button', { name: 'Copy rgb(43, 127, 255)' }));
        expect(writeText).toHaveBeenLastCalledWith('rgb(43, 127, 255)');
        fireEvent.click(screen.getByRole('radio', { name: 'CMYK' }));
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Copy cmyk(83%, 50%, 0%, 0%)' }));
        });
        expect(writeText).toHaveBeenLastCalledWith('cmyk(83%, 50%, 0%, 0%)');
        expect(screen.getByText('Copied')).toBeTruthy();
    });

    it('harmonies: all five schemes; a click applies the color and keeps the base', () => {
        const onChange = vi.fn();
        const props = { anchor: null, onChange, onClose: () => {} };
        const { rerender } = render(<ColorPickerPopover {...props} color="#ff0000" />);
        const group = screen.getByRole('group', { name: 'Color harmonies' });
        for (const name of [
            'Complementary',
            'Analogous',
            'Triadic',
            'Split-complementary',
            'Monochromatic',
        ]) {
            expect(group.textContent).toContain(name);
        }
        fireEvent.click(screen.getByRole('button', { name: 'Complementary color #00ffff' }));
        expect(onChange).toHaveBeenLastCalledWith('#00ffff');
        rerender(<ColorPickerPopover {...props} color="#00ffff" />);
        // still the harmonies of red: the picked one is marked, the base is one click away
        const picked = screen.getByRole('button', { name: 'Complementary color #00ffff' });
        expect(picked.getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(screen.getByRole('button', { name: 'Triadic color #00ff00' }));
        expect(onChange).toHaveBeenLastCalledWith('#00ff00');
        // a change from the picker itself makes it the new base
        const hex = screen.getByRole('textbox', { name: 'Hex' });
        fireEvent.focus(hex);
        fireEvent.change(hex, { target: { value: '0000ff' } });
        fireEvent.keyDown(hex, { key: 'Enter' });
        expect(screen.getByRole('button', { name: 'Complementary color #ffff00' })).toBeTruthy();
    });

    it('harmonies say when the color is a gray (no hue to turn)', () => {
        setup('#808080');
        expect(screen.getByText(/grays have no hue/i)).toBeTruthy();
    });
    it('HSB fields and the copy text describe the same (applied) color', () => {
        setup('#1a1a1a');
        fireEvent.click(screen.getByRole('radio', { name: 'HSB' }));
        const field = (name: string) =>
            screen.getByRole('spinbutton', { name }) as HTMLInputElement;
        for (const [name, v] of [
            ['Hue', '200'],
            ['Saturation', '10'], // dark + low saturation: the hex rounds it to 12 %
        ]) {
            fireEvent.focus(field(name));
            fireEvent.change(field(name), { target: { value: v } });
            fireEvent.keyDown(field(name), { key: 'Enter' });
        }
        const shown = `hsb(${field('Hue').value}, ${field('Saturation').value}%, ${field('Brightness').value}%)`;
        expect(screen.getByRole('button', { name: /^Copy hsb/ }).getAttribute('aria-label')).toBe(
            `Copy ${shown}`,
        );
    });

    it('a gray copies with the hue the picker kept', () => {
        setup('#808080');
        fireEvent.click(screen.getByRole('radio', { name: 'HSL' }));
        const h = screen.getByRole('spinbutton', { name: 'Hue' }) as HTMLInputElement;
        fireEvent.focus(h);
        fireEvent.change(h, { target: { value: '200' } });
        fireEvent.keyDown(h, { key: 'Enter' });
        expect(screen.getByRole('button', { name: 'Copy hsl(200, 0%, 50%)' })).toBeTruthy();
    });

    it('harmonies follow the picker again when it returns to an earlier harmony pick', () => {
        setup('#ff0000');
        fireEvent.click(screen.getByRole('button', { name: 'Complementary color #00ffff' }));
        const hex = screen.getByRole('textbox', { name: 'Hex' });
        for (const v of ['123456', '00ffff']) {
            fireEvent.focus(hex);
            fireEvent.change(hex, { target: { value: v } });
            fireEvent.keyDown(hex, { key: 'Enter' });
        }
        // base is cyan now: its complement is red
        expect(screen.getByRole('button', { name: 'Complementary color #ff0000' })).toBeTruthy();
    });

    it('re-places itself when its height changes (stays inside the window)', () => {
        const observed: Element[] = [];
        let fire = () => {};
        const RO = window.ResizeObserver;
        window.ResizeObserver = class {
            constructor(cb: () => void) {
                fire = cb;
            }
            observe(el: Element) {
                observed.push(el);
            }
            unobserve() {}
            disconnect() {}
        } as unknown as typeof ResizeObserver;
        const anchor = document.createElement('button');
        document.body.appendChild(anchor);
        anchor.getBoundingClientRect = () => ({ top: 500, left: 900 }) as DOMRect;
        render(
            <ColorPickerPopover
                anchor={anchor}
                color="#000000"
                onChange={() => {}}
                onClose={() => {}}
            />,
        );
        const dialog = screen.getByRole('dialog', { name: 'Custom color' });
        expect(observed).toContain(dialog);
        Object.defineProperty(dialog, 'offsetHeight', { value: 600, configurable: true });
        act(() => fire());
        expect(dialog.style.top).toBe(`${window.innerHeight - 600 - 8}px`);
        window.ResizeObserver = RO;
        anchor.remove();
    });
});
