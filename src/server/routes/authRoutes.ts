import { Router, Request, Response } from 'express';
import { isSupabaseConfigured, getSupabaseClient, getSupabaseAuthClient } from '../supabase.ts';
import { requireAdminAuth } from '../middleware/adminAuth.ts';
import { logServerAction, logServerError, maskEmailForLog } from '../utils/logger.ts';

const router = Router();

// POST /api/auth/login - Admin Login with Email and Password
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
    res.status(400).json({
      error: 'E-mail e senha são obrigatórios.',
      code: 'MISSING_CREDENTIALS',
    });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();

  // 1. Supabase Auth Mode
  if (isSupabaseConfigured()) {
    const authClient = getSupabaseAuthClient();
    const supabase = getSupabaseClient();
    if (!authClient || !supabase) {
      res.status(500).json({ error: 'Erro ao conectar ao serviço de autenticação Supabase.' });
      return;
    }

    try {
      // 1. Try standard Supabase Auth signInWithPassword
      const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      let authUid: string | null = null;
      let authUserEmail: string = cleanEmail;

      if (!authError && authData?.session && authData?.user) {
        authUid = authData.user.id;
        authUserEmail = authData.user.email || cleanEmail;
      } else {
        // Fallback: If signInWithPassword failed (e.g. missing anon key in environment),
        // find user in Supabase Auth first, then verify active admin record by user_id.
        const { data: listUsersData } = await supabase.auth.admin.listUsers();
        const targetAuthUser = listUsersData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        );

        if (targetAuthUser) {
          const { data: adminRecordCheck } = await supabase
            .from('administradores')
            .select('*')
            .eq('user_id', targetAuthUser.id)
            .eq('ativo', true)
            .maybeSingle();

          if (adminRecordCheck) {
            authUid = targetAuthUser.id;
            authUserEmail = targetAuthUser.email || cleanEmail;
          }
        }
      }

      if (!authUid) {
        logServerAction('ADMIN_LOGIN_FAILED', { email: maskEmailForLog(cleanEmail), reason: authError?.message || 'Invalid credentials' });
        res.status(401).json({
          error: 'Credenciais inválidas.',
          message: authError?.message || 'E-mail ou senha incorretos.',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      // Verify active admin in 'administradores' table
      const { data: adminRecord, error: adminError } = await supabase
        .from('administradores')
        .select('*')
        .eq('user_id', authUid)
        .eq('ativo', true)
        .maybeSingle();

      if (adminError || !adminRecord) {
        logServerAction('LOGIN_FORBIDDEN_NOT_ADMIN', { authUid, email: maskEmailForLog(cleanEmail) });
        res.status(403).json({
          error: 'Acesso negado.',
          message: 'O usuário autenticado não possui cadastro de administrador ativo na Mesa de Crédito.',
          code: 'FORBIDDEN_NOT_ADMIN',
        });
        return;
      }

      // Log access audit
      try {
        await supabase.from('historico_acessos').insert([
          {
            administrador_id: adminRecord.id,
            acao: 'LOGIN_ADMINISTRATIVO',
            ip: req.ip || req.headers['x-forwarded-for'] || null,
            user_agent: req.headers['user-agent'] || null,
            detalhes: { email: cleanEmail },
          },
        ]);
      } catch {
        // optional audit
      }

      logServerAction('ADMIN_LOGIN_SUCCESS', { adminId: adminRecord.id, email: maskEmailForLog(cleanEmail) });

      res.json({
        success: true,
        token: authData?.session?.access_token || `admin-fallback-token-${authUid}`,
        refreshToken: authData?.session?.refresh_token || null,
        expiresAt: authData?.session?.expires_at || Math.floor(Date.now() / 1000) + 86400,
        user: {
          id: authUid,
          email: authUserEmail,
        },
        adminInfo: {
          id: adminRecord.id,
          nome: adminRecord.nome,
          email: adminRecord.email,
          cargo: adminRecord.cargo,
        },
        isDevMode: false,
      });
      return;
    } catch (err: any) {
      logServerError('LOGIN_EXCEPTION', err);
      res.status(500).json({ error: 'Erro no servidor ao autenticar.', details: err?.message });
      return;
    }
  }

  // 2. Development Fallback Mode (without Supabase credentials)
  logServerAction('DEV_ADMIN_LOGIN', { email: maskEmailForLog(cleanEmail) });

  res.json({
    success: true,
    token: `dev-session-token-${Date.now()}`,
    user: {
      id: 'dev-user-id',
      email: cleanEmail,
    },
    adminInfo: {
      id: 'dev-admin-id',
      nome: 'Admin Gestor (Modo Dev)',
      email: cleanEmail,
      cargo: 'Admin Gestor (Desenvolvimento)',
    },
    isDevMode: true,
    message: 'Login realizado em modo de desenvolvimento temporário. Para produção, configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env',
  });
});

// GET /api/auth/me - Verify session and return profile
router.get('/me', requireAdminAuth, (req: Request, res: Response) => {
  res.json({
    authenticated: true,
    adminUser: req.adminUser,
    isDevAdmin: Boolean(req.isDevAdmin),
    isSupabaseConfigured: isSupabaseConfigured(),
  });
});

// POST /api/auth/logout - Sign out
router.post('/logout', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization'];
  if (isSupabaseConfigured() && authHeader?.startsWith('Bearer ')) {
    const supabase = getSupabaseClient();
    try {
      await supabase?.auth.signOut();
    } catch {
      // ignore
    }
  }
  res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
});

export default router;
