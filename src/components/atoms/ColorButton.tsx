export const ColorButton = ({ color, isSelected, onClick, onChange }) => {
    return (
      <button
        type="button"
        title={color}
        className={`w-6 h-6 rounded-full cursor-pointer border-2 flex-shrink-0 ${
          isSelected ? "border-gray-700" : "border-transparent"
        }`}
        style={{ backgroundColor: color }}
        onClick={onClick}
        onChange={onChange}
      />
    );
  };
