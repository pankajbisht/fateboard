import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { exampleSection, HELP_EXAMPLES } from '../helpExamples';
import { findTopic } from '../helpTopics';
import { ExampleSlider } from '../ui/ExampleSlider';
import { STEP_MS } from '../ui/ExampleSteps';

const [neon, mandala] = HELP_EXAMPLES.draw!;

const open = (topicId = 'draw', section?: string) =>
    render(
        <MemoryRouter
            initialEntries={[`/help?topic=${topicId}${section ? `&section=${section}` : ''}`]}
        >
            <ExampleSlider topic={findTopic(topicId)!} />
        </MemoryRouter>,
    );

/** The example on screen: the others are hidden. */
const slide = () => screen.getByRole('group', { name: /^\d+ of \d+: / });
const status = () => within(slide()).getByRole('status');
const button = (name: string | RegExp) => within(slide()).getByRole('button', { name });

describe('ExampleSlider', () => {
    afterEach(() => vi.useRealTimers());

    it('shows the first example on its first step', () => {
        open();
        expect(screen.getByRole('region', { name: 'Real-world examples' })).toBeInTheDocument();
        expect(slide()).toHaveAccessibleName(`1 of 2: ${neon!.title}`);
        expect(status()).toHaveTextContent(`Step 1 of ${neon!.steps.length}`);
        expect(within(slide()).getByRole('group', { name: 'Step 1 of 5' })).toHaveTextContent(
            neon!.steps[0]!.text,
        );
    });

    it('draws the board for each step, with the control and where to act', () => {
        open();
        const picture = () => within(slide()).getByRole('img');
        expect(picture()).toHaveAccessibleName('The board at step 1');
        expect(within(slide()).getByText('Pages › Page background')).toBeInTheDocument();
        const shapesAtStart = picture().querySelectorAll('rect, path, text, circle').length;

        fireEvent.click(button('Next step'));
        expect(picture()).toHaveAccessibleName('The board at step 2');
        expect(within(slide()).getByText('Draw › Neon · Smoothing')).toBeInTheDocument();
        expect(within(slide()).getByTestId('scene-cursor')).toHaveStyle({
            transform: `translate(${neon!.steps[1]!.at![0]}px, ${neon!.steps[1]!.at![1]}px)`,
        });
        expect(picture().querySelectorAll('rect, path, text, circle').length).toBeGreaterThan(
            shapesAtStart,
        );

        fireEvent.keyDown(within(slide()).getByRole('group', { name: /^Steps:/ }), {
            key: 'End',
        });
        expect(picture()).toHaveAccessibleName('The finished board');
        expect(within(slide()).getByText('Finished')).toBeInTheDocument();
        expect(within(slide()).queryByTestId('scene-cursor')).toBeNull();
    });

    it('moves between examples with the arrows and the chips, and wraps around', () => {
        open();
        fireEvent.click(screen.getByRole('button', { name: 'Next example' }));
        expect(slide()).toHaveAccessibleName(`2 of 2: ${mandala!.title}`);
        fireEvent.click(screen.getByRole('button', { name: 'Next example' }));
        expect(slide()).toHaveAccessibleName(`1 of 2: ${neon!.title}`);
        fireEvent.click(screen.getByRole('button', { name: new RegExp(mandala!.title) }));
        expect(screen.getByRole('button', { name: new RegExp(mandala!.title) })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(slide()).toHaveAccessibleName(`2 of 2: ${mandala!.title}`);
    });

    it('steps inside an example with buttons, keys and the progress bar', () => {
        open();
        fireEvent.click(button('Next step'));
        expect(status()).toHaveTextContent('Step 2 of 5');

        const steps = within(slide()).getByRole('group', { name: /^Steps:/ });
        fireEvent.keyDown(steps, { key: 'ArrowLeft' });
        expect(status()).toHaveTextContent('Step 1 of 5');
        expect(button('Previous step')).toHaveAttribute('aria-disabled', 'true');

        fireEvent.click(button('Go to step 4'));
        expect(status()).toHaveTextContent('Step 4 of 5');
        expect(button('Go to step 4')).toHaveAttribute('aria-current', 'step');

        fireEvent.keyDown(steps, { key: 'End' });
        expect(status()).toHaveTextContent('Result');
        expect(button('Next step')).toHaveAttribute('aria-disabled', 'true');
        expect(within(slide()).getByText(neon!.result)).toBeInTheDocument();
        expect(within(slide()).getByRole('link', { name: /try it: open draw/i })).toHaveAttribute(
            'href',
            '/draw?panel=draw',
        );
    });

    it('plays the steps by itself and stops on the result', () => {
        vi.useFakeTimers();
        open();
        fireEvent.click(button('Play steps'));
        expect(within(slide()).getByTestId('step-progress')).toBeInTheDocument();

        act(() => vi.advanceTimersByTime(STEP_MS));
        expect(status()).toHaveTextContent('Step 2 of 5');

        fireEvent.click(button('Pause steps'));
        act(() => vi.advanceTimersByTime(STEP_MS * 3));
        expect(status()).toHaveTextContent('Step 2 of 5');

        fireEvent.click(button('Play steps'));
        for (let i = 0; i < 10; i++) act(() => vi.advanceTimersByTime(STEP_MS));
        expect(status()).toHaveTextContent('Result');
        expect(button('Play steps')).toBeInTheDocument();

        // play again from the result starts over
        fireEvent.click(button('Play steps'));
        expect(status()).toHaveTextContent('Step 1 of 5');
    });

    it('stops playing when its example slides away', () => {
        vi.useFakeTimers();
        open();
        fireEvent.click(button('Play steps'));
        fireEvent.click(screen.getByRole('button', { name: 'Next example' }));
        act(() => vi.advanceTimersByTime(STEP_MS * 2));
        fireEvent.click(screen.getByRole('button', { name: 'Previous example' }));
        expect(status()).toHaveTextContent('Step 1 of 5');
        // and it does not start again by itself when the example comes back
        act(() => vi.advanceTimersByTime(STEP_MS * 2));
        expect(status()).toHaveTextContent('Step 1 of 5');
        expect(button('Play steps')).toBeInTheDocument();
    });

    it('stops playing when you step by hand', () => {
        vi.useFakeTimers();
        open();
        fireEvent.click(button('Play steps'));
        const steps = within(slide()).getByRole('group', { name: /^Steps:/ });
        fireEvent.keyDown(steps, { key: 'End' });
        fireEvent.keyDown(steps, { key: 'Home' });
        act(() => vi.advanceTimersByTime(STEP_MS * 2));
        expect(status()).toHaveTextContent('Step 1 of 5');
        expect(button('Play steps')).toBeInTheDocument();
    });

    it('keeps focus on the step buttons at either end', () => {
        open();
        const previous = button('Previous step');
        previous.focus();
        fireEvent.click(previous);
        expect(previous).toHaveAttribute('aria-disabled', 'true');
        expect(previous).not.toBeDisabled();
        expect(previous).toHaveFocus();
        expect(status()).toHaveTextContent('Step 1 of 5');
    });

    it('opens the example a search link points at', () => {
        open('draw', exampleSection(mandala!));
        expect(slide()).toHaveAccessibleName(`2 of 2: ${mandala!.title}`);
    });

    it('links to the other topics an example uses', () => {
        open();
        expect(within(slide()).getByRole('link', { name: /pages/i })).toHaveAttribute(
            'href',
            '/help?topic=pages',
        );
    });

    it('shows nothing for a topic without examples', () => {
        const { container } = open('shortcuts');
        expect(container).toBeEmptyDOMElement();
    });
});
