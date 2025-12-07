export const Select = ({ options, value, onChange }) => {
    return (
      <div className="relative inline-block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full appearance-none rounded-full border border-gray-300
            bg-white px-3 py-[2px] pr-8 text-sm shadow-sm
            focus:border-blue-500 focus:ring-2 focus:ring-blue-400 focus:outline-none
            hover:border-gray-400 transition
          "
        >
          {options.map((option) => (
            <option key={option} value={option} style={{ fontFamily: option }}>
              {option}
            </option>
          ))}
        </select>

        {/* Custom arrow */}
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500">
          ▼
        </div>
      </div>
    );
};
