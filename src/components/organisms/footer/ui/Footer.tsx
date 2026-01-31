import { FullScreen } from '@components/molecules/FullScreen';
import { ViewTool } from '@components/templates/ViewTool.template';
import { StrokeControls } from '@components/organisms/StrokeControls';

export function Footer() {
    return (
        <footer className="flex flex-col border-t border-stone-200 bg-stone-500">
            <ViewTool zoomTool={<FullScreen />} strokeTool={<StrokeControls />} />
        </footer>
    );
}
