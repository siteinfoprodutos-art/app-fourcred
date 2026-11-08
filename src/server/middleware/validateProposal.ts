import { Request, Response, NextFunction } from 'express';
import { isValidCPF, isValidEmail, isValidPhone } from '../../utils/validation.ts';
import { maskCPFForLog, logServerAction } from '../utils/logger.ts';

export const validateProposalSubmission = (req: Request, res: Response, next: NextFunction) => {
  const body = req.body;
  const payload = body?.payload || body;
  const p1 = payload?.p1;
  const fieldErrors: Record<string, string> = {};

  if (!p1 || typeof p1 !== 'object') {
    res.status(400).json({
      error: 'Dados do proponente principal ausentes.',
      details: { p1: 'Objeto p1 é obrigatório' },
      code: 'INVALID_INPUT',
    });
    return;
  }

  // 1. Proponente 1 Validation
  if (!p1.fullName || typeof p1.fullName !== 'string' || p1.fullName.trim().length < 3) {
    fieldErrors['p1.fullName'] = 'Nome completo é obrigatório e deve ter no mínimo 3 caracteres.';
  } else if (p1.fullName.trim().split(/\s+/).length < 2) {
    fieldErrors['p1.fullName'] = 'Informe o nome e sobrenome completos.';
  }

  if (!p1.cpf || typeof p1.cpf !== 'string') {
    fieldErrors['p1.cpf'] = 'CPF é obrigatório.';
  } else if (!isValidCPF(p1.cpf)) {
    fieldErrors['p1.cpf'] = 'CPF inválido. Verifique os dígitos.';
  }

  if (!p1.rg || typeof p1.rg !== 'string' || !p1.rg.trim()) {
    fieldErrors['p1.rg'] = 'RG é obrigatório.';
  }

  if (!p1.dob || typeof p1.dob !== 'string') {
    fieldErrors['p1.dob'] = 'Data de nascimento é obrigatória.';
  }

  if (!p1.email || typeof p1.email !== 'string') {
    fieldErrors['p1.email'] = 'Email principal é obrigatório.';
  } else if (!isValidEmail(p1.email)) {
    fieldErrors['p1.email'] = 'Formato de email inválido.';
  }

  if (!p1.phoneMobile || typeof p1.phoneMobile !== 'string') {
    fieldErrors['p1.phoneMobile'] = 'Celular é obrigatório.';
  } else if (!isValidPhone(p1.phoneMobile)) {
    fieldErrors['p1.phoneMobile'] = 'Celular deve conter DDD e 9 dígitos.';
  }

  if (!p1.profession || typeof p1.profession !== 'string' || !p1.profession.trim()) {
    fieldErrors['p1.profession'] = 'Profissão atual é obrigatória.';
  }

  if (!p1.serviceTime || typeof p1.serviceTime !== 'string' || !p1.serviceTime.trim()) {
    fieldErrors['p1.serviceTime'] = 'Tempo de FGTS é obrigatório.';
  }

  if (p1.salary === undefined || p1.salary === null || Number(p1.salary) <= 0) {
    fieldErrors['p1.salary'] = 'Renda mensal familiar bruta deve ser superior a R$ 0,00.';
  }

  // 2. Co-proponente Validation (if hasP2 === true)
  if (payload.hasP2) {
    const p2 = payload.p2;
    if (!p2 || typeof p2 !== 'object') {
      fieldErrors['p2'] = 'Informações do segundo proponente são obrigatórias quando ativado.';
    } else {
      if (!p2.fullName || typeof p2.fullName !== 'string' || p2.fullName.trim().length < 3) {
        fieldErrors['p2.fullName'] = 'Nome do segundo proponente é obrigatório.';
      }
      if (!p2.cpf || !isValidCPF(p2.cpf)) {
        fieldErrors['p2.cpf'] = 'CPF do segundo proponente é inválido.';
      }
      if (!p2.email || !isValidEmail(p2.email)) {
        fieldErrors['p2.email'] = 'Email do segundo proponente é inválido.';
      }
      if (!p2.phoneMobile || !isValidPhone(p2.phoneMobile)) {
        fieldErrors['p2.phoneMobile'] = 'Celular do segundo proponente é inválido.';
      }
      if (!p2.salary || Number(p2.salary) <= 0) {
        fieldErrors['p2.salary'] = 'Renda do segundo proponente é obrigatória.';
      }
    }
  }

  // 3. Imóvel e Operação Financeira Validation
  if (!payload.targetPropertyAddress || typeof payload.targetPropertyAddress !== 'string' || !payload.targetPropertyAddress.trim()) {
    fieldErrors['targetPropertyAddress'] = 'Endereço completo do imóvel pretendido é obrigatório.';
  }

  const saleValue = Number(payload.saleValue) || 0;
  const downPayment = Number(payload.downPayment) || 0;
  const financingValue = Number(payload.financingValue) || 0;

  if (saleValue <= 0) {
    fieldErrors['saleValue'] = 'Valor de venda/avaliação deve ser maior que zero.';
  }

  if (downPayment <= 0) {
    fieldErrors['downPayment'] = 'Valor da entrada é obrigatório.';
  } else if (downPayment >= saleValue && saleValue > 0) {
    fieldErrors['downPayment'] = 'A entrada deve ser inferior ao valor total do imóvel.';
  }

  if (financingValue <= 0) {
    fieldErrors['financingValue'] = 'Valor a ser financiado é obrigatório.';
  } else if (saleValue > 0 && financingValue > saleValue * 0.95) {
    fieldErrors['financingValue'] = 'O valor financiado excede os limites operacionais permitidos.';
  }

  const termYears = Number(payload.termYears) || 0;
  if (termYears < 1 || termYears > 35) {
    fieldErrors['termYears'] = 'Prazo deve ser de 1 a 35 anos.';
  }

  if (!payload.acceptedTerms) {
    fieldErrors['acceptedTerms'] = 'É necessário declarar que as informações são exatas e aceitar os termos.';
  }

  // If any errors exist, return 400 Bad Request
  if (Object.keys(fieldErrors).length > 0) {
    logServerAction('VALIDATION_FAILED', {
      cpf: maskCPFForLog(p1.cpf),
      errorsCount: Object.keys(fieldErrors).length,
    });

    res.status(400).json({
      error: 'Falha de validação nos dados da proposta.',
      details: fieldErrors,
      code: 'VALIDATION_ERROR',
    });
    return;
  }

  next();
};
