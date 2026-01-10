import { GlowDivider } from '../organisms/toolbars';

const HeaderViewTool = ({ brand, toolbar, transform }) => {
    return (
        <section className="flex flex-col">
            <div className="flex flex-row items-center">
                {brand}
                {toolbar}
            </div>
            <div className="flex flex-row items-center">{transform}</div>
        </section>
    );
};

export { HeaderViewTool };
