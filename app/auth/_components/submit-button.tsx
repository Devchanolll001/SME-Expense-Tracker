"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingText: string;
  variant?: "destructive" | "primary" | "secondary";
};

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const classes = {
    destructive:
      "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed",
    primary:
      "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300 disabled:cursor-not-allowed",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`w-full rounded-xl px-4 py-3.5 font-semibold shadow-sm transition duration-150 ease-out ${classes}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
