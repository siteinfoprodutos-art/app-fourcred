import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  isSupabaseConfigured,
  getSupabaseClient,
  mapPayloadToCadastroRow,
  mapRowToProposalRecord,
  normalizeStatusForDb,
  normalizeStatusForApp,
} from './src/server/supabase.ts';
import { proposalRateLimiter } from './src/server/middleware/rateLimiter.ts';
import { validateProposalSubmission } from './src/server/middleware/validateProposal.ts';
import { requireAdminAuth } from './src/server/middleware/adminAuth.ts';
import authRoutes from './src/server/routes/authRoutes.ts';
import adminRoutes from './src/server/routes/adminRoutes.ts';
import { logServerAction, logServerError, maskCPFForLog } from './src/server/utils/logger.ts';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Mount Auth routes (/api/auth/login, /api/auth/logout, /api/auth/me)
app.use('/api/auth', authRoutes);
// Mount Admin routes (/api/admin/dashboard, etc.)
app.use('/api/admin', adminRoutes);

// Initial seed proposals (used in development when Supabase is not yet connected)
const INITIAL_PROPOSALS = [
  {
    id: 'FC-882194',
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    status: 'Em Análise',
    payload: {
      p1: {
        fullName: 'Ricardo Mendes Santos',
        cpf: '123.456.789-00',
        rg: '12.345.678-x SSP/SP',
        dob: '1985-05-15',
        maritalStatus: 'casado',
        hasChildren: 'sim',
        childrenCount: 2,
        email: 'ricardo.mendes@email.com',
        phoneMobile: '(11) 98765-4321',
        phoneHome: '(11) 3214-5678',
        profession: 'Engenheiro Civil',
        serviceTime: '48 meses',
        salary: 12500,
        otherIncomes: 1200,
        otherIncomesOrigin: 'Aluguéis de imóvel comercial',
        hasFinancing: 'nao',
        hasLoan: 'nao',
      },
      hasP2: true,
      p2Relationship: 'Cônjuge',
      p2: {
        fullName: 'Ana Paula Oliveira Mendes',
        cpf: '098.765.432-11',
        rg: '23.456.789-y SSP/SP',
        dob: '1988-08-22',
        maritalStatus: 'casado',
        email: 'ana.paula@email.com',
        phoneMobile: '(11) 91234-5678',
        profession: 'Arquiteta Urbanista',
        serviceTime: '36 meses',
        salary: 8000,
      },
      usedFgts: 'sim',
      fgtsSubsidy: 'nao',
      ownsProperty: 'nao',
      otherAssets: 'Poupança e investimento em CDB liquidez diária R$ 95.000',
      targetPropertyAddress: 'Av. Paulista, 1200 - Apto 142, Jardim Paulista, São Paulo - SP',
      parkingSpaces: 2,
      saleValue: 890000,
      downPayment: 390000,
      useFgts: 'sim',
      fgtsValue: 45000,
      financingValue: 500000,
      termYears: 35,
      amortizationSystem: 'sac',
      acceptedTerms: true,
      submittedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    },
  },
  {
    id: 'FC-773412',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    status: 'Aprovado',
    payload: {
      p1: {
        fullName: 'Camila Albuquerque Vieira',
        cpf: '234.567.890-12',
        rg: '34.567.890-1 SSP/SP',
        dob: '1992-11-04',
        maritalStatus: 'solteiro',
        hasChildren: 'nao',
        email: 'camila.vieira@fintech.com.br',
        phoneMobile: '(11) 97654-3210',
        profession: 'Gerente de Produto Tech',
        serviceTime: '60 meses',
        salary: 16500,
        hasFinancing: 'nao',
        hasLoan: 'nao',
      },
      hasP2: false,
      usedFgts: 'nao',
      fgtsSubsidy: 'nao',
      ownsProperty: 'nao',
      otherAssets: 'Carteira de ações e títulos públicos',
      targetPropertyAddress: 'Rua Bela Cintra, 850 - Apto 81, Consolação, São Paulo - SP',
      parkingSpaces: 1,
      saleValue: 650000,
      downPayment: 200000,
      useFgts: 'nao',
      financingValue: 450000,
      termYears: 30,
      amortizationSystem: 'sac',
      acceptedTerms: true,
      submittedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    },
  },
  {
    id: 'FC-651209',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: 'Pendente',
    payload: {
      p1: {
        fullName: 'Rodrigo Nogueira Barros',
        cpf: '345.678.901-23',
        rg: '45.678.901-2 SSP/RJ',
        dob: '1979-03-30',
        maritalStatus: 'casado',
        hasChildren: 'sim',
        childrenCount: 1,
        email: 'rodrigo.barros@consultoria.com',
        phoneMobile: '(21) 98877-6655',
        profession: 'Analista de Sistemas Sênior',
        serviceTime: '72 meses',
        salary: 14200,
        hasFinancing: 'nao',
        hasLoan: 'nao',
      },
      hasP2: true,
      p2Relationship: 'Cônjuge',
      p2: {
        fullName: 'Juliana Castro Barros',
        cpf: '456.789.012-34',
        rg: '56.789.012-3 SSP/RJ',
        dob: '1982-09-18',
        maritalStatus: 'casado',
        email: 'juliana.barros@email.com',
        phoneMobile: '(21) 97766-5544',
        profession: 'Nutricionista Clínica',
        serviceTime: '40 meses',
        salary: 6800,
      },
      usedFgts: 'sim',
      fgtsSubsidy: 'nao',
      ownsProperty: 'nao',
      targetPropertyAddress: 'Rua Visconde de Pirajá, 450, Ipanema, Rio de Janeiro - RJ',
      parkingSpaces: 2,
      saleValue: 1200000,
      downPayment: 480000,
      useFgts: 'sim',
      fgtsValue: 80000,
      financingValue: 720000,
      termYears: 30,
      amortizationSystem: 'price',
      acceptedTerms: true,
      submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  },
];

let inMemoryProposals = JSON.parse(JSON.stringify(INITIAL_PROPOSALS));

// Health & System status
app.get('/api/health', async (_req: Request, res: Response) => {
  const configured = isSupabaseConfigured();
  let tablesMigrated = false;

  if (configured) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('cadastros').select('id').limit(1);
        tablesMigrated = !error;
      } catch {
        tablesMigrated = false;
      }
    }
  }

  res.json({
    status: 'healthy',
    app: 'Fourcred V2',
    timestamp: new Date().toISOString(),
    database: {
      adapter: configured ? 'supabase_postgresql' : 'in_memory_persistence',
      configured,
      tablesMigrated,
      description: configured
        ? (tablesMigrated
            ? 'Conectado e tabelas migradas no Supabase PostgreSQL via Service Role Key (Backend)'
            : 'Conectado ao Supabase, mas a tabela public.cadastros ainda não foi criada. Execute o script /supabase/schema.sql no SQL Editor.')
        : 'Serviço temporário de desenvolvimento em memória (Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env)',
    },
  });
});

// ==============================================================================
// PUBLIC ENDPOINTS (Public Candidate Submissions)
// ==============================================================================

// Handler for public candidate submissions
const handleCadastroSubmission = async (req: Request, res: Response) => {
  const body = req.body;
  const data = body.payload ? body : { payload: body };
  const generatedId = data.id || `FC-${Math.floor(100000 + Math.random() * 900000)}`;
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const row = mapPayloadToCadastroRow(generatedId, data.payload, data.status || 'Pendente');

      let inserted: any = null;
        let insertError: any = null;

        // 1. Try full relational row insert
        const attempt1 = await supabase
          .from('cadastros')
          .insert([row])
          .select()
          .single();

        if (attempt1.error && attempt1.error.message?.includes('schema cache')) {
          // 2. If table in Supabase was created with compact columns (nome, email, telefone, dados_formulario)
          const dbStatus = normalizeStatusForDb(data.status || 'Pendente');
          const compactRow = {
            nome: data.payload?.p1?.fullName || '',
            email: data.payload?.p1?.email || '',
            telefone: data.payload?.p1?.phoneMobile || '',
            status: dbStatus,
            origem: 'site',
            dados_formulario: {
              ...data.payload,
              codigo_proposta: generatedId,
              submittedAt: new Date().toISOString(),
            },
          };

          const attempt2 = await supabase
            .from('cadastros')
            .insert([compactRow])
            .select()
            .single();

          if (!attempt2.error) {
            inserted = attempt2.data;
          } else {
            insertError = attempt2.error;
          }
        } else if (attempt1.error) {
          insertError = attempt1.error;
        } else {
          inserted = attempt1.data;
        }

        if (insertError || !inserted) {
          logServerError('SUPABASE_INSERT_ERROR', insertError);
          if (insertError?.code === '42P01' || insertError?.message?.includes('Could not find the table')) {
            const fallbackProposal = {
              id: generatedId,
              status: data.status || 'Pendente',
              created_at: new Date().toISOString(),
              payload: {
                ...data.payload,
                submittedAt: new Date().toISOString(),
              },
            };
            inMemoryProposals.unshift(fallbackProposal);
            res.setHeader('X-Storage-Mode', 'supabase-pending-migration-in-memory');
            res.status(201).json(fallbackProposal);
            return;
          }
          throw insertError;
        }

        // Record access audit log safely
        try {
          const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || null;
          const userAgent = (req.headers['user-agent'] as string) || null;
          const auditDetails = {
            codigo: generatedId,
            cpf: maskCPFForLog(data?.payload?.p1?.cpf),
            valor_financiamento: data?.payload?.financingValue,
          };

          // Try standard log row or fallback to evento / ip_address
          const logAttempt = await supabase.from('historico_acessos').insert([
            {
              acao: 'NOVO_CADASTRO_RECEBIDO',
              evento: 'NOVO_CADASTRO_RECEBIDO',
              cadastro_id: inserted.id,
              ip: clientIp,
              ip_address: clientIp,
              user_agent: userAgent,
              detalhes: auditDetails,
            },
          ]);

          if (logAttempt.error) {
            // Try simplified audit log format
            await supabase.from('historico_acessos').insert([
              {
                evento: 'NOVO_CADASTRO_RECEBIDO',
                user_agent: userAgent,
                detalhes: auditDetails,
              },
            ]);
          }
        } catch {
          // Audit log optional
        }

        logServerAction('PROPOSAL_CREATED', {
          id: generatedId,
          cpf: maskCPFForLog(data?.payload?.p1?.cpf),
        });

        const savedRecord = mapRowToProposalRecord(inserted);
        res.status(201).json(savedRecord);
        return;
      } catch (err: any) {
        logServerError('SUPABASE_SAVE_ERROR', err);
        res.status(500).json({
          error: 'Erro ao gravar cadastro no Supabase PostgreSQL.',
          details: err?.message || err?.details || String(err),
        });
        return;
      }
    }

    // Fallback to server memory when Supabase is not configured
    const newProposal = {
      id: generatedId,
      status: data.status || 'Pendente',
      created_at: new Date().toISOString(),
      payload: {
        ...data.payload,
        submittedAt: new Date().toISOString(),
      },
    };

    inMemoryProposals.unshift(newProposal);
    logServerAction('PROPOSAL_CREATED_IN_MEMORY', {
      id: generatedId,
      cpf: maskCPFForLog(data?.payload?.p1?.cpf),
    });

    res.status(201).json(newProposal);
};

// POST /api/cadastros - Public submission of financing proposal with rate limiting & server validation
app.post('/api/cadastros', proposalRateLimiter, validateProposalSubmission, handleCadastroSubmission);

// POST /api/proposals - Backward compatible alias
app.post('/api/proposals', proposalRateLimiter, validateProposalSubmission, handleCadastroSubmission);

// ==============================================================================
// PROTECTED ADMINISTRATIVE ENDPOINTS (Requires Auth & Active Admin Role)
// ==============================================================================

// GET /api/proposals - List proposals (Strictly requires Admin Auth)
app.get('/api/proposals', requireAdminAuth, async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      // 1. Query 'cadastros' table
      const { data, error } = await supabase
        .from('cadastros')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Log access audit
        try {
          await supabase.from('historico_acessos').insert([
            {
              administrador_id: req.adminUser?.id || null,
              acao: 'CONSULTA_LISTA_PROPOSTAS',
              ip: req.ip || (req.headers['x-forwarded-for'] as string) || null,
              user_agent: req.headers['user-agent'] || null,
              detalhes: { total_retornado: data.length },
            },
          ]);
        } catch {
          // Audit log optional
        }

        const records = data.map(mapRowToProposalRecord);
        res.setHeader('X-Storage-Mode', 'supabase-postgresql');
        res.setHeader('X-Tables-Migrated', 'true');
        res.json(records);
        return;
      }

      // 2. Legacy fallback
      const { data: legacyData, error: legacyError } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (!legacyError && legacyData) {
        const records = legacyData.map((row) => ({
          id: row.codigo_proposta || row.id,
          status: row.status || 'Pendente',
          created_at: row.created_at,
          payload: row.payload || {},
        }));
        res.setHeader('X-Storage-Mode', 'supabase-proposals-table');
        res.setHeader('X-Tables-Migrated', 'partial');
        res.json(records);
        return;
      }

      console.warn('[Supabase Warning] Tabelas ainda não criadas no Supabase:', error?.message);
      res.setHeader('X-Storage-Mode', 'supabase-pending-migration');
      res.setHeader('X-Tables-Migrated', 'false');
      res.json(inMemoryProposals);
      return;
    } catch (err: any) {
      logServerError('SUPABASE_QUERY_ERROR', err);
      res.setHeader('X-Storage-Mode', 'fallback-in-memory');
      res.json(inMemoryProposals);
      return;
    }
  }

  // Development temporary memory fallback
  res.setHeader('X-Storage-Mode', 'development-temporary-node-memory');
  res.json(inMemoryProposals);
});

// PATCH /api/proposals/:id/status - Update proposal status (Strictly requires Admin Auth)
app.patch('/api/proposals/:id/status', requireAdminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['Pendente', 'Em Análise', 'Aprovado', 'Recusado'].includes(status)) {
    res.status(400).json({ error: 'Status de proposta inválido.' });
    return;
  }

  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const dbStatus = normalizeStatusForDb(status);
      // 1. Try update by codigo_proposta
      let updateAttempt = await supabase
        .from('cadastros')
        .update({ status: dbStatus })
        .eq('codigo_proposta', id)
        .select()
        .maybeSingle();

      // 2. If not found or column does not exist, try by id (UUID)
      if (!updateAttempt.data) {
        updateAttempt = await supabase
          .from('cadastros')
          .update({ status: dbStatus })
          .eq('id', id)
          .select()
          .maybeSingle();
      }

      if (!updateAttempt.error && updateAttempt.data) {
        const data = updateAttempt.data;
        // Audit log
        try {
          await supabase.from('historico_acessos').insert([
            {
              evento: 'ALTERACAO_STATUS',
              acao: 'ALTERACAO_STATUS',
              cadastro_id: data.id,
              detalhes: { novo_status: status },
            },
          ]);
        } catch {
          // optional
        }

        res.json(mapRowToProposalRecord(data));
        return;
      }
    } catch (err) {
      logServerError('SUPABASE_UPDATE_ERROR', err);
    }
  }

  const item = inMemoryProposals.find((p: { id: string }) => p.id === id);
  if (!item) {
    res.status(404).json({ error: 'Proposta não encontrada' });
    return;
  }

  item.status = status;
  res.json(item);
});

// DELETE /api/proposals/:id - Delete proposal (Strictly requires Admin Auth)
app.delete('/api/proposals/:id', requireAdminAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      // 1. Try delete by codigo_proposta or by id
      let deleteAttempt = await supabase.from('cadastros').delete().eq('codigo_proposta', id);
      if (deleteAttempt.error) {
        deleteAttempt = await supabase.from('cadastros').delete().eq('id', id);
      }

      if (!deleteAttempt.error) {
        try {
          await supabase.from('historico_acessos').insert([
            {
              evento: 'EXCLUSAO_PROPOSTA',
              acao: 'EXCLUSAO_PROPOSTA',
              detalhes: { proposta_id: id },
            },
          ]);
        } catch {
          // optional
        }

        res.json({ success: true, id });
        return;
      }
    } catch (err) {
      logServerError('SUPABASE_DELETE_ERROR', err);
    }
  }

  inMemoryProposals = inMemoryProposals.filter((p: { id: string }) => p.id !== id);
  res.json({ success: true, id });
});

// POST /api/proposals/reset - Reset to seeds (Strictly requires Admin Auth)
app.post('/api/proposals/reset', requireAdminAuth, (_req: Request, res: Response) => {
  inMemoryProposals = JSON.parse(JSON.stringify(INITIAL_PROPOSALS));
  res.json({ success: true, count: inMemoryProposals.length });
});

// POST /api/reports/log-export - Audit Log Report Export (Strictly requires Admin Auth)
app.post('/api/reports/log-export', requireAdminAuth, async (req: Request, res: Response) => {
  const { format, filters, totalRecords } = req.body;
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      await supabase.from('historico_acessos').insert([
        {
          administrador_id: req.adminUser?.id || null,
          acao: format === 'excel' ? 'EXPORTACAO_RELATORIO_EXCEL' : 'EXPORTACAO_RELATORIO_PDF',
          ip: req.ip || (req.headers['x-forwarded-for'] as string) || null,
          user_agent: req.headers['user-agent'] || null,
          detalhes: {
            formato: format,
            total_registros: totalRecords,
            filtros: filters || {},
          },
        },
      ]);
    } catch (err) {
      logServerError('SUPABASE_AUDIT_LOG_ERROR', err);
    }
  }

  logServerAction('REPORT_EXPORTED', {
    admin: req.adminUser?.email,
    format,
    totalRecords,
  });

  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Fourcred V2 full-stack server running on http://0.0.0.0:${PORT}`);
      if (isSupabaseConfigured()) {
        console.log('✅ Supabase PostgreSQL e Auth conectados com sucesso.');
      } else {
        console.log('ℹ️  Supabase não configurado. Modo de desenvolvimento temporário em memória ativo.');
        console.log('   Para conectar ao Supabase real, adicione SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
      }
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
