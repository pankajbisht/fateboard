import LabeledInput from "../atoms/LabeledInput";

export const TransformInput = ({ label, value, disabled, onChange }) => {
    console.log(label, value, disabled, onChange)
  const handleChange = (e) => {
    const raw = e; // e.target.value

    // Ensure empty input doesn't force NaN
    if (raw === "") {
      onChange(0);
      return;
    }

    let num = parseInt(raw, 10);
    if (isNaN(num)) num = 0;

    onChange(num == 0 ? "" : num );
  };

  const onKeyDownHandler = (e) => {
    if (e.key === "." || e.key === "e") e.preventDefault();
  };

  return (
    <LabeledInput
      label={label}
      value={value ?? 0}
      onChange={handleChange}
      disabled={disabled}
      onKeyDown={onKeyDownHandler}
    />
  );
};
