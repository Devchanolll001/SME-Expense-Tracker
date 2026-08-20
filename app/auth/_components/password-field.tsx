"use client";

import { useState } from "react";

type PasswordFieldProps = {
  autoComplete: string;
  helperText?: string;
  id: string;
  label: string;
  minLength?: number;
  name: string;
  placeholder: string;
};

export function PasswordField({
  autoComplete,
  helperText,
  id,
  label,
  minLength,
  name,
  placeholder,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full rounded-lg border border-slate-200 px-4 py-3 pr-20 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />

        <button
          type="button"
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </div>

      {helperText && <p className="mt-2 text-xs text-slate-400">{helperText}</p>}
    </div>
  );
}
