import { ProposalPayload, ProposalRecord, ProposalStatus } from '../types/proposal';

export interface SystemEnvironmentStatus {
  isDevMode: boolean;
  adapter: string;
  storageDescription: string;
  isSupabaseConfigured: boolean;
}

export interface AdminProfile {
  id: string;
  nome: string;
  email: string;
  cargo: string;
}

export interface AuthSession {
  token: string;
  user: {
    id: string;
    email: string;
  };
  adminInfo: AdminProfile;
  isDevMode: boolean;
}

const AUTH_TOKEN_KEY = 'fourcred_admin_token';
const AUTH_USER_KEY = 'fourcred_admin_user';

// In-memory runtime cache for development mode
let memoryCache: ProposalRecord[] = [];

class ProposalService {
  private isSubmitting = false;

  // Session Token Helper
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(AUTH_TOKEN_KEY);
  }

  getAdminUser(): AdminProfile | null {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(AUTH_USER_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    return Boolean(this.getToken());
  }

  // Admin Login via Backend (Supabase Auth / Dev Auth)
  async login(email: string, password: string): Promise<AuthSession> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Falha ao autenticar.');
    }

    if (data.token) {
      sessionStorage.setItem(AUTH_TOKEN_KEY, data.token);
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.adminInfo));
    }

    return data;
  }

  // Register a new Gestor directly from Login Screen (Passcode authorized)
  async registerGestor(data: { nome: string; email: string; password: string; cargo?: string }): Promise<AuthSession> {
    const res = await fetch('/api/auth/register-gestor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        passcode: 'fourcred',
      }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || body.error || 'Falha ao cadastrar novo gestor.');
    }

    if (body.token) {
      sessionStorage.setItem(AUTH_TOKEN_KEY, body.token);
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(body.adminInfo));
    }

    return body;
  }

  // Admin Logout
  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  }

  // Check current session state from backend
  async checkSession(): Promise<{ authenticated: boolean; adminUser?: AdminProfile; isDevAdmin?: boolean }> {
    const token = this.getToken();
    if (!token) return { authenticated: false };

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch {
      // offline
    }
    return { authenticated: false };
  }

  // Check system status
  async getEnvironmentStatus(): Promise<SystemEnvironmentStatus> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        return {
          isDevMode: !data.database?.configured,
          adapter: data.database?.adapter || 'in_memory_persistence',
          storageDescription: data.database?.description || 'Backend Node.js ativo',
          isSupabaseConfigured: Boolean(data.database?.configured),
        };
      }
    } catch {
      // Offline fallback
    }

    return {
      isDevMode: true,
      adapter: 'in_memory_temporary',
      storageDescription: 'Serviço temporário de desenvolvimento',
      isSupabaseConfigured: false,
    };
  }

  // Fetch proposals from Node.js backend (Protected Administrative Route)
  async getProposals(): Promise<ProposalRecord[]> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch('/api/proposals', { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          memoryCache = data;
          return data;
        }
      } else if (res.status === 401 || res.status === 403) {
        throw new Error('Acesso não autorizado. Realize login como Administrador.');
      }
    } catch (err: any) {
      console.warn('[Fourcred Dev] Falha ao consultar propostas:', err?.message || err);
      if (err?.message?.includes('Acesso não autorizado')) {
        throw err;
      }
    }
    return memoryCache;
  }

  // Submit proposal to Node.js backend (Public candidate access)
  async createProposal(payload: ProposalPayload): Promise<ProposalRecord> {
    if (this.isSubmitting) {
      throw new Error('Uma submissão já está em andamento. Aguarde a conclusão.');
    }

    this.isSubmitting = true;

    try {
      const id = 'FC-' + Math.floor(100000 + Math.random() * 900000);
      const payloadWithMeta = {
        id,
        payload: {
          ...payload,
          submittedAt: new Date().toISOString(),
        },
        status: 'Pendente' as ProposalStatus,
        created_at: new Date().toISOString(),
      };

      const res = await fetch('/api/cadastros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithMeta),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.message || data.error || `Erro (${res.status}): Não foi possível processar a proposta.`;
        if (data.details && typeof data.details === 'object') {
          const firstDetail = Object.values(data.details)[0];
          throw new Error(`${errorMsg} (${firstDetail})`);
        }
        throw new Error(errorMsg);
      }

      memoryCache = [data, ...memoryCache];
      return data;
    } finally {
      this.isSubmitting = false;
    }
  }

  // Update status in backend (Protected Administrative Route)
  async updateStatus(id: string, status: ProposalStatus): Promise<boolean> {
    const token = this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`/api/proposals/${id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'Erro ao atualizar status');
      }
    } catch (err: any) {
      console.warn('[ProposalService Update Warning]:', err?.message || err);
    }

    memoryCache = memoryCache.map((item) => (item.id === id ? { ...item, status } : item));
    return true;
  }

  // Delete proposal in backend (Protected Administrative Route)
  async deleteProposal(id: string): Promise<boolean> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || 'Erro ao excluir proposta');
      }
    } catch (err: any) {
      console.warn('[ProposalService Delete Warning]:', err?.message || err);
    }

    memoryCache = memoryCache.filter((item) => item.id !== id);
    return true;
  }

  // Reload initial seeds on backend (Protected Administrative Route)
  async resetSeedData(): Promise<void> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      await fetch('/api/proposals/reset', {
        method: 'POST',
        headers,
      });
    } catch {
      // noop
    }
  }

  // Log report export audit in backend (Protected Administrative Route)
  async logReportExport(format: 'pdf' | 'excel', filters: any, totalRecords: number): Promise<void> {
    const token = this.getToken();
    if (!token) return;
    try {
      await fetch('/api/reports/log-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ format, filters, totalRecords }),
      });
    } catch {
      // Non-blocking audit log
    }
  }

  // Fetch list of registered administrators
  async getAdminList(): Promise<AdminProfile[]> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch('/api/admin/gestores', { headers });
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          return body.data;
        }
      }
    } catch (err: any) {
      console.warn('[ProposalService getAdminList Error]:', err?.message || err);
    }
    return [
      {
        id: '1',
        nome: 'Proprietário',
        email: 'danielfourcred@gmail.com',
        cargo: 'Admin Gestor',
      },
    ];
  }

  // Register a new administrator
  async createAdmin(data: { nome: string; email: string; cargo?: string; password?: string }): Promise<AdminProfile> {
    const token = this.getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/admin/gestores', {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    const body = await res.json();

    if (!res.ok || !body.success) {
      throw new Error(body.message || body.error || 'Falha ao cadastrar administrador.');
    }

    return body.data;
  }
}

export const proposalService = new ProposalService();
