import { FullScreen } from '@components/molecules/FullScreen';
import { StrokeControls } from '@components/organisms/StrokeControls';
import { ZoomControl } from './ZoomControl';

/** Bottom bar: object style on the left; view (zoom + page size, fullscreen) on the right. */
export function Footer() {
    return (
        // px-4: same 16 px inset on both sides as the panels (labels never touch the window edge)
        // a div: Editor.template's <footer> is the contentinfo landmark
        <div className="flex items-center gap-3 border-t border-line bg-surface px-4 py-1">
            <div className="flex min-w-0 flex-1">
                <StrokeControls />
            </div>
            <div
                data-testid="footer-view"
                className="flex shrink-0 items-center gap-2 border-l border-line pl-3"
            >
                <ZoomControl />
                <FullScreen />
            </div>
        </div>
    );
}
