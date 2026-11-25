import { FullScreen } from '@components/molecules/FullScreen';
import { DistractionFreeToggle } from '@components/molecules/DistractionFree';
import { StrokeControls } from '@components/organisms/StrokeControls';
import { TimelineToggle } from '@components/organisms/animation/TimelineToggle';
import { ZoomControl } from './ZoomControl';

/** Bottom bar: object style on the left; view (timeline, zoom + page size, fullscreen) on the right. */
export function Footer() {
    return (
        // px-4: same 16 px inset on both sides as the panels (labels never touch the window edge)
        // a div: Editor.template's <footer> is the contentinfo landmark
        // upright phones (inside the "More" sheet): style on one row, view controls on the next
        <div className="flex items-center gap-3 border-t border-line bg-surface px-4 py-1 max-sm:flex-col max-sm:items-stretch max-sm:gap-1 max-sm:border-t-0">
            {/* small screens: scrolls sideways instead of running under the zoom controls */}
            <div className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
                <StrokeControls />
            </div>
            <div
                data-testid="footer-view"
                className="flex shrink-0 items-center gap-2 border-l border-line pl-3 max-sm:justify-between max-sm:border-l-0 max-sm:pl-0"
            >
                <TimelineToggle />
                <ZoomControl />
                <DistractionFreeToggle />
                <FullScreen />
            </div>
        </div>
    );
}
