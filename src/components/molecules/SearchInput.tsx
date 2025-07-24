import { Input } from "../atoms/Input.tsx";
import { useRef } from "react";

export const SearchInput = () => {
    const inputRef = useRef(null);
    const handleClick = () => {
        inputRef.current.focus();
    }

    return <div className="flex items-center relative">
        <i className="fa-solid fa-magnifying-glass absolute left-4" onClick={handleClick}></i>
        <Input ref={inputRef} />
    </div>
}