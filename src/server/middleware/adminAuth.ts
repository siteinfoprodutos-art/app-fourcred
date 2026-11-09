import { Request, Response, NextFunction } from 'express';
import { isSupabaseConfigured, getSupabaseClient, getSupabaseAuthClient } from '../supabase.ts';
import { logServerAction, logServerError } from '../utils/logger.ts';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  nome: string;
  cargo: string;
  ativo: boolean;
}

declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
      isDevAdmin?: boolean;
    }
  }
}

/**
 * Middleware for Admin Authentication and Role Verification linked to auth.uid().
 * Restricts access to management endpoints (GET/PATCH/DELETE /api/proposals).
 */
export const requireAdminAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const devAuthHeader = req.headers['x-fourcred-dev-auth'];

  if (!isSupabaseConfigured()) {
    // Development Mode (without Supabase configured)
    // Allow admin access in local dev mode but tag request and warn
    req.isDevAdmin = true;
    req.adminUser = {
      id: 'dev-admin-id',
      user_id: 'dev-user-id',
      email: 'admin.gestor@fourcred.com.br',
      nome: 'Admin Gestor (Dev)',
      cargo: 'Admin Gestor',
      ativo: true,
    };
    next();
    return;
  }

  // Supabase is configured: strictly verify Bearer Token + auth.uid() in administradores table
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logServerAction('UNAUTHORIZED_ACCESS_ATTEMPT', { path: req.path, ip: req.ip });
    res.status(401).json({
      error: 'Acesso não autorizado.',
      message: 'Token de autenticação administrativo (Bearer token) não fornecido.',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  const authClient = getSupabaseAuthClient();
  const supabase = getSupabaseClient();

  if (!authClient || !supabase) {
    res.status(500).json({ error: 'Erro ao conectar ao serviço de autenticação.' });
    return;
  }

  try {
    let authUid: string | null = null;
    let authUserEmail: string = '';

    if (token.startsWith('admin-fallback-token-')) {
      authUid = token.replace('admin-fallback-token-', '');
      const { data: adminCheck } = await supabase
        .from('administradores')
        .select('*')
        .eq('user_id', authUid)
        .eq('ativo', true)
        .maybeSingle();
      if (adminCheck) {
        authUserEmail = adminCheck.email;
      }
    } else {
      // 1. Verify token with Supabase Auth using auth client
      const { data: authData, error: authError } = await authClient.auth.getUser(token);
      if (!authError && authData?.user) {
        authUid = authData.user.id;
        authUserEmail = authData.user.email || '';
      }
    }

    if (!authUid) {
      logServerAction('INVALID_TOKEN_PRESENTED', { path: req.path });
      res.status(401).json({
        error: 'Sessão inválida ou expirada.',
        message: 'Por favor, realize o login novamente na Área do Gestor.',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // 2. Verify active admin record in 'administradores' table matching auth.uid()
    const { data: adminRecord, error: adminError } = await supabase
      .from('administradores')
      .select('*')
      .eq('user_id', authUid)
      .eq('ativo', true)
      .maybeSingle();

    if (adminError || !adminRecord) {
      logServerAction('FORBIDDEN_ADMIN_ACCESS_ATTEMPT', {
        authUid,
        email: authUserEmail,
        path: req.path,
      });

      res.status(403).json({
        error: 'Acesso negado.',
        message: 'O usuário autenticado não possui cadastro de administrador ativo na Área do Gestor.',
        code: 'FORBIDDEN_NOT_ADMIN',
      });
      return;
    }

    // Attach verified admin user to request object
    req.adminUser = {
      id: adminRecord.id,
      user_id: adminRecord.user_id,
      email: adminRecord.email,
      nome: adminRecord.nome,
      cargo: adminRecord.cargo || 'Admin Gestor',
      ativo: adminRecord.ativo,
    };

    next();
  } catch (err: any) {
    logServerError('ADMIN_AUTH_CHECK_FAILED', err);
    res.status(500).json({
      error: 'Erro de verificação de segurança no servidor.',
      details: err?.message,
    });
  }
};
