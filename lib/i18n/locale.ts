export type Locale = 'ar' | 'en';

export const LOCALES: Locale[] = ['ar', 'en'];
export const DEFAULT_LOCALE: Locale = 'ar';

/** نصّ بلغتين — يُخزَّن مع البيانات نفسها بدل قاموس منفصل يسهل أن يتخلّف عنها */
export interface Localized {
  ar: string;
  en: string;
}

export const tx = (value: Localized, locale: Locale): string => value[locale];

export const LOCALE_META: Record<Locale, { dir: 'rtl' | 'ltr'; label: string; short: string }> = {
  ar: { dir: 'rtl', label: 'العربية', short: 'ع' },
  en: { dir: 'ltr', label: 'English', short: 'EN' },
};

export const LOCALE_STORAGE_KEY = 'mto-locale';

export function parseLocale(value: string | null | undefined): Locale {
  return value === 'en' || value === 'ar' ? value : DEFAULT_LOCALE;
}
