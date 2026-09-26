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

export function staffAmendmentNotice(packageCode: string, amendment: string) {
  const clean = amendment.replace(/\s+/g, " ").trim();
  const clipped = clean.length > 120 ? `${clean.slice(0, 119)}…` : clean;
  return `Customer sent amendments for package ${packageCode}. Complete the packaging. ${clipped}`;
}

export function staffSilenceNotice(packageCode: string) {
  return `No customer response within 24 hours for package ${packageCode}. Complete the packaging.`;
}

export function staffConfirmationNotice(packageCode: string) {
  return `Customer confirmed package ${packageCode} is correct. Complete the packaging.`;
}
