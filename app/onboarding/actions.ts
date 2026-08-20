"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isValidEmail } from "@/lib/auth/validation";
import { AUTHENTICATED_HOME, ONBOARDING_ROUTE } from "@/lib/auth/routes";
import {
  DEFAULT_BUSINESS_CURRENCY,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  SUPPORTED_BUSINESS_CURRENCIES,
  type SupportedBusinessCurrency,
} from "@/lib/business/constants";
import { getOwnedBusinessesForUser } from "@/lib/business/access";
import { createClient } from "@/lib/supabase/server";

type OnboardingFieldName =
  | "businessName"
  | "businessType"
  | "businessEmail"
  | "businessPhone"
  | "businessAddress"
  | "currency";

type OnboardingFields = Record<OnboardingFieldName, string>;

type OnboardingFieldErrors = Partial<Record<OnboardingFieldName, string[]>>;

export type OnboardingFormState = {
  errors?: OnboardingFieldErrors;
  fields: OnboardingFields;
  message?: string;
  status: "idle" | "error";
};

type ValidationResult =
  | {
      data: {
        businessAddress: string | null;
        businessEmail: string | null;
        businessName: string;
        businessPhone: string | null;
        businessType: string | null;
        currency: SupportedBusinessCurrency;
      };
      fields: OnboardingFields;
      ok: true;
    }
  | {
      errors: OnboardingFieldErrors;
      fields: OnboardingFields;
      ok: false;
    };

const MAX_BUSINESS_NAME_LENGTH = 120;
const MAX_BUSINESS_TYPE_LENGTH = 80;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 32;
const MAX_ADDRESS_LENGTH = 240;
const PHONE_PATTERN = /^[+\d][+\d\s().-]{5,31}$/;

function getFormString(formData: FormData, name: OnboardingFieldName) {
  return String(formData.get(name) ?? "").trim();
}

function addFieldError(
  errors: OnboardingFieldErrors,
  field: OnboardingFieldName,
  message: string,
) {
  errors[field] = [...(errors[field] ?? []), message];
}

function isSupportedCurrency(value: string): value is SupportedBusinessCurrency {
  return SUPPORTED_BUSINESS_CURRENCIES.some((currency) => currency === value);
}

function validateOptionalMaxLength(
  errors: OnboardingFieldErrors,
  field: OnboardingFieldName,
  label: string,
  value: string,
  maxLength: number,
) {
  if (value.length > maxLength) {
    addFieldError(errors, field, `${label} must be ${maxLength} characters or fewer.`);
  }
}

function validateBusinessForm(formData: FormData): ValidationResult {
  const fields: OnboardingFields = {
    businessAddress: getFormString(formData, "businessAddress"),
    businessEmail: getFormString(formData, "businessEmail"),
    businessName: getFormString(formData, "businessName"),
    businessPhone: getFormString(formData, "businessPhone"),
    businessType: getFormString(formData, "businessType"),
    currency: getFormString(formData, "currency") || DEFAULT_BUSINESS_CURRENCY,
  };
  const errors: OnboardingFieldErrors = {};
  const supportedCurrency = isSupportedCurrency(fields.currency)
    ? fields.currency
    : null;

  if (!fields.businessName) {
    addFieldError(errors, "businessName", "Business name is required.");
  } else if (fields.businessName.length > MAX_BUSINESS_NAME_LENGTH) {
    addFieldError(
      errors,
      "businessName",
      `Business name must be ${MAX_BUSINESS_NAME_LENGTH} characters or fewer.`,
    );
  }

  validateOptionalMaxLength(
    errors,
    "businessType",
    "Business type",
    fields.businessType,
    MAX_BUSINESS_TYPE_LENGTH,
  );

  if (fields.businessEmail) {
    if (fields.businessEmail.length > MAX_EMAIL_LENGTH) {
      addFieldError(
        errors,
        "businessEmail",
        `Business email must be ${MAX_EMAIL_LENGTH} characters or fewer.`,
      );
    } else if (!isValidEmail(fields.businessEmail)) {
      addFieldError(
        errors,
        "businessEmail",
        "Please enter a valid business email address.",
      );
    }
  }

  if (fields.businessPhone) {
    if (fields.businessPhone.length > MAX_PHONE_LENGTH) {
      addFieldError(
        errors,
        "businessPhone",
        `Business phone must be ${MAX_PHONE_LENGTH} characters or fewer.`,
      );
    } else if (!PHONE_PATTERN.test(fields.businessPhone)) {
      addFieldError(
        errors,
        "businessPhone",
        "Please enter a valid business phone number.",
      );
    }
  }

  validateOptionalMaxLength(
    errors,
    "businessAddress",
    "Business address",
    fields.businessAddress,
    MAX_ADDRESS_LENGTH,
  );

  if (!supportedCurrency) {
    addFieldError(errors, "currency", "Please select a supported currency.");
  }

  if (Object.keys(errors).length > 0 || !supportedCurrency) {
    return {
      errors,
      fields,
      ok: false,
    };
  }

  return {
    data: {
      businessAddress: fields.businessAddress || null,
      businessEmail: fields.businessEmail.toLowerCase() || null,
      businessName: fields.businessName,
      businessPhone: fields.businessPhone || null,
      businessType: fields.businessType || null,
      currency: supportedCurrency,
    },
    fields,
    ok: true,
  };
}

function getErrorState(
  fields: OnboardingFields,
  message: string,
  errors?: OnboardingFieldErrors,
): OnboardingFormState {
  return {
    errors,
    fields,
    message,
    status: "error",
  };
}

async function verifyDefaultCategories(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
) {
  const { data, error } = await supabase
    .from("categories")
    .select("name, type")
    .eq("business_id", businessId);

  if (error) {
    return false;
  }

  const categoryKeys = new Set(
    ((data ?? []) as { name: string; type: string }[]).map(
      (category) => `${category.type}:${category.name.toLowerCase()}`,
    ),
  );

  return (
    DEFAULT_EXPENSE_CATEGORIES.every((name) =>
      categoryKeys.has(`expense:${name.toLowerCase()}`),
    ) &&
    DEFAULT_INCOME_CATEGORIES.every((name) =>
      categoryKeys.has(`income:${name.toLowerCase()}`),
    )
  );
}

export async function createBusiness(
  previousState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  void previousState;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        ONBOARDING_ROUTE,
      )}&error=Please%20sign%20in%20to%20set%20up%20your%20business.`,
    );
  }

  const validation = validateBusinessForm(formData);

  if (!validation.ok) {
    return getErrorState(
      validation.fields,
      "Please fix the highlighted fields.",
      validation.errors,
    );
  }

  const { businesses, error: existingBusinessError } =
    await getOwnedBusinessesForUser(supabase, user.id);

  if (existingBusinessError) {
    return getErrorState(
      validation.fields,
      "We couldn't check your existing business setup. Please try again.",
    );
  }

  if (businesses.length > 0) {
    return getErrorState(
      validation.fields,
      "This account already has a business. Continue to the dashboard.",
    );
  }

  const { data: business, error: createBusinessError } = await supabase
    .from("businesses")
    .insert({
      address: validation.data.businessAddress,
      business_name: validation.data.businessName,
      business_type: validation.data.businessType,
      currency: validation.data.currency,
      email: validation.data.businessEmail,
      owner_id: user.id,
      phone: validation.data.businessPhone,
    })
    .select("id")
    .single();

  if (createBusinessError) {
    const message =
      createBusinessError.code === "23505"
        ? "This account already has a business. Continue to the dashboard."
        : "We couldn't create your business right now. Please try again.";

    return getErrorState(validation.fields, message);
  }

  const businessId = (business as { id?: string } | null)?.id;

  if (!businessId) {
    return getErrorState(
      validation.fields,
      "Your business could not be confirmed. Please try again.",
    );
  }

  const defaultCategoriesCreated = await verifyDefaultCategories(
    supabase,
    businessId,
  );

  if (!defaultCategoriesCreated) {
    return getErrorState(
      validation.fields,
      "Your business was created, but the default categories could not be verified.",
    );
  }

  revalidatePath(AUTHENTICATED_HOME);
  revalidatePath(ONBOARDING_ROUTE);
  redirect(AUTHENTICATED_HOME);
}
