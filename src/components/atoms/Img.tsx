import clsx from "clsx";

export const Img = ({ src, height }) => {
    return <>
        <img src={src} className={clsx('rounded-t-lg', 'h-' + height)} />
    </>
}