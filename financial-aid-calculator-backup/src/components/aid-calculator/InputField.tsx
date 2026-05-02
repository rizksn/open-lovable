import type { ChangeEvent } from "react";
import type { InputFieldProps, InputValue } from "./types";

export function InputField({
  label,
  name,
  value,
  type = "text",
  options = [],
  helperText,
  onChange,
}: InputFieldProps) {
  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    let nextValue: InputValue = event.target.value;

    if (type === "number") {
      nextValue = Number(event.target.value);
    }

    if (type === "checkbox" && event.target instanceof HTMLInputElement) {
      nextValue = event.target.checked;
    }

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

  if (type === "checkbox") {
    return (
      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={handleChange}
          className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 accent-cyan-300"
        />
        <span>
          <span className="block text-sm font-medium text-slate-200">
            {label}
          </span>
          {helperText ? (
            <span className="mt-1 block text-xs text-slate-400">
              {helperText}
            </span>
          ) : null}
        </span>
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
        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-cyan-300/60 focus:bg-white/[0.08]"
      />
      {helperText ? (
        <p className="text-xs text-slate-400">{helperText}</p>
      ) : null}
    </label>
  );
}
