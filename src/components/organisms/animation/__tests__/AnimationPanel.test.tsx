/**
 * The Animate tab as people use it (BUG-176): what is selected, presets that swap instead of
 * stacking, a readable timeline, keyframes you can click, and a clean exit (BUG-181).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useStore } from '@store';
import { emptyAnimation, type Track } from '@/animation/engine';
import { createFakeCanvas } from '@/test/fakeCanvas';
import AnimationPanel from '../AnimationPanel';
import { LABEL_W } from '../animation.logic';

/* eslint-disable @typescript-eslint/no-explicit-any */
function rect(props: Record<string, any> = {}) {
    return {
        type: 'rect',
        name: 'Blue card',
        left: 100,
        top: 50,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        skewX: 0,
        skewY: 0,
        opacity: 1,
        width: 10,
        height: 10,
        originX: 'left',
        originY: 'top',
        fill: '#0000ff',
        ...props,
        set(k: any, v?: any) {
            if (typeof k === 'string') (this as any)[k] = v;
            else Object.assign(this, k);
            return this;
        },
        setCoords() {},
    };
}

let prevCanvas: any;
let canvas: any;
let target: any;

const track = () => Object.values(useStore.getState().tracks)[0] as Track;
const times = () => track().keyframes.map((k) => k.time);
const tile = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement;
const select = (obj: any) =>
    act(() => {
        canvas.setActiveObject(obj);
        canvas.fire('selection:created', { selected: [obj] });
    });

beforeEach(() => {
    // no frames run: a preview stays at its first frame
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    prevCanvas = useStore.getState().canvas;
    target = rect();
    canvas = createFakeCanvas([target]);
    useStore.setState({ canvas } as any);
    useStore.getState().loadAnimationData(emptyAnimation());
});
afterEach(() => {
    cleanup();
    useStore.getState().loadAnimationData(emptyAnimation());
    useStore.setState({ canvas: prevCanvas, autoKey: false } as any);
    vi.unstubAllGlobals();
});

describe('Animation panel: adding an animation', () => {
    it('says what is selected, and presets wait for a selection', () => {
        render(<AnimationPanel />);
        const summary = screen.getByRole('status', { name: 'Selection' });
        expect(summary.textContent).toContain('Nothing selected');
        expect(tile('Fade in').disabled).toBe(true);
        expect(tile('Fade in').title).toBe('Select an object first');

        select(target);
        expect(summary.textContent).toContain('Blue card');
        expect(summary.textContent).toContain('Not animated yet');
        expect(tile('Fade in').disabled).toBe(false);
        // only text can be typed out
        expect(tile('Typewriter').disabled).toBe(true);
        expect(tile('Typewriter').title).toBe('Select a text object');
    });

    it('trying another preset of the same kind swaps it; another kind is added', () => {
        render(<AnimationPanel />);
        select(target);

        fireEvent.click(tile('Fade in'));
        expect(times()).toEqual([0, 600]);
        expect(screen.getByText(/added at 0 s/).textContent).toContain('Fade in');
        expect(tile('Fade in').getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(tile('Zoom in')); // stacked, this would be [0, 600, 700]
        expect(times()).toEqual([0, 700]);
        expect(track().keyframes[0].props.scaleX).toBeCloseTo(0.3);

        fireEvent.click(screen.getByRole('radio', { name: 'Emphasis' }));
        fireEvent.click(tile('Pulse'));
        expect(times()).toEqual([0, 400, 700, 800]);
    });

    it('the swap ends once the playhead leaves the new animation', () => {
        render(<AnimationPanel />);
        select(target);
        fireEvent.click(tile('Fade in'));
        act(() => useStore.getState().seek(3000));
        expect(screen.queryByText(/Fade in/, { selector: 'span.font-semibold' })).toBeNull();

        fireEvent.click(tile('Zoom in'));
        expect(times()).toEqual([0, 600, 3000, 3700]);
    });

    it('Undo in the note removes the animation and puts the object back', () => {
        render(<AnimationPanel />);
        select(target);
        fireEvent.click(tile('Fade in'));
        expect(target.opacity).toBe(0); // first frame of the preview
        fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
        expect(useStore.getState().tracks).toEqual({});
        expect(target.opacity).toBe(1);
    });

    it('a timing change re-times the animation that was just added', () => {
        render(<AnimationPanel />);
        select(target);
        const duration = screen.getByRole('spinbutton', { name: 'Duration' }) as HTMLInputElement;
        expect(duration.value).toBe(''); // Auto, not "0 s"
        fireEvent.click(tile('Fade in'));
        expect(duration.value).toBe('0.6');
        fireEvent.focus(duration);
        fireEvent.change(duration, { target: { value: '2' } });
        fireEvent.keyDown(duration, { key: 'Enter' });
        expect(times()).toEqual([0, 2000]);
    });
});

describe('Animation panel: timeline', () => {
    const addFade = () => {
        select(target);
        fireEvent.click(tile('Fade in'));
    };

    // BUG-177: three icon buttons left about 8 px for the name
    it('a track shows the object name, with room for it, and marks the selected object', () => {
        render(<AnimationPanel />);
        addFade();
        const row = document.querySelector('[data-track]') as HTMLElement;
        expect(within(row).getByText('Blue card')).toBeDefined();
        expect(row.getAttribute('data-selected')).toBe('true');
        // name = column − padding − the expand button; mute / remove sit on top, on hover only
        expect(LABEL_W - 8 - 24 - 2).toBeGreaterThanOrEqual(100);
        const actions = within(row).getByRole('button', {
            name: /^Mute animation/,
            hidden: true,
        }).parentElement!;
        expect(actions.className).toContain('absolute');

        act(() => {
            canvas.discardActiveObject();
            canvas.fire('selection:cleared', {});
        });
        expect(row.getAttribute('data-selected')).toBeNull();
    });

    it('clicking a keyframe selects it and moves the playhead to it', () => {
        render(<AnimationPanel />);
        addFade();
        const marker = screen.getByRole('button', { name: /^Keyframe at 00:00:18 on Blue card/ });
        fireEvent.pointerDown(marker);
        fireEvent.pointerUp(marker);
        const st = useStore.getState();
        expect(st.currentTime).toBe(600);
        expect(st.selectedKeyframes).toHaveLength(1);
        expect(st.past).toHaveLength(1); // a click is not an edit
        // the inspector speaks in plain words, opacity in percent
        const opacity = screen.getByRole('spinbutton', { name: 'Opacity' }) as HTMLInputElement;
        expect(opacity.value).toBe('100');
        expect(screen.queryByRole('spinbutton', { name: 'scaleX' })).toBeNull();
        // a value this keyframe does not set is empty (it read 0, as if the object were at 0)
        expect((screen.getByRole('spinbutton', { name: 'X' }) as HTMLInputElement).value).toBe('');
    });

    it('a track whose object was deleted is struck out right away', () => {
        render(<AnimationPanel />);
        addFade();
        const name = () =>
            within(document.querySelector('[data-track]') as HTMLElement).getByText('Blue card');
        expect(name().parentElement!.className).not.toContain('line-through');
        act(() => canvas.remove(target));
        expect(name().parentElement!.className).toContain('line-through');
    });

    it('the timeline length is set on the timeline', () => {
        render(<AnimationPanel />);
        const length = screen.getByRole('spinbutton', { name: 'Timeline length' });
        fireEvent.focus(length);
        fireEvent.change(length, { target: { value: '8' } });
        fireEvent.keyDown(length, { key: 'Enter' });
        expect(useStore.getState().animDuration).toBe(8000);
    });
});

describe('Animation panel: leaving the tab (BUG-181)', () => {
    it('pauses playback and turns auto-key off', () => {
        const { unmount } = render(<AnimationPanel />);
        act(() => {
            useStore.getState().setAutoKey(true);
            useStore.getState().play();
        });
        expect(useStore.getState().isPlaying).toBe(true);
        unmount();
        expect(useStore.getState().isPlaying).toBe(false);
        expect(useStore.getState().autoKey).toBe(false);
    });
});
