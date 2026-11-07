type BrandProp = React.ImgHTMLAttributes<HTMLImageElement> & {
    src: string;
};

/** The Fateboard logo. Announced as "Fateboard" unless the caller passes its own `alt` (`""` when a parent is labelled). */
const Brand = ({ src, alt = 'Fateboard', ...rest }: BrandProp) => (
    <img src={src} alt={alt} {...rest} />
);

export default Brand;
