const Toggle = ({ checked, onClick }) => {
    return (
        <>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={onClick}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out
            ${checked ? 'bg-indigo-500' : 'bg-gray-300'}`}
            >
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
              ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </button>
        </>
    );
};

export default Toggle;
