export const normalizeCouponFullName = (name: string) =>
  String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
