export default function FormInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  textarea = false,
  min,
}) {
  const sharedClasses =
    "w-full rounded-2xl border border-slate-200 bg-[#faf9fd] px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#6e44ff]/40";

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-600">{label}</span>
      {textarea ? (
        <textarea
          className={`${sharedClasses} min-h-32 resize-y`}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={sharedClasses}
          type={type}
          name={name}
          min={min}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
