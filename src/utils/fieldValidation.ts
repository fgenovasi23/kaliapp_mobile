const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\d{10}$/;
const TAX_CODE_PATTERN = /^[A-Z]{6}\d{2}[ABCDEHLMPRST]\d{2}[A-Z]\d{3}[A-Z]$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.trim());
}

export function isValidTaxCode(value: string): boolean {
  const taxCode = value.trim().toUpperCase();
  if (!taxCode) return true;
  if (!TAX_CODE_PATTERN.test(taxCode)) return false;
  const day = Number(taxCode.slice(9, 11));
  return (day >= 1 && day <= 31) || (day >= 41 && day <= 71);
}

export function sanitizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function isValidBirthDate(value: string): boolean {
  if (!value.trim()) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}