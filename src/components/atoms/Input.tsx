import { forwardRef } from "react";

export const Input = forwardRef(({ value, onChange, placeholder }, ref) => {

    return <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-white border p-2 rounded-lg w-full pl-10"
        ref={ref}
    />
});