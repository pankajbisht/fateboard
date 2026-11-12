/**
 * What the landing page stage shows for a given state: the board at a step, two steps blended
 * while the time-lapse is scrubbed, or the sketch and the finished poster split by the compare wipe.
 * Pure, so the zoom lens can draw the very same picture, larger.
 */
import { ExampleScene } from '@/components/organisms/helpsection/ui/ExampleScene';

import { BUILD_STORY } from './buildStory';

export type StageMode = 'watch' | 'compare';

export interface StageState {
    mode: StageMode;
    /** 0 … steps.length (the last one is the finished poster). */
    step: number;
    /** While the time-lapse is dragged: a position between steps, else null. */
    scrub: number | null;
    /** Compare wipe, 0–100 (% of the width that shows the sketch). */
    wipe: number;
}

export const STORY_LAST = BUILD_STORY.steps.length;

const PILL =
    'pointer-events-none absolute bottom-4 rounded-full bg-ink/80 px-2.5 py-0.5 text-caption font-semibold text-surface';

export function StageView({ state, still = false }: { state: StageState; still?: boolean }) {
    if (state.mode === 'compare') {
        return (
            <div className="relative">
                <ExampleScene example={BUILD_STORY} step={STORY_LAST} still />
                <div
                    data-frame="before"
                    className="absolute inset-0"
                    style={{ clipPath: `inset(0 ${100 - state.wipe}% 0 0)` }}
                >
                    <ExampleScene example={BUILD_STORY} step={0} still bare />
                </div>
                <span className={`${PILL} left-4`}>Thought</span>
                <span className={`${PILL} right-4`}>Visual</span>
            </div>
        );
    }

    if (state.scrub !== null) {
        const base = Math.min(Math.floor(state.scrub), STORY_LAST);
        const blend = state.scrub - base;
        return (
            <div className="relative">
                <ExampleScene example={BUILD_STORY} step={base} still />
                {blend > 0 && base < STORY_LAST && (
                    <div data-frame="next" className="absolute inset-0" style={{ opacity: blend }}>
                        <ExampleScene example={BUILD_STORY} step={base + 1} still bare />
                    </div>
                )}
            </div>
        );
    }

    return <ExampleScene example={BUILD_STORY} step={state.step} still={still} />;
}
