"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/app/auth/_components/submit-button";
import type { TransactionFormState } from "@/app/transactions/actions";
import { getCategoriesForTransactionType } from "@/lib/categories/constants";
import { formatCurrency } from "@/lib/finance/currency";
import {
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
  type TransactionType,
} from "@/lib/transactions/constants";
import type { TransactionCategory } from "@/lib/transactions/data";

type TransactionAction = (
  state: TransactionFormState,
  formData: FormData,
) => Promise<TransactionFormState>;

type TransactionFormProps = {
  action: TransactionAction;
  cancelHref?: string;
  categories: TransactionCategory[];
  currency: string;
  initialState: TransactionFormState;
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

export function TransactionForm({
  action,
  cancelHref = "/transactions",
  categories,
  currency,
  initialState,
  pendingText,
  submitText,
  title,
}: TransactionFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [selectedType, setSelectedType] = useState<TransactionType>(
    state.fields.type === "income" ? "income" : "expense",
  );
  const errors = state.errors ?? {};
  const availableCategories = getCategoriesForTransactionType(
    categories,
    selectedType,
  );

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Amounts will be stored in {currency}.
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

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="type"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Transaction type
            </label>
            <select
              id="type"
              name="type"
              defaultValue={state.fields.type}
              onChange={(event) =>
                setSelectedType(event.currentTarget.value as TransactionType)
              }
              aria-invalid={Boolean(errors.type)}
              aria-describedby={errors.type ? "type-error" : undefined}
              className={fieldClasses(Boolean(errors.type))}
            >
              {TRANSACTION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <FieldError id="type-error" errors={errors.type} />
          </div>

          <div>
            <label
              htmlFor="amount"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Amount
            </label>
            <input
              id="amount"
              name="amount"
              type="text"
              required
              inputMode="decimal"
              autoComplete="off"
              placeholder={formatCurrency("50000.00", currency)}
              defaultValue={state.fields.amount}
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? "amount-error" : undefined}
              className={fieldClasses(Boolean(errors.amount))}
            />
            <FieldError id="amount-error" errors={errors.amount} />
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Description
          </label>
          <input
            id="description"
            name="description"
            type="text"
            required
            maxLength={160}
            autoComplete="off"
            placeholder="Office supplies"
            defaultValue={state.fields.description}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description ? "description-error" : undefined
            }
            className={fieldClasses(Boolean(errors.description))}
          />
          <FieldError id="description-error" errors={errors.description} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="categoryId"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Category
            </label>
            <select
              key={selectedType}
              id="categoryId"
              name="categoryId"
              required
              defaultValue={state.fields.categoryId}
              aria-invalid={Boolean(errors.categoryId)}
              aria-describedby={
                errors.categoryId ? "categoryId-error" : undefined
              }
              className={fieldClasses(Boolean(errors.categoryId))}
            >
              <option value="">Choose a category</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError id="categoryId-error" errors={errors.categoryId} />
          </div>

          <div>
            <label
              htmlFor="transactionDate"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Date
            </label>
            <input
              id="transactionDate"
              name="transactionDate"
              type="date"
              required
              defaultValue={state.fields.transactionDate}
              aria-invalid={Boolean(errors.transactionDate)}
              aria-describedby={
                errors.transactionDate ? "transactionDate-error" : undefined
              }
              className={fieldClasses(Boolean(errors.transactionDate))}
            />
            <FieldError
              id="transactionDate-error"
              errors={errors.transactionDate}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="paymentMethod"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Payment method
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            defaultValue={state.fields.paymentMethod}
            aria-invalid={Boolean(errors.paymentMethod)}
            aria-describedby={
              errors.paymentMethod ? "paymentMethod-error" : undefined
            }
            className={fieldClasses(Boolean(errors.paymentMethod))}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
          <FieldError id="paymentMethod-error" errors={errors.paymentMethod} />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="reference"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Reference
            </label>
            <input
              id="reference"
              name="reference"
              type="text"
              maxLength={80}
              autoComplete="off"
              placeholder="INV-001"
              defaultValue={state.fields.reference}
              aria-invalid={Boolean(errors.reference)}
              aria-describedby={
                errors.reference ? "reference-error" : undefined
              }
              className={fieldClasses(Boolean(errors.reference))}
            />
            <FieldError id="reference-error" errors={errors.reference} />
          </div>

          <div>
            <label
              htmlFor="notes"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={500}
              defaultValue={state.fields.notes}
              aria-invalid={Boolean(errors.notes)}
              aria-describedby={errors.notes ? "notes-error" : undefined}
              className={fieldClasses(Boolean(errors.notes))}
            />
            <FieldError id="notes-error" errors={errors.notes} />
          </div>
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
