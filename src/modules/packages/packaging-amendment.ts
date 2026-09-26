export const PACKAGING_AMENDMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

export function amendmentDeadlineFrom(releasedAt: Date | string) {
  const released = releasedAt instanceof Date ? releasedAt : new Date(releasedAt);
  return new Date(released.getTime() + PACKAGING_AMENDMENT_WINDOW_MS);
}

export function isAmendmentWindowOpen(
  deadlineAt: Date | string | null | undefined,
  now = new Date(),
) {
  if (!deadlineAt) return true;
  const deadline = deadlineAt instanceof Date ? deadlineAt : new Date(deadlineAt);
  return now.getTime() <= deadline.getTime();
}

export function customerAmendmentNotice(packageCode: string) {
  return `We recorded your packaging video for package ${packageCode}. You have 24 hours to review it and send any amendments.`;
}

const operatorNextStep =
  "Photograph the package with the shipping label on it, then mark fulfillment complete yourself.";

export function staffAmendmentNotice(packageCode: string, amendment: string) {
  const clean = amendment.replace(/\s+/g, " ").trim();
  const clipped = clean.length > 80 ? `${clean.slice(0, 79)}…` : clean;
  return `Package ${packageCode}: customer amendments — ${clipped}. ${operatorNextStep}`;
}

export function staffSilenceNotice(packageCode: string) {
  return `Package ${packageCode}: no customer reply in 24 hours. ${operatorNextStep}`;
}

export function staffConfirmationNotice(packageCode: string) {
  return `Package ${packageCode}: customer confirmed it. ${operatorNextStep}`;
}
