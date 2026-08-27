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
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-slate-900 shadow-sm placeholder:text-slate-400 transition duration-150 ease-out focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
        />

        <button
          type="button"
          aria-label={isVisible ? "Hide password" : "Show password"}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </div>

      {helperText && <p className="mt-2 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
