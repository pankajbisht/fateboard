export const Input = ({ value, onChange, placeholder }) => (
    <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="bg-white border p-2 rounded-lg w-full"
    />
);
