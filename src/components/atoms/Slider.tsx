function Slider({
    min,
    max,
    step,
    value,
    onChange,
}: {
    min: number;
    max: number;
    step: number;
    value: number;
    onChange: (v: number) => void;
}) {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className="relative h-1 bg-gray-200 rounded-full">
            <div
                style={{ width: `${percentage}%` }}
                className="
                w-full cursor-pointer appearance-none
                h-1 rounded-full
                bg-gradient-to-r from-indigo-500 to-sky-400

                opacity-80 transition-opacity
                hover:opacity-100

                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:shadow
                [&::-webkit-slider-thumb]:ring-2
                [&::-webkit-slider-thumb]:ring-indigo-500

                [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:w-4
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-white
                [&::-moz-range-thumb]:border-2
                [&::-moz-range-thumb]:border-indigo-500
              "
            />

            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(+e.target.value)}
                className="
          absolute top-0 w-full h-1 cursor-pointer appearance-none bg-transparent
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:w-3
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-blue-500
          [&::-webkit-slider-thumb]:transition-transform
          [&::-webkit-slider-thumb]:duration-150
          hover:[&::-webkit-slider-thumb]:scale-110
          active:[&::-webkit-slider-thumb]:scale-125
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-white
          [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-blue-500
          [&::-moz-range-thumb]:shadow-md
          [&::-moz-range-thumb]:transition-transform
          [&::-moz-range-thumb]:duration-150
          hover:[&::-moz-range-thumb]:scale-110
          active:[&::-moz-range-thumb]:scale-125
        "
            />
        </div>
    );
}

export default Slider;
