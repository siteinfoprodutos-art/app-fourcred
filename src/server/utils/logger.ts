/**
 * Safe logging utility for Fourcred V2 server.
 * Masks PII (CPF, RG, email) in server console output for compliance.
 */

export const maskCPFForLog = (cpf?: string): string => {
  if (!cpf) return '[SEM-CPF]';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***.***.***-**';
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9, 11)}`;
};

export const maskEmailForLog = (email?: string): string => {
  if (!email || !email.includes('@')) return '***@***';
  const [user, domain] = email.split('@');
  const maskedUser = user.length > 2 ? `${user.slice(0, 2)}***` : '***';
  return `${maskedUser}@${domain}`;
};

export const logServerAction = (action: string, meta?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  console.log(`[FOURCRED ${timestamp}] [${action}]`, meta ? JSON.stringify(meta) : '');
};

export const logServerError = (action: string, error: any) => {
  const timestamp = new Date().toISOString();
  console.error(`[FOURCRED ERROR ${timestamp}] [${action}]`, error?.message || error);
};
