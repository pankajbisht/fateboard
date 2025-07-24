import { Img } from '../atoms/Img.tsx';

export const Card = ({ src, text }) => {
    return <>
        <div className="flex flex-col w-[300px] shadow-lg rounded-lg">
            <Img src={src}/>
            <p className="p-2 text-stone-400">
                {text}
            </p>
        </div>
    </>
}