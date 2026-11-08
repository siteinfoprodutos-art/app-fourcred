import { Router, Request, Response } from 'express';
import {
  getAuthenticatedSupabaseClient,
  getSupabaseClient,
  isSupabaseConfigured,
  normalizeStatusForDb,
  normalizeStatusForApp,
  mapRowToProposalRecord,
} from '../supabase.ts';
import { requireAdminAuth } from '../middleware/adminAuth.ts';
import { logServerAction, logServerError } from '../utils/logger.ts';

const router = Router();

// Helper to obtain client with authorization header from request
const getClientFromReq = (req: Request) => {
  const authHeader = req.headers['authorization'];
  if (authHeader && isSupabaseConfigured()) {
    const client = getAuthenticatedSupabaseClient(authHeader);
    if (client) return client;
  }
  return getSupabaseClient();
};

/**
 * 1. GET /api/admin/dashboard
 * Feeds dashboard indicators using admin_dashboard SQL function.
 * Indicator returns: total_cadastros, cadastros_hoje, cadastros_mes,
 * novos, em_analise, aprovados, cancelados, reprovados.
 */
router.get('/dashboard', requireAdminAuth, async (req: Request, res: Response) => {
  const client = getClientFromReq(req);

  if (client) {
    try {
      const { data, error } = await client.rpc('admin_dashboard');

      if (error) {
        logServerError('RPC_ADMIN_DASHBOARD_ERROR', error);
        res.status(500).json({
          error: 'Falha ao consultar indicadores do dashboard no Supabase.',
          details: error.message,
        });
        return;
      }

      logServerAction('ADMIN_DASHBOARD_ACCESSED', {
        adminId: req.adminUser?.id,
        email: req.adminUser?.email,
      });

      res.json({
        success: true,
        data: {
          total_cadastros: Number(data?.total_cadastros || 0),
          cadastros_hoje: Number(data?.cadastros_hoje || 0),
          cadastros_mes: Number(data?.cadastros_mes || 0),
          novos: Number(data?.novos || 0),
          em_analise: Number(data?.em_analise || 0),
          aprovados: Number(data?.aprovados || 0),
          cancelados: Number(data?.cancelados || 0),
          reprovados: Number(data?.reprovados || 0),
        },
      });
      return;
    } catch (err: any) {
      logServerError('ADMIN_DASHBOARD_EXCEPTION', err);
      res.status(500).json({ error: 'Erro interno ao processar indicadores.', details: err?.message });
      return;
    }
  }

  // Fallback if not configured
  res.json({
    success: true,
    data: {
      total_cadastros: 0,
      cadastros_hoje: 0,
      cadastros_mes: 0,
      novos: 0,
      em_analise: 0,
      aprovados: 0,
      cancelados: 0,
      reprovados: 0,
    },
  });
});

/**
 * 2. GET /api/admin/relatorio-mensal
 * Feeds monthly evolution chart using admin_relatorio_mensal SQL function.
 * Query params: data_inicio (YYYY-MM-DD), data_fim (YYYY-MM-DD)
 */
router.get('/relatorio-mensal', requireAdminAuth, async (req: Request, res: Response) => {
  const client = getClientFromReq(req);
  const { data_inicio, data_fim } = req.query;

  if (client) {
    try {
      const { data, error } = await client.rpc('admin_relatorio_mensal', {
        p_data_inicio: data_inicio ? String(data_inicio) : null,
        p_data_fim: data_fim ? String(data_fim) : null,
      });

      if (error) {
        logServerError('RPC_RELATORIO_MENSAL_ERROR', error);
        res.status(500).json({
          error: 'Falha ao consultar relatório mensal no Supabase.',
          details: error.message,
        });
        return;
      }

      res.json({
        success: true,
        data: Array.isArray(data) ? data : [],
      });
      return;
    } catch (err: any) {
      logServerError('RELATORIO_MENSAL_EXCEPTION', err);
      res.status(500).json({ error: 'Erro ao processar relatório mensal.', details: err?.message });
      return;
    }
  }

  res.json({ success: true, data: [] });
});

/**
 * 3. GET /api/admin/relatorio-status
 * Feeds status distribution chart using admin_relatorio_status SQL function.
 */
router.get('/relatorio-status', requireAdminAuth, async (req: Request, res: Response) => {
  const client = getClientFromReq(req);

  if (client) {
    try {
      const { data, error } = await client.rpc('admin_relatorio_status');

      if (error) {
        logServerError('RPC_RELATORIO_STATUS_ERROR', error);
        res.status(500).json({
          error: 'Falha ao consultar relatório de status no Supabase.',
          details: error.message,
        });
        return;
      }

      res.json({
        success: true,
        data: Array.isArray(data) ? data : [],
      });
      return;
    } catch (err: any) {
      logServerError('RELATORIO_STATUS_EXCEPTION', err);
      res.status(500).json({ error: 'Erro ao processar relatório de status.', details: err?.message });
      return;
    }
  }

  res.json({ success: true, data: [] });
});

/**
 * 4. GET /api/admin/cadastros
 * Queries cadastros with search, status filter, date range, pagination and sorting.
 * Uses admin_consultar_cadastros SQL function.
 * Query params: busca, status, data_inicio, data_fim, limite (default 20), offset (default 0)
 */
router.get('/cadastros', requireAdminAuth, async (req: Request, res: Response) => {
  const client = getClientFromReq(req);
  const { busca, status, data_inicio, data_fim, limite, offset } = req.query;

  const p_busca = busca && String(busca).trim().length > 0 ? String(busca).trim() : null;
  
  let p_status: string | null = null;
  if (status && String(status).trim() !== 'Todos' && String(status).trim().length > 0) {
    p_status = normalizeStatusForDb(String(status).trim());
  }

  const p_data_inicio = data_inicio ? String(data_inicio).trim() : null;
  const p_data_fim = data_fim ? String(data_fim).trim() : null;
  const p_limite = limite ? Math.max(1, Math.min(100, parseInt(String(limite), 10))) : 20;
  const p_offset = offset ? Math.max(0, parseInt(String(offset), 10)) : 0;

  if (client) {
    try {
      const { data, error } = await client.rpc('admin_consultar_cadastros', {
        p_busca,
        p_status,
        p_data_inicio,
        p_data_fim,
        p_limite,
        p_offset,
      });

      if (error) {
        logServerError('RPC_CONSULTAR_CADASTROS_ERROR', error);
        res.status(500).json({
          error: 'Falha ao executar admin_consultar_cadastros no Supabase.',
          details: error.message,
        });
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      const total = rows.length > 0 ? Number(rows[0].total_registros || rows.length) : 0;

      // Map rows to standard proposal records with parsed payloads
      const records = rows.map((row) => {
        const mapped = mapRowToProposalRecord(row);
        // Ensure status reflects app standard
        mapped.status = normalizeStatusForApp(row.status);
        return mapped;
      });

      res.json({
        success: true,
        data: records,
        total,
        limite: p_limite,
        offset: p_offset,
      });
      return;
    } catch (err: any) {
      logServerError('CONSULTAR_CADASTROS_EXCEPTION', err);
      res.status(500).json({ error: 'Erro ao consultar cadastros.', details: err?.message });
      return;
    }
  }

  res.json({
    success: true,
    data: [],
    total: 0,
    limite: p_limite,
    offset: p_offset,
  });
});

/**
 * 5. POST /api/admin/exportacoes/historico
 * Records export history in public.historico_exportacoes.
 * Body: { formato: 'pdf' | 'excel', filtros: object, quantidade_registros: number }
 * user_id is extracted strictly from authenticated admin session on backend!
 */
router.post('/exportacoes/historico', requireAdminAuth, async (req: Request, res: Response) => {
  const { formato, filtros, quantidade_registros } = req.body;

  if (!formato || (formato !== 'pdf' && formato !== 'excel')) {
    res.status(400).json({
      error: 'Formato de exportação inválido. Valores aceitos: "pdf" ou "excel".',
    });
    return;
  }

  const userId = req.adminUser?.user_id;
  const adminId = req.adminUser?.id;
  const totalCount = typeof quantidade_registros === 'number' ? Math.max(0, quantidade_registros) : 0;
  const cleanFilters = filtros && typeof filtros === 'object' ? filtros : {};

  const supabaseAdmin = getSupabaseClient();

  if (supabaseAdmin) {
    try {
      // 1. Insert into public.historico_exportacoes
      const { data: exportLog, error: exportError } = await supabaseAdmin
        .from('historico_exportacoes')
        .insert([
          {
            user_id: userId || null,
            formato: formato.toLowerCase(), // 'pdf' or 'excel'
            filtros: cleanFilters,
            quantidade_registros: totalCount,
          },
        ])
        .select()
        .single();

      if (exportError) {
        logServerError('HISTORICO_EXPORTACOES_INSERT_ERROR', exportError);
      }

      // 2. Also log to public.historico_acessos
      try {
        await supabaseAdmin.from('historico_acessos').insert([
          {
            administrador_id: adminId || null,
            acao: formato === 'excel' ? 'EXPORTACAO_RELATORIO_EXCEL' : 'EXPORTACAO_RELATORIO_PDF',
            ip: req.ip || (req.headers['x-forwarded-for'] as string) || null,
            user_agent: req.headers['user-agent'] || null,
            detalhes: {
              formato,
              filtros: cleanFilters,
              quantidade_registros: totalCount,
              export_id: exportLog?.id || null,
            },
          },
        ]);
      } catch {
        // secondary audit log optional
      }

      logServerAction('ADMIN_REPORT_EXPORTED', {
        adminUser: req.adminUser?.email,
        userId,
        formato,
        quantidade_registros: totalCount,
      });

      res.status(201).json({
        success: true,
        message: 'Registro de exportação gravado com sucesso.',
        exportId: exportLog?.id || null,
      });
      return;
    } catch (err: any) {
      logServerError('EXPORT_AUDIT_EXCEPTION', err);
      res.status(500).json({ error: 'Erro ao registrar exportação.', details: err?.message });
      return;
    }
  }

  res.status(200).json({ success: true, message: 'Gravado em modo local.' });
});

export default router;
