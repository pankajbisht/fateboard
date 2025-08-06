const EInputField = ({ label, id, value, onChange }) => (
    <div className="flex justify-between">
      <label className="text-stone-500 text-sm" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={onChange}
        className="border border-stone-500 p-1 w-24 rounded-lg"
      />
    </div>
);

export default EInputField;
