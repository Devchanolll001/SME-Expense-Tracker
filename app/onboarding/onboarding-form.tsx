"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/app/auth/_components/submit-button";
import {
  DEFAULT_BUSINESS_CURRENCY,
  SUPPORTED_BUSINESS_CURRENCIES,
} from "@/lib/business/constants";
import { createBusiness, type OnboardingFormState } from "./actions";

const initialState: OnboardingFormState = {
  fields: {
    businessAddress: "",
    businessEmail: "",
    businessName: "",
    businessPhone: "",
    businessType: "",
    currency: DEFAULT_BUSINESS_CURRENCY,
  },
  status: "idle",
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

function inputClasses(hasError: boolean) {
  return [
    "w-full rounded-xl border px-4 py-3 text-slate-900 shadow-sm transition duration-150 ease-out placeholder:text-slate-400",
    "focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-100",
    "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500",
    hasError
      ? "border-red-300 bg-red-50 text-red-900 placeholder:text-red-300"
      : "border-slate-300 bg-white",
  ].join(" ");
}

export function OnboardingForm() {
  const [state, formAction] = useActionState(createBusiness, initialState);
  const errors = state.errors ?? {};

  return (
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
          htmlFor="businessName"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Business name <span aria-hidden="true">*</span>
        </label>
        <input
          id="businessName"
          name="businessName"
          type="text"
          required
          maxLength={120}
          autoComplete="organization"
          defaultValue={state.fields.businessName}
          aria-invalid={Boolean(errors.businessName)}
          aria-describedby={
            errors.businessName ? "businessName-error" : undefined
          }
          className={inputClasses(Boolean(errors.businessName))}
        />
        <FieldError id="businessName-error" errors={errors.businessName} />
      </div>

      <div>
        <label
          htmlFor="businessType"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Business type
        </label>
        <input
          id="businessType"
          name="businessType"
          type="text"
          maxLength={80}
          defaultValue={state.fields.businessType}
          aria-invalid={Boolean(errors.businessType)}
          aria-describedby={
            errors.businessType ? "businessType-error" : undefined
          }
          className={inputClasses(Boolean(errors.businessType))}
        />
        <FieldError id="businessType-error" errors={errors.businessType} />
      </div>

      <div>
        <label
          htmlFor="businessEmail"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Business email
        </label>
        <input
          id="businessEmail"
          name="businessEmail"
          type="email"
          maxLength={254}
          autoComplete="email"
          defaultValue={state.fields.businessEmail}
          aria-invalid={Boolean(errors.businessEmail)}
          aria-describedby={
            errors.businessEmail ? "businessEmail-error" : undefined
          }
          className={inputClasses(Boolean(errors.businessEmail))}
        />
        <FieldError id="businessEmail-error" errors={errors.businessEmail} />
      </div>

      <div>
        <label
          htmlFor="businessPhone"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Phone
        </label>
        <input
          id="businessPhone"
          name="businessPhone"
          type="tel"
          maxLength={32}
          autoComplete="tel"
          defaultValue={state.fields.businessPhone}
          aria-invalid={Boolean(errors.businessPhone)}
          aria-describedby={
            errors.businessPhone ? "businessPhone-error" : undefined
          }
          className={inputClasses(Boolean(errors.businessPhone))}
        />
        <FieldError id="businessPhone-error" errors={errors.businessPhone} />
      </div>

      <div>
        <label
          htmlFor="businessAddress"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Address
        </label>
        <textarea
          id="businessAddress"
          name="businessAddress"
          rows={3}
          maxLength={240}
          autoComplete="street-address"
          defaultValue={state.fields.businessAddress}
          aria-invalid={Boolean(errors.businessAddress)}
          aria-describedby={
            errors.businessAddress ? "businessAddress-error" : undefined
          }
          className={inputClasses(Boolean(errors.businessAddress))}
        />
        <FieldError
          id="businessAddress-error"
          errors={errors.businessAddress}
        />
      </div>

      <div>
        <label
          htmlFor="currency"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Currency
        </label>
        <select
          id="currency"
          name="currency"
          defaultValue={state.fields.currency || DEFAULT_BUSINESS_CURRENCY}
          aria-invalid={Boolean(errors.currency)}
          aria-describedby={errors.currency ? "currency-error" : undefined}
          className={inputClasses(Boolean(errors.currency))}
        >
          {SUPPORTED_BUSINESS_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        <FieldError id="currency-error" errors={errors.currency} />
      </div>

      <SubmitButton pendingText="Creating business...">Continue</SubmitButton>
    </form>
  );
}
