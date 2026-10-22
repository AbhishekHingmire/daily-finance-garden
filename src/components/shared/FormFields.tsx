export function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  required,
  min,
  max,
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
  max?: string;
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
        max={max}
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
  compact = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span
        className={
          compact
            ? "block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-0.5 truncate"
            : "wt-label"
        }
      >
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </span>
      <select
        className={
          compact
            ? "wt-field h-8 min-h-0 text-xs px-2.5 py-0 bg-background cursor-pointer"
            : "wt-field cursor-pointer"
        }
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
