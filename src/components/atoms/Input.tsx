import { forwardRef } from "react";

export const Input = forwardRef(({ type="text", value, onChange, placeholder }, ref) => {

    return <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border rounded-full p-2 pl-10"
        ref={ref}
    />
});