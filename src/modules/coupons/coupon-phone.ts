export const normalizeCouponPhone = (phone: string) =>
  String(phone || "").replace(/\D/g, "");
