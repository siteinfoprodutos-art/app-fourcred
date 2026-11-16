/**
 * Utility input masks for Brazilian financial documents and contacts
 */

export const maskCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

export const maskPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const maskCurrency = (value: number | string): string => {
  if (value === '' || value === undefined || value === null) return '';
  const num = typeof value === 'number' ? value : parseFloat(value) || 0;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Formats a numeric value (e.g. 450000) for controlled currency masked inputs (e.g. "450.000,00").
 * Returns empty string for 0 or empty values so placeholder "0,00" is shown cleanly.
 */
export const formatCurrencyInput = (value: number | string | undefined | null): string => {
  if (value === '' || value === undefined || value === null) return '';
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num) || num <= 0) return '';
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Parses an ATM-style masked currency string (right-to-left cents) into a clean numeric value (or '' when empty/0).
 */
export const parseCurrencyInput = (raw: string): number | '' => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Cap at 12 digits (up to 9.999.999.999,99) to prevent Number overflow
  const clamped = digits.slice(0, 12);
  const num = parseInt(clamped, 10) / 100;
  return num <= 0 ? '' : num;
};

/**
 * Formats a numeric value as "R$ 450.000,00"
 */
export const formatCurrencyBRL = (value: number | string | undefined | null): string => {
  const num = Number(value || 0);
  return 'R$ ' + (isNaN(num) ? 0 : num).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

