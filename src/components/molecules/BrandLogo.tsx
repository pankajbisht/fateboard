import Brand from '../atoms/Brand';

const BrandLogo = () => {
    return (
        <>
            <Brand src="fate.svg" className="h-8 cursor-pointer hidden md:block" />
            <Brand src="fateicon.svg" className="h-8 cursor-pointer md:hidden" />
        </>
    );
};

const MBrandLogo = () => {
    return (
        <>
            <Brand src="fateicon.svg" className="h-8 cursor-pointer" />
        </>
    );
};

export { BrandLogo, MBrandLogo };
