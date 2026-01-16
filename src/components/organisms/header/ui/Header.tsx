import { BrandLogo } from '@/components/molecules/BrandLogo';
import { HeaderViewTool } from '@/components/templates/HeaderViewTool.template';
import { TopToolbar } from '../../toolbars/ui/TopToolbar';
import { ShapeToolsHeader } from '../../ShapeToolsHeader';

const Header = () => {
    return (
        <header className="flex bg-white p-1 px-2 shadow-xs border-b border-stone-200">
            <HeaderViewTool
                brand={<BrandLogo />}
                toolbar={<TopToolbar />}
                transform={<ShapeToolsHeader />}
            ></HeaderViewTool>
        </header>
    );
};

export { Header };
