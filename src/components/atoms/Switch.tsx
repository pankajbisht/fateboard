function Switch({ checked, onCheckedChange }) {
    return (
        <button
            onClick={() => onCheckedChange(!checked)}
            className={`w-11 h-6 rounded-full relative transition ${
                checked ? 'bg-black' : 'bg-gray-300'
            }`}
        >
            <span
                className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
        </button>
    );
}

export default Switch;
