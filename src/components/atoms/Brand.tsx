type BrandProp = React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
}

const Brand = ({ src, ...rest }: BrandProp) => {
    return <>
        <img src={src} { ...rest } />
    </>
}

export default Brand;