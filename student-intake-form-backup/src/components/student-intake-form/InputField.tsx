import type { ChangeEvent } from "react";
import type { InputFieldProps, InputValue } from "./types";

export function InputField({
  label,
  name,
  value,
  type = "text",
  options = [],
  placeholder,
  helperText,
  onChange,
}: InputFieldProps) {
  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const nextValue: InputValue = event.target.value;
    onChange(name, nextValue);
  }

  if (type === "select") {
    return (
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <select
          value={String(value)}
          onChange={handleChange}
          className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white outline-none transition focus:border-cyan-300/60 focus:bg-white/[0.08]"
        >
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              className="bg-neutral-950"
            >
              {option.label}
            </option>
          ))}
        </select>
        {helperText ? (
          <p className="text-xs text-slate-400">{helperText}</p>
        ) : null}
      </label>
    );
  }

  if (type === "textarea") {
    return (
      <label className="block space-y-2 md:col-span-2">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        <textarea
          value={String(value)}
          onChange={handleChange}
          placeholder={placeholder}
          rows={5}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/60 focus:bg-white/[0.08]"
        />
        {helperText ? (
          <p className="text-xs text-slate-400">{helperText}</p>
        ) : null}
      </label>
    );
  }

  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-200">{label}</span>
      <input
        type={type}
        value={String(value)}
        onChange={handleChange}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/60 focus:bg-white/[0.08]"
      />
      {helperText ? (
        <p className="text-xs text-slate-400">{helperText}</p>
      ) : null}
    </label>
  );
}
