import { BrandLogo } from '@/components/molecules/BrandLogo';
import { HeaderViewTool } from '@/components/templates/HeaderViewTool.template';
import { TopToolbar } from '../../toolbars/ui/TopToolbar';
import { ShapeToolsHeader } from '../../ShapeToolsHeader';

const Header = () => {
    return (
        // a div: Editor.template's <header> is the banner landmark (no nested / duplicate banner)
        <div className="flex min-w-0 bg-surface p-1 px-2 shadow-xs border-b border-line">
            <HeaderViewTool
                brand={<BrandLogo />}
                toolbar={<TopToolbar />}
                transform={<ShapeToolsHeader />}
            ></HeaderViewTool>
        </div>
    );
};

export { Header };
