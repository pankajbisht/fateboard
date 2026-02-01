import Input from '../atoms/Input';

function SearchInput({ value, onChange, ...rest }) {
    return (
        <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search..."
            className="w-full p-2 my-2"
            {...rest}
        />
    );
}

export default SearchInput;
