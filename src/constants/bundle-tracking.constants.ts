export const BUNDLE_MANUAL_STEP_MIN = 3;
export const BUNDLE_TO_ORDER_STEP_ORDER = 7;
export const BUNDLE_TO_ORDER_STEP_CODE = "bundle_to_order";
export const BUNDLE_MANUAL_STEP_MAX = BUNDLE_TO_ORDER_STEP_ORDER;

/** Orders appear in bundle detail and order tracking after this step is reached. */
export const BUNDLE_ORDERS_VISIBLE_FROM_STEP_ORDER = BUNDLE_TO_ORDER_STEP_ORDER;

export const formatBundleTrackingStepLabel = (
  stepOrder: number,
  label: string,
  code?: string,
) => {
  if (code === BUNDLE_TO_ORDER_STEP_CODE || stepOrder === BUNDLE_TO_ORDER_STEP_ORDER) {
    return `6a. ${label}`;
  }
  return `${stepOrder}. ${label}`;
};
