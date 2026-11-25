import { useStore } from '@store';
import type { CanvasTool } from '@/store/canvasTools';
import { BrandLogo } from '@/components/molecules/BrandLogo';
import { HeaderViewTool } from '@/components/templates/HeaderViewTool.template';
import { TopToolbar } from '../../toolbars/ui/TopToolbar';
import { ToolContextBar } from '../../toolbars/ui/bars/DrawToolOptions';

/** Nothing selected and a tool without options: the property bar would only show disabled fields. */
export function propertyBarIdle(tool: CanvasTool, hasSelection: boolean) {
    return !hasSelection && (tool === 'select' || tool === 'pan');
}

const Header = () => {
    const idle = useStore((s) => propertyBarIdle(s.activeTool, s.hasSelection));
    return (
        // a div: Editor.template's <header> is the banner landmark (no nested / duplicate banner)
        <div className="flex min-w-0 bg-surface p-1 px-2 shadow-xs border-b border-line">
            <HeaderViewTool
                brand={<BrandLogo />}
                toolbar={<TopToolbar />}
                // selection X / Y / W / H, or the Pen / Pencil options while one is active
                transform={<ToolContextBar />}
                transformPhoneHidden={idle} // upright phones: the board gets the row
            />
        </div>
    );
};

export { Header };
