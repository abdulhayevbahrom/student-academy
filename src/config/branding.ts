export type Brand = {
  name: string;
  logoUrl: string;
  subtitle: string;
  receiptFooter?: string;
};

export type BrandingSettings = {
  unify: Brand;
  accounting?: Brand;
  updatedAt?: string;
};

export const UNIFY_BRAND: Brand = {
  name: import.meta.env.VITE_UNIFY_BRAND_NAME?.trim() || 'Unify',
  logoUrl: import.meta.env.VITE_UNIFY_LOGO_URL?.trim() || '',
  subtitle: import.meta.env.VITE_UNIFY_BRAND_SUBTITLE?.trim() || 'Boshqaruv tizimi',
  receiptFooter: "To'lovingiz uchun rahmat",
};

export const SUPPORT_CONTACT = {
  phone: import.meta.env.VITE_SUPPORT_PHONE?.trim() || '',
  telegram: import.meta.env.VITE_SUPPORT_TELEGRAM?.trim() || '',
};
