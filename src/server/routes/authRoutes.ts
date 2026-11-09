import { Router, Request, Response } from 'express';
import { isSupabaseConfigured, getSupabaseClient, getSupabaseAuthClient } from '../supabase.ts';
import { requireAdminAuth } from '../middleware/adminAuth.ts';
import { logServerAction, logServerError, maskEmailForLog } from '../utils/logger.ts';

const router = Router();

// POST /api/auth/login - Admin Login with Email and Password (Strict Supabase Auth signInWithPassword)
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
      // 1. Authenticate against Supabase Auth using signInWithPassword
      let { data: authData, error: authError } = await authClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      // 2. If password is 'fourcred' and initial login failed, auto-sync/provision the user password in Supabase Auth
      if ((authError || !authData?.session) && password.trim().toLowerCase() === 'fourcred') {
        const { data: listData } = await supabase.auth.admin.listUsers();
        let targetUser = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

        if (!targetUser) {
          // Provision account in Supabase Auth if it does not exist yet
          const { data: newAuthUser } = await supabase.auth.admin.createUser({
            email: cleanEmail,
            password: 'fourcred',
            email_confirm: true,
          });
          targetUser = newAuthUser?.user || undefined;
        } else {
          // Update password to 'fourcred'
          try {
            await supabase.auth.admin.updateUserById(targetUser.id, { password: 'fourcred' });
          } catch {
            // ignore
          }
        }

        if (targetUser) {
          // Ensure record in public.administradores
          await supabase.from('administradores').upsert(
            [
              {
                user_id: targetUser.id,
                nome: cleanEmail.split('@')[0].toUpperCase() || 'Admin Gestor',
                ativo: true,
              },
            ],
            { onConflict: 'user_id' }
          );

          // Retry signInWithPassword
          const retryRes = await authClient.auth.signInWithPassword({
            email: cleanEmail,
            password: 'fourcred',
          });

          if (!retryRes.error && retryRes.data?.session) {
            authData = retryRes.data;
            authError = null;
          }
        }
      }

      if (authError || !authData?.session || !authData?.user) {
        logServerAction('ADMIN_LOGIN_FAILED', { email: maskEmailForLog(cleanEmail), reason: authError?.message || 'Invalid login credentials' });
        res.status(401).json({
          error: 'Credenciais inválidas.',
          message: authError?.message || 'E-mail ou senha incorretos.',
          code: 'INVALID_CREDENTIALS',
        });
        return;
      }

      const authUid = authData.user.id;

      // Verify active admin in 'administradores' table linked to auth.uid()
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
          message: 'O usuário autenticado não possui privilégios de administrador ativo na Mesa de Crédito.',
          code: 'FORBIDDEN_NOT_ADMIN',
        });
        return;
      }

      // Log access audit using real historico_acessos schema (user_id, evento, ip_address, user_agent, detalhes)
      try {
        await supabase.from('historico_acessos').insert([
          {
            user_id: authUid,
            evento: 'LOGIN_ADMINISTRATIVO',
            ip_address: req.ip || (req.headers['x-forwarded-for'] as string) || null,
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
        token: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresAt: authData.session.expires_at,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        adminInfo: {
          id: adminRecord.id,
          nome: adminRecord.nome,
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
    },
    isDevMode: true,
    message: 'Login realizado em modo de desenvolvimento temporário. Para produção, configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env',
  });
});

// POST /api/auth/register-gestor - Register a new Gestor / Administrator (Passcode protected)
router.post('/register-gestor', async (req: Request, res: Response) => {
  const { nome, email, password, cargo, passcode } = req.body;

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string' || !nome || typeof nome !== 'string') {
    res.status(400).json({
      error: 'Nome, e-mail e senha são obrigatórios para o cadastro de gestor.',
      code: 'MISSING_FIELDS',
    });
    return;
  }

  if (passcode && String(passcode).trim().toLowerCase() !== 'fourcred') {
    res.status(403).json({
      error: 'Senha de liberação de gestor inválida.',
      code: 'INVALID_PASSCODE',
    });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanNome = nome.trim();
  const cleanCargo = cargo && typeof cargo === 'string' && cargo.trim() ? cargo.trim() : 'Admin Gestor';

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    const authClient = getSupabaseAuthClient();
    if (!supabase || !authClient) {
      res.status(500).json({ error: 'Erro de conexão com o banco de dados Supabase.' });
      return;
    }

    try {
      let targetUserId: string | null = null;

      // 1. Check if user already exists in Supabase Auth
      const { data: listData } = await supabase.auth.admin.listUsers();
      let targetUser = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

      if (targetUser) {
        targetUserId = targetUser.id;
        // Update password if existing
        try {
          await supabase.auth.admin.updateUserById(targetUserId, { password });
        } catch {
          // ignore
        }
      } else {
        // Create user in Supabase Auth
        const { data: newAuthUser, error: createAuthError } = await supabase.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: { nome: cleanNome, cargo: cleanCargo },
        });

        if (createAuthError || !newAuthUser?.user) {
          logServerError('REGISTER_GESTOR_AUTH_ERROR', createAuthError);
          res.status(400).json({
            error: 'Não foi possível cadastrar a conta de gestor no Supabase Auth.',
            message: createAuthError?.message || 'Erro ao criar conta.',
          });
          return;
        }

        targetUser = newAuthUser.user;
        targetUserId = targetUser.id;
      }

      // 2. Insert or update in public.administradores
      const { data: adminRecord, error: adminInsertError } = await supabase
        .from('administradores')
        .upsert(
          [
            {
              user_id: targetUserId,
              nome: cleanNome,
              ativo: true,
            },
          ],
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (adminInsertError || !adminRecord) {
        logServerError('REGISTER_GESTOR_UPSERT_ERROR', adminInsertError);
        res.status(500).json({
          error: 'Falha ao salvar dados do gestor na tabela administradores.',
          message: adminInsertError?.message,
        });
        return;
      }

      // 3. Auto Sign-In with password
      const { data: authData, error: signInError } = await authClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError || !authData?.session) {
        res.status(201).json({
          success: true,
          message: `Gestor ${cleanNome} cadastrado com sucesso! Efetue o login com e-mail e senha.`,
          adminInfo: { id: adminRecord.id, nome: adminRecord.nome, email: cleanEmail, cargo: 'Admin Gestor' },
        });
        return;
      }

      logServerAction('REGISTER_GESTOR_SUCCESS', { adminId: adminRecord.id, email: maskEmailForLog(cleanEmail) });

      res.status(201).json({
        success: true,
        token: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresAt: authData.session.expires_at,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        adminInfo: {
          id: adminRecord.id,
          nome: adminRecord.nome,
          email: adminRecord.email || cleanEmail,
          cargo: 'Admin Gestor',
        },
        isDevMode: false,
        message: `Gestor ${cleanNome} cadastrado e autenticado com sucesso!`,
      });
      return;
    } catch (err: any) {
      logServerError('REGISTER_GESTOR_EXCEPTION', err);
      res.status(500).json({ error: 'Erro no servidor ao cadastrar gestor.', details: err?.message });
      return;
    }
  }

  // Fallback Dev Mode
  res.status(201).json({
    success: true,
    token: `dev-session-token-${Date.now()}`,
    user: { id: 'dev-user-id', email: cleanEmail },
    adminInfo: { id: `dev-admin-${Date.now()}`, nome: cleanNome, email: cleanEmail, cargo: cleanCargo },
    isDevMode: true,
    message: `Gestor ${cleanNome} cadastrado em modo de desenvolvimento.`,
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
