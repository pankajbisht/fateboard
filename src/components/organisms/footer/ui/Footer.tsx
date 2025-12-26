import { FullScreen } from '@components/molecules/FullScreen';
import { ViewTool } from '@components/templates/ViewTool.template';
import { ColorPicker } from '@components/organisms/ColorPicker';
import { StrokeControls } from '@components/organisms/StrokeControls';

export function Footer() {
    return (
        <footer className="flex flex-col">
            <ViewTool
                // colorTool={<small>ok</small>}
                zoomTool={<FullScreen />}
                strokeTool={<StrokeControls />}
            />
        </footer>
    );
}
