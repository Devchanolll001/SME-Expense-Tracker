"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SubmitButton } from "@/app/auth/_components/submit-button";
import type { CategoryFormState } from "@/app/categories/actions";
import { CATEGORY_TYPES } from "@/lib/categories/constants";

type CategoryAction = (
  state: CategoryFormState,
  formData: FormData,
) => Promise<CategoryFormState>;

type CategoryFormProps = {
  action: CategoryAction;
  cancelHref?: string;
  initialState: CategoryFormState;
  pendingText: string;
  submitText: string;
  title: string;
};

type FieldErrorProps = {
  errors?: string[];
  id: string;
};

function FieldError({ errors, id }: FieldErrorProps) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p id={id} className="mt-2 text-sm text-red-600">
      {errors.join(" ")}
    </p>
  );
}

function fieldClasses(hasError: boolean) {
  return [
    "w-full rounded-lg border px-4 py-3 outline-none transition",
    "focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100",
    hasError ? "border-red-300 bg-red-50" : "border-slate-200 bg-white",
  ].join(" ");
}

export function CategoryForm({
  action,
  cancelHref = "/categories",
  initialState,
  pendingText,
  submitText,
  title,
}: CategoryFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const errors = state.errors ?? {};

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Categories keep income and expenses organized across transactions.
        </p>
      </div>

      <form action={formAction} className="space-y-5">
        {state.message && (
          <div
            className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {state.message}
          </div>
        )}

        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={80}
            autoComplete="off"
            placeholder="Advertising"
            defaultValue={state.fields.name}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={fieldClasses(Boolean(errors.name))}
          />
          <FieldError id="name-error" errors={errors.name} />
        </div>

        <div>
          <label
            htmlFor="type"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={state.fields.type}
            aria-invalid={Boolean(errors.type)}
            aria-describedby={errors.type ? "type-error" : undefined}
            className={fieldClasses(Boolean(errors.type))}
          >
            {CATEGORY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <FieldError id="type-error" errors={errors.type} />
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={240}
            placeholder="Online advertising costs"
            defaultValue={state.fields.description}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "description-error" : undefined
            }
            className={fieldClasses(Boolean(errors.description))}
          />
          <FieldError id="description-error" errors={errors.description} />
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={cancelHref}
            className="rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>
          <div className="sm:w-48">
            <SubmitButton pendingText={pendingText}>{submitText}</SubmitButton>
          </div>
        </div>
      </form>
    </section>
  );
}
