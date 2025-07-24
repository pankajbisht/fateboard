import {Img} from "./Img.tsx";

export const ListItem = ({ el, icon, onClick }) => {
    console.log(el, icon)
    return <li className="flex flex-row justify-between items-center gap-2 border p-2 rounded">
        <div className="flex">
            <Img src={icon} height="20"/>
            <div className="flex flex-col">
                <span className="ml-2">{el}</span>
                <span className="ml-2">{el}</span>
            </div>
        </div>
        <i className="fa-solid fa-xmark" onClick={() => onClick(el.id) }></i>
    </li>
};
