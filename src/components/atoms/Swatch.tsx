type SwatchProp = {
  bgColor: string;
  isActive?: boolean;
  onClick?: () => void;
};

export const Swatch = ({
  bgColor,
  isActive = false,
  onClick,
}: SwatchProp) => {

  return (
    <div
      onClick={onClick}
      className={`relative ${bgColor} w-8 h-5 ml-px mb-px border border-stone-300 cursor-pointer`}
    >
      {isActive && (
        <span
          className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-white"
          style={{
            boxShadow: "0 0 0 1px #000",
          }}
        />
      )}
    </div>
  );
};
