export function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  required,
  min,
  step,
  ...props
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  min?: string;
  step?: string;
  autoComplete?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="wt-label">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </span>
      <input
        className="wt-field"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="wt-label">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </span>
      <select
        className="wt-field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
