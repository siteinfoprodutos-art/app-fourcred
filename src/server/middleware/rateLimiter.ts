import { Request, Response, NextFunction } from 'express';
import { maskCPFForLog, logServerAction } from '../utils/logger.ts';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

const ipLimits = new Map<string, RateLimitStore>();
const cpfSubmissions = new Map<string, number>();

// Clean up expired IP entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, store] of ipLimits.entries()) {
    if (now > store.resetTime) {
      ipLimits.delete(ip);
    }
  }
  for (const [cpf, timestamp] of cpfSubmissions.entries()) {
    if (now - timestamp > 30000) {
      cpfSubmissions.delete(cpf);
    }
  }
}, 10 * 60 * 1000);

/**
 * Anti-spam and Rate Limiting middleware for public proposal submissions.
 * Max 10 requests per 15 minutes per IP address.
 * Deduplication check: 10s window per CPF.
 */
export const proposalRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  const now = Date.now();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const MAX_REQUESTS = 10;

  // 1. IP Rate Limiting Check
  let store = ipLimits.get(ip);
  if (!store || now > store.resetTime) {
    store = { count: 1, resetTime: now + WINDOW_MS };
    ipLimits.set(ip, store);
  } else {
    store.count += 1;
  }

  if (store.count > MAX_REQUESTS) {
    logServerAction('RATE_LIMIT_EXCEEDED', { ip, count: store.count });
    res.setHeader('Retry-After', Math.ceil((store.resetTime - now) / 1000));
    res.status(429).json({
      error: 'Muitas tentativas de envio.',
      message: 'Limite de propostas excedido para seu endereço IP. Por favor, aguarde alguns minutos.',
      code: 'TOO_MANY_REQUESTS',
    });
    return;
  }

  // 2. Anti-Spam / Deduplication Check by CPF
  const cpf = req.body?.payload?.p1?.cpf || req.body?.p1?.cpf;
  if (cpf) {
    const cleanCpf = cpf.replace(/\D/g, '');
    const lastSubmitTime = cpfSubmissions.get(cleanCpf);

    if (lastSubmitTime && now - lastSubmitTime < 10000) {
      logServerAction('DUPLICATE_SUBMISSION_BLOCKED', { cpf: maskCPFForLog(cpf), ip });
      res.status(429).json({
        error: 'Envio duplicado detectado.',
        message: 'Uma proposta com este CPF já foi recebida recentemente. Aguarde 10 segundos antes de reenviar.',
        code: 'DUPLICATE_SUBMISSION',
      });
      return;
    }

    cpfSubmissions.set(cleanCpf, now);
  }

  next();
};
