import { ForbiddenError } from "@/core/errors";

export const CUSTOMER_CONTACT_FIELDS = [
  "email",
  "phoneNumber",
  "phone",
  "address",
  "countryId",
  "cityId",
] as const;

type ContactAddress = {
  streetAddress?: string | null;
  landmark?: string | null;
  country?: { name?: string | null; [key: string]: unknown } | null;
  city?: { name?: string | null; [key: string]: unknown } | null;
  [key: string]: unknown;
};

type ContactUser = {
  email?: string | null;
  phoneNumber?: string | null;
  addresses?: ContactAddress[] | null;
  [key: string]: unknown;
};

export type ContactRedactableRecord = {
  user?: ContactUser | null;
  [key: string]: unknown;
};

export function redactUserContact(
  user: ContactUser | null | undefined,
  allowContact: boolean,
) {
  if (!user || allowContact) {
    return user;
  }

  return {
    ...user,
    email: null,
    phoneNumber: null,
    addresses: (user.addresses ?? []).map((address) => ({
      ...address,
      streetAddress: null,
      landmark: null,
      country: address.country
        ? { ...address.country, name: null }
        : address.country,
      city: address.city
        ? { ...address.city, name: null }
        : address.city,
    })),
  };
}

export function redactCustomerContact<T extends ContactRedactableRecord>(
  record: T,
  allowContact: boolean,
): T {
  if (allowContact || !record?.user) {
    return record;
  }

  return {
    ...record,
    user: redactUserContact(record.user),
  };
}

export function redactCustomerContactList<T extends ContactRedactableRecord>(
  records: T[],
  allowContact: boolean,
): T[] {
  return records.map((record) => redactCustomerContact(record, allowContact));
}

export function assertCanManageCustomerContact(
  allowContact: boolean,
  data: Record<string, unknown>,
) {
  if (allowContact) {
    return;
  }

  const hasContactField = CUSTOMER_CONTACT_FIELDS.some((field) => {
    const value = data[field];
    return value !== undefined && value !== null && value !== "";
  });

  if (hasContactField) {
    throw new ForbiddenError(
      "Only Super Admin can manage customer contact information",
    );
  }
}
