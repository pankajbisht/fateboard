/**
 * The animation timeline as a bottom dock (owner request 2026-11-17): opened from the footer or ⌘⌥T,
 * resizable, panes beside the timeline that keep their state (BUG-185), board overlays switched from the bar.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useStore } from '@store';
import { emptyAnimation } from '@/animation/engine';
import { createFakeCanvas } from '@/test/fakeCanvas';
import { TIMELINE_DEFAULT_HEIGHT, TIMELINE_MIN_HEIGHT } from '@/store/slices/createTimelineSlice';
import { ZoomBarConfig } from '@/components/config/toolbars/ui/ZoomBarConfig';
import { buildCombo } from '@hooks/keyboard/useKeyboardShortcuts';
import { isMac, replaceToShortcut } from '@/lib/utils/isMac';
import { TimelineDock } from '../TimelineDock';
import { TimelineToggle } from '../TimelineToggle';

/* eslint-disable @typescript-eslint/no-explicit-any -- fake Fabric objects and partial store state */
function rect() {
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

const openDock = async () => {
    act(() => useStore.getState().setTimelineOpen(true));
    render(<TimelineDock />);
    return screen.findByRole('radiogroup', { name: 'Timeline panes' }); // the lazy panel has loaded
};
const pane = (name: string) =>
    fireEvent.click(
        within(screen.getByRole('radiogroup', { name: 'Timeline panes' })).getByRole('radio', {
            name,
        }),
    );

beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
    prevCanvas = useStore.getState().canvas;
    target = rect();
    canvas = createFakeCanvas([target]);
    useStore.setState({ canvas } as any);
    useStore.getState().loadAnimationData(emptyAnimation());
    useStore.setState({ timelineOpen: false, timelineHeight: TIMELINE_DEFAULT_HEIGHT } as any);
});
afterEach(() => {
    cleanup();
    useStore.getState().loadAnimationData(emptyAnimation());
    useStore.setState({ canvas: prevCanvas, autoKey: false, timelineOpen: false } as any);
    window.history.replaceState(null, '', '/');
    vi.unstubAllGlobals();
});

describe('opening and closing the timeline', () => {
    it('the footer button shows it under the board and says whether it is open', async () => {
        render(
            <>
                <TimelineToggle />
                <TimelineDock />
            </>,
        );
        expect(screen.queryByRole('region', { name: 'Timeline' })).toBeNull();
        const button = screen.getByRole('button', { name: 'Timeline' });
        expect(button.getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(button);
        expect(await screen.findByRole('button', { name: 'Keyframe at playhead' })).toBeTruthy();
        expect(screen.getByRole('region', { name: 'Timeline' })).toBeTruthy();
        expect(button.getAttribute('aria-pressed')).toBe('true');
    });

    it('Close hides it, which pauses playback (BUG-181)', async () => {
        await openDock();
        act(() => useStore.getState().play());
        fireEvent.click(screen.getByRole('button', { name: 'Close timeline' }));
        expect(useStore.getState().timelineOpen).toBe(false);
        expect(screen.queryByRole('region', { name: 'Timeline' })).toBeNull();
        expect(useStore.getState().isPlaying).toBe(false);
    });

    it('⌘⌥T is a command (Adobe Animate keys) that toggles it', () => {
        const cmd = (ZoomBarConfig as any[]).find((c) => c.id === 'toggle-timeline');
        // the key event, read the way useKeyboardShortcuts reads it, matches the command
        const press = new KeyboardEvent('keydown', {
            code: 'KeyT',
            metaKey: isMac,
            ctrlKey: !isMac,
            altKey: true,
        });
        expect(replaceToShortcut(buildCombo(press))).toBe(replaceToShortcut(cmd.shortcut));
        cmd.handler({ get: useStore.getState });
        expect(useStore.getState().timelineOpen).toBe(true);
        cmd.handler({ get: useStore.getState });
        expect(useStore.getState().timelineOpen).toBe(false);
    });

    it('old links to the Animate tab (/draw?tab=animate) open the timeline', async () => {
        window.history.replaceState(null, '', '/draw?tab=animate');
        render(<TimelineDock />);
        expect(await screen.findByRole('region', { name: 'Timeline' })).toBeTruthy();
    });
});

describe('auto-key in the bar', () => {
    // reviewer (2026-11-17): the explanation was a `title` only (no screen reader, no touch), and the
    // "Recording" mark used text-danger, below AA in dark mode (BUG-201)
    it('the switch is described for screen readers; Recording is readable text', async () => {
        await openDock();
        const sw = screen.getByRole('switch', { name: 'Auto-key' });
        expect(sw.getAttribute('aria-describedby')).toBeTruthy();
        expect(document.getElementById(sw.getAttribute('aria-describedby')!)!.textContent).toMatch(
            /Record a keyframe whenever you change an object/,
        );
        fireEvent.click(sw);
        const mark = screen.getByText('Recording');
        expect(mark.className).not.toContain('text-danger');
        expect(document.getElementById(sw.getAttribute('aria-describedby')!)!.textContent).toMatch(
            /^Recording\./,
        );
        act(() => useStore.getState().setAutoKey(false));
    });
});

describe('resizing', () => {
    it('the top edge is a separator: arrows, Shift + arrows, Home, double-click for the default', async () => {
        await openDock();
        const edge = screen.getByRole('separator', { name: 'Resize timeline' });
        expect(edge.getAttribute('aria-valuenow')).toBe(String(TIMELINE_DEFAULT_HEIGHT));

        fireEvent.keyDown(edge, { key: 'ArrowUp' });
        expect(useStore.getState().timelineHeight).toBe(TIMELINE_DEFAULT_HEIGHT + 16);
        fireEvent.keyDown(edge, { key: 'ArrowDown', shiftKey: true });
        expect(useStore.getState().timelineHeight).toBe(TIMELINE_DEFAULT_HEIGHT + 16 - 64);
        fireEvent.keyDown(edge, { key: 'Home' });
        expect(useStore.getState().timelineHeight).toBe(TIMELINE_MIN_HEIGHT);
        expect(edge.getAttribute('aria-valuenow')).toBe(String(TIMELINE_MIN_HEIGHT));
        fireEvent.doubleClick(edge);
        expect(useStore.getState().timelineHeight).toBe(TIMELINE_DEFAULT_HEIGHT);
    });

    it('dragging the edge up makes it taller, never past 70 % of the window', async () => {
        await openDock();
        const edge = screen.getByRole('separator', { name: 'Resize timeline' });
        fireEvent.pointerDown(edge, { button: 0, clientY: 500, pointerId: 1 });
        fireEvent.pointerMove(edge, { clientY: 400, pointerId: 1 });
        // jsdom has no layout: the drag starts from the stored height
        expect(useStore.getState().timelineHeight).toBe(TIMELINE_DEFAULT_HEIGHT + 100);
        fireEvent.pointerMove(edge, { clientY: -5000, pointerId: 1 });
        expect(useStore.getState().timelineHeight).toBe(Math.round(window.innerHeight * 0.7));
        fireEvent.pointerUp(edge, { pointerId: 1 });
        fireEvent.pointerMove(edge, { clientY: 900, pointerId: 1 });
        expect(useStore.getState().timelineHeight).toBe(Math.round(window.innerHeight * 0.7));
    });
});

describe('panes beside the timeline', () => {
    it('a pane keeps its settings while another one is shown (BUG-185)', async () => {
        await openDock();
        const type = screen.getByRole('radiogroup', { name: 'Animation type' });
        fireEvent.click(within(type).getByRole('radio', { name: 'Exit' }));
        pane('Export');
        expect(screen.queryByRole('radiogroup', { name: 'Animation type' })).toBeNull();
        expect(screen.getByRole('combobox', { name: 'Output' })).toBeTruthy();
        pane('Animate');
        const back = screen.getByRole('radiogroup', { name: 'Animation type' });
        expect(within(back).getByRole('radio', { name: 'Exit' }).getAttribute('aria-checked')).toBe(
            'true',
        );
        // the timeline itself stays in view the whole time
        expect(screen.getByRole('spinbutton', { name: 'Timeline length' })).toBeTruthy();
    });

    it('clicking a keyframe opens the Keyframe pane', async () => {
        await openDock();
        act(() => {
            canvas.setActiveObject(target);
            canvas.fire('selection:created', { selected: [target] });
        });
        fireEvent.click(screen.getByRole('button', { name: 'Fade in' }));
        pane('Keyframe');
        expect(screen.getByText(/Click a keyframe on the timeline/)).toBeTruthy();
        pane('Animate');

        const marker = screen.getByRole('button', { name: /^Keyframe at 00:00:18 on Blue card/ });
        fireEvent.pointerDown(marker);
        fireEvent.pointerUp(marker);
        expect(screen.getByRole('spinbutton', { name: 'Opacity' })).toBeTruthy();
        expect(screen.getByRole('radio', { name: 'Keyframe' }).getAttribute('aria-checked')).toBe(
            'true',
        );
    });

    it('onion skin and motion path: switched on the bar, tuned in the View pane', async () => {
        await openDock();
        fireEvent.click(screen.getByRole('button', { name: 'Onion skin' }));
        fireEvent.click(screen.getByRole('button', { name: 'Motion path' }));
        expect(useStore.getState().onionSkin.on).toBe(true);
        expect(useStore.getState().motionPath).toBe(true);
        expect(
            screen.getByRole('button', { name: 'Onion skin' }).getAttribute('aria-pressed'),
        ).toBe('true');

        pane('View');
        const frames = screen.getByRole('slider', { name: 'Frames each side' });
        fireEvent.change(frames, { target: { value: '3' } });
        expect(useStore.getState().onionSkin.count).toBe(3);
        fireEvent.click(screen.getByRole('switch', { name: 'Show motion paths' }));
        expect(useStore.getState().motionPath).toBe(false);

        act(() => useStore.getState().setOnionSkin({ on: false }));
        act(() => useStore.getState().setMotionPath(false));
    });
});

describe('narrow docks (phones)', () => {
    it('the timeline and the panes take turns', async () => {
        const rect = vi
            .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
            .mockReturnValue({ width: 400, height: 300 } as DOMRect);
        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe() {}
                disconnect() {}
            },
        );
        await openDock();
        const panes = screen.getByRole('radiogroup', { name: 'Timeline panes' });
        expect(
            within(panes)
                .getAllByRole('radio')
                .map((r) => r.textContent),
        ).toEqual(['Timeline', 'Animate', 'Keyframe', 'View', 'Export']);
        // starts on Animate: the timeline is hidden until picked
        expect(screen.queryByRole('spinbutton', { name: 'Timeline length' })).toBeNull();
        pane('Timeline');
        expect(screen.getByRole('spinbutton', { name: 'Timeline length' })).toBeTruthy();
        expect(screen.queryByRole('radiogroup', { name: 'Animation type' })).toBeNull();
        rect.mockRestore();
    });
});
