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
      "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-400",
    primary:
      "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-400",
    secondary:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400",
  }[variant];

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={`w-full rounded-lg px-4 py-3.5 font-semibold transition ${classes}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
