import { ValidationError } from "@/core/errors";

export const UNPACK_QUANTITY_MIN = 1;
export const UNPACK_QUANTITY_MAX = 500;

export function assertUnpackQuantity(quantity: number): void {
  if (
    !Number.isInteger(quantity)
    || quantity < UNPACK_QUANTITY_MIN
    || quantity > UNPACK_QUANTITY_MAX
  ) {
    throw new ValidationError(
      `Quantity must be an integer between ${UNPACK_QUANTITY_MIN} and ${UNPACK_QUANTITY_MAX}`,
    );
  }
}
