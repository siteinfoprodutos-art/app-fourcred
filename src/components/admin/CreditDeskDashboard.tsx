import React, { useState, useEffect, useMemo } from 'react';
import { ProposalRecord, ProposalStatus } from '../../types/proposal';
import { proposalService, AdminProfile } from '../../services/proposalService';
import { generateProposalPDF } from '../../services/pdfService';
import { AdminLoginForm } from './AdminLoginForm';
import { ReportExportModal } from './ReportExportModal';
import { AdminManagerModal } from './AdminManagerModal';
import {
  Users,
  UserPlus,
  TrendingUp,
  Calculator,
  Percent,
  Search,
  RefreshCw,
  Download,
  Trash2,
  Inbox,
  Eye,
  X,
  Building,
  LogOut,
  ShieldCheck,
  Calendar,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

export const CreditDeskDashboard: React.FC = () => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<AdminProfile | null>(null);
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  // Data & UI state
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<string>('date-desc');

  // Report Modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedProposal, setSelectedProposal] = useState<ProposalRecord | null>(null);

  // Check Auth State on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsCheckingAuth(true);
      try {
        const envStatus = await proposalService.getEnvironmentStatus();
        setIsSupabaseConfigured(envStatus.isSupabaseConfigured);

        const storedUser = proposalService.getAdminUser();
        if (storedUser && proposalService.isAuthenticated()) {
          setAdminUser(storedUser);
          setIsAuthenticated(true);
        } else {
          const session = await proposalService.checkSession();
          if (session.authenticated && session.adminUser) {
            setAdminUser(session.adminUser);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initAuth();
  }, []);

  const loadProposals = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await proposalService.getProposals();
      setProposals(data);
    } catch (err: any) {
      console.error('Erro ao carregar propostas do Supabase:', err);
      const msg = err?.message || 'Falha ao conectar com o backend/Supabase PostgreSQL.';
      setErrorMessage(msg);
      if (msg.includes('Acesso não autorizado') || msg.includes('401') || msg.includes('403')) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadProposals();
    }
  }, [isAuthenticated]);

  const handleLoginSuccess = (user: AdminProfile) => {
    setAdminUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await proposalService.logout();
    setAdminUser(null);
    setIsAuthenticated(false);
    setProposals([]);
  };

  const handleDownloadPDF = (proposal: ProposalRecord) => {
    generateProposalPDF(proposal.payload, proposal.id);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm('Tem certeza que deseja apagar permanentemente esta proposta do banco de dados?')) {
      try {
        await proposalService.deleteProposal(id);
        if (selectedProposal?.id === id) {
          setSelectedProposal(null);
        }
        loadProposals();
      } catch (err: any) {
        alert(`Erro ao excluir: ${err?.message || 'Falha de comunicação'}`);
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: ProposalStatus) => {
    try {
      await proposalService.updateStatus(id, newStatus);
      if (selectedProposal && selectedProposal.id === id) {
        setSelectedProposal({
          ...selectedProposal,
          status: newStatus,
        });
      }
      loadProposals();
    } catch (err: any) {
      alert(`Erro ao atualizar status: ${err?.message || 'Falha de comunicação'}`);
    }
  };

  // Filter and Sort Logic
  const filteredAndSortedProposals = useMemo(() => {
    let result = [...proposals];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const name = p.payload.p1?.fullName || '';
        const cpf = p.payload.p1?.cpf || '';
        const email = p.payload.p1?.email || '';
        const id = p.id || '';
        return (
          name.toLowerCase().includes(q) ||
          cpf.includes(q) ||
          email.toLowerCase().includes(q) ||
          id.toLowerCase().includes(q)
        );
      });
    }

    // 2. Status Filter
    if (selectedStatus !== 'Todos') {
      result = result.filter((p) => {
        const status = p.status || 'Pendente';
        return status === selectedStatus;
      });
    }

    // 3. Period Filter
    if (selectedPeriod !== 'Todos') {
      const now = new Date();
      result = result.filter((p) => {
        const date = new Date(p.payload.submittedAt || p.created_at || Date.now());
        if (isNaN(date.getTime())) return true;

        if (selectedPeriod === 'Hoje') {
          return (
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        }
        if (selectedPeriod === 'Esta Semana') {
          const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
          return diffDays >= 0 && diffDays <= 7;
        }
        if (selectedPeriod === 'Este Mês') {
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }
        if (selectedPeriod === 'Este Ano') {
          return date.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }

    // 4. Sorting
    result.sort((a, b) => {
      const dateA = new Date(a.payload.submittedAt || a.created_at || 0).getTime();
      const dateB = new Date(b.payload.submittedAt || b.created_at || 0).getTime();
      const valA = Number(a.payload.financingValue || 0);
      const valB = Number(b.payload.financingValue || 0);
      const nameA = (a.payload.p1?.fullName || '').toLowerCase();
      const nameB = (b.payload.p1?.fullName || '').toLowerCase();

      switch (sortBy) {
        case 'date-asc':
          return dateA - dateB;
        case 'value-desc':
          return valB - valA;
        case 'value-asc':
          return valA - valB;
        case 'name-asc':
          return nameA.localeCompare(nameB);
        case 'date-desc':
        default:
          return dateB - dateA;
      }
    });

    return result;
  }, [proposals, searchQuery, selectedStatus, selectedPeriod, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedPeriod, sortBy]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredAndSortedProposals.length / itemsPerPage) || 1;
  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedProposals.slice(start, start + itemsPerPage);
  }, [filteredAndSortedProposals, currentPage, itemsPerPage]);

  // Real-time Metrics Calculations
  const metrics = useMemo(() => {
    const total = proposals.length;
    const now = new Date();

    const todayCount = proposals.filter((p) => {
      const d = new Date(p.payload.submittedAt || p.created_at || 0);
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    }).length;

    const monthCount = proposals.filter((p) => {
      const d = new Date(p.payload.submittedAt || p.created_at || 0);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const totalVolume = proposals.reduce(
      (acc, p) => acc + Number(p.payload.financingValue || 0),
      0
    );

    const averageTicket = total > 0 ? totalVolume / total : 0;

    const sacCount = proposals.filter(
      (p) => (p.payload.amortizationSystem || '').toLowerCase() === 'sac'
    ).length;
    const priceCount = proposals.filter(
      (p) => (p.payload.amortizationSystem || '').toLowerCase() === 'price'
    ).length;
    const dominant = sacCount >= priceCount ? 'SAC' : 'Price';

    return {
      total,
      todayCount,
      monthCount,
      totalVolume,
      averageTicket,
      sacCount,
      priceCount,
      dominant,
    };
  }, [proposals]);

  // Monthly Chart Aggregation (past 6 months)
  const chartData = useMemo(() => {
    const monthsMap: Record<string, { monthName: string; count: number; volume: number }> = {};
    const now = new Date();

    // Generate past 6 months structure
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');
      monthsMap[key] = { monthName, count: 0, volume: 0 };
    }

    // Aggregate proposals into months
    proposals.forEach((p) => {
      const d = new Date(p.payload.submittedAt || p.created_at || 0);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthsMap[key]) {
        monthsMap[key].count += 1;
        monthsMap[key].volume += Number(p.payload.financingValue || 0);
      }
    });

    const items = Object.values(monthsMap);
    const maxVolume = Math.max(...items.map((i) => i.volume), 100000);
    const maxCount = Math.max(...items.map((i) => i.count), 1);

    return { items, maxVolume, maxCount };
  }, [proposals]);

  // Render Auth Loading Screen
  if (isCheckingAuth) {
    return (
      <div className="py-24 bg-[#0F172A] min-h-[calc(100vh-140px)] flex items-center justify-center text-[#CBD5E1]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#FF6B1A] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold tracking-wide">Verificando autorização de acesso...</span>
        </div>
      </div>
    );
  }

  // Render Admin Login Modal if Not Authenticated
  if (!isAuthenticated) {
    return (
      <AdminLoginForm
        onLoginSuccess={handleLoginSuccess}
        isSupabaseConfigured={isSupabaseConfigured}
      />
    );
  }

  return (
    <div className="pb-16 px-4 sm:px-6 lg:px-8 bg-[#0F172A] min-h-[calc(100vh-140px)] flex-1 pt-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-gradient-to-r from-[#1E293B] to-[#0F172A] p-6 sm:p-8 rounded-2xl shadow-xl border border-[#334155] gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#FF6B1A] text-white text-[10px] font-bold px-3 py-1.5 rounded-md uppercase tracking-widest shadow-[0_4px_12px_rgba(255,107,26,0.3)] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Mesa de Crédito — Área Restrita
              </span>
              <span className="bg-[#0F172A] text-[#CBD5E1] border border-[#334155] text-[10px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {adminUser?.nome || 'Admin Gestor'} ({adminUser?.email || 'Autenticado'})
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Estúdio Fourcred de Operações
            </h1>
            <p className="text-xs sm:text-sm text-[#CBD5E1] font-medium leading-relaxed">
              Painel analítico de pré-aprovação de crédito imobiliário e controle regulatório.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-wider font-extrabold text-white rounded-xl bg-gradient-to-r from-[#FF6B1A] to-[#E85D04] hover:brightness-110 transition-all shadow-[0_4px_12px_rgba(255,107,26,0.3)] cursor-pointer"
              title="Abrir Módulo de Relatórios em PDF e Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Relatórios PDF & Excel
            </button>

            <button
              type="button"
              onClick={() => setIsAdminModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-wider font-bold text-[#CBD5E1] hover:text-white rounded-xl border border-[#334155] transition-all bg-[#0F172A] hover:bg-[#334155] cursor-pointer"
              title="Gerenciar e cadastrar novos administradores do sistema"
            >
              <UserPlus className="w-4 h-4 text-[#FF6B1A]" />
              Gerenciar Gestores
            </button>

            <button
              type="button"
              onClick={loadProposals}
              className="flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-wider font-bold text-[#CBD5E1] hover:text-white rounded-xl border border-[#334155] transition-all bg-[#0F172A] hover:bg-[#334155] cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#FF6B1A]' : ''}`} />
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-wider font-bold text-red-400 hover:text-red-300 rounded-xl border border-red-500/30 hover:border-red-500/60 transition-all bg-[#0F172A] hover:bg-red-500/10 cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>

        {/* Global Error Alert State */}
        {errorMessage && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 font-semibold flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={loadProposals}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg transition-colors text-[11px] uppercase font-bold shrink-0 cursor-pointer"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* KPI Metrics Cards (6 Grid Layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* Metric 1: Total Cadastros */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-[#FF6B1A]/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] text-[#CBD5E1]/70 uppercase tracking-widest font-bold">
                Total Cadastros
              </span>
              <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center text-[#CBD5E1] border border-[#334155] group-hover:bg-[#FF6B1A] group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">{metrics.total}</h2>
              <p className="text-[10px] text-[#FF6B1A] font-bold mt-1">Acumulado geral</p>
            </div>
          </div>

          {/* Metric 2: Cadastros do Dia */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-[#FF6B1A]/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] text-[#CBD5E1]/70 uppercase tracking-widest font-bold">
                Cadastros do Dia
              </span>
              <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center text-amber-400 border border-[#334155]">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">{metrics.todayCount}</h2>
              <p className="text-[10px] text-amber-400 font-bold mt-1">Recebidos hoje</p>
            </div>
          </div>

          {/* Metric 3: Cadastros do Mês */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-[#FF6B1A]/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] text-[#CBD5E1]/70 uppercase tracking-widest font-bold">
                Cadastros do Mês
              </span>
              <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center text-cyan-400 border border-[#334155]">
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white">{metrics.monthCount}</h2>
              <p className="text-[10px] text-cyan-400 font-bold mt-1">Este mês corrente</p>
            </div>
          </div>

          {/* Metric 4: Volume Financiado */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-[#FF6B1A]/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] text-[#CBD5E1]/70 uppercase tracking-widest font-bold">
                Volume Financiado
              </span>
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                <span className="text-xs align-top mr-1 font-bold text-[#CBD5E1]/50">R$</span>
                {metrics.totalVolume >= 1000000
                  ? (metrics.totalVolume / 1000000).toFixed(2) + 'M'
                  : metrics.totalVolume.toLocaleString('pt-BR')}
              </h2>
              <p className="text-[10px] text-emerald-400 font-bold mt-1">Volume total ativo</p>
            </div>
          </div>

          {/* Metric 5: Ticket Médio */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-[#FF6B1A]/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] text-[#CBD5E1]/70 uppercase tracking-widest font-bold">
                Ticket Médio
              </span>
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#1E293B]">
                <Calculator className="w-4 h-4 text-[#1E293B]" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                <span className="text-xs align-top mr-1 font-bold text-[#CBD5E1]/50">R$</span>
                {Math.round(metrics.averageTicket).toLocaleString('pt-BR')}
              </h2>
              <p className="text-[10px] text-[#CBD5E1]/70 font-bold mt-1">Média por contrato</p>
            </div>
          </div>

          {/* Metric 6: Amortização */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-5 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-[#FF6B1A]/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] text-[#CBD5E1]/70 uppercase tracking-widest font-bold">
                Amortização
              </span>
              <div className="w-8 h-8 bg-[#FF6B1A]/10 rounded-lg flex items-center justify-center text-[#FF6B1A] border border-[#FF6B1A]/20">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase">{metrics.dominant}</h2>
              <p className="text-[10px] text-[#CBD5E1]/70 font-bold mt-1">
                {metrics.sacCount} SAC vs {metrics.priceCount} Price
              </p>
            </div>
          </div>
        </div>

        {/* Growth & Monthly Evolution Chart Component */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#334155] pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#FF6B1A]/10 rounded-xl border border-[#FF6B1A]/20 text-[#FF6B1A]">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Evolução Mensal & Gráfico de Crescimento
                </h3>
                <p className="text-xs text-[#CBD5E1]/60">
                  Volume de crédito financiado (R$) e número de cadastros por mês.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-[#CBD5E1]/70 self-end sm:self-auto">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-gradient-to-t from-[#FF6B1A] to-[#E85D04]" />
                <span>Volume (R$)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Qtd Cadastros</span>
              </div>
            </div>
          </div>

          {/* SVG Responsive Bar & Trend Chart */}
          <div className="pt-2 pb-1">
            <div className="h-44 sm:h-52 w-full flex items-end justify-between gap-2 sm:gap-6 px-2">
              {chartData.items.map((item, idx) => {
                const heightPercent =
                  chartData.maxVolume > 0 ? Math.max(12, Math.round((item.volume / chartData.maxVolume) * 100)) : 12;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0F172A] border border-[#334155] p-2 rounded-lg text-[10px] font-semibold text-white whitespace-nowrap z-20 shadow-xl pointer-events-none">
                      <div>
                        R$ {item.volume.toLocaleString('pt-BR')} ({item.count} propostas)
                      </div>
                    </div>

                    {/* Quantity Badge */}
                    {item.count > 0 && (
                      <span className="text-[10px] font-bold text-emerald-400 mb-1.5 flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        {item.count}
                      </span>
                    )}

                    {/* Bar */}
                    <div
                      className="w-full max-w-[48px] bg-gradient-to-t from-[#E85D04] via-[#FF6B1A] to-[#FF8C42] rounded-t-lg transition-all duration-300 group-hover:brightness-125 shadow-[0_4px_12px_rgba(255,107,26,0.2)]"
                      style={{ height: `${heightPercent}%` }}
                    />

                    {/* Month Label */}
                    <span className="text-[11px] font-bold text-[#CBD5E1]/70 mt-3 group-hover:text-white transition-colors">
                      {item.monthName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Proposals Table Section */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl overflow-hidden shadow-md flex flex-col">
          {/* Controls, Filters & Search Header */}
          <div className="p-5 border-b border-[#334155] bg-[#0F172A] space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-[#CBD5E1]/50 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome do proponente, CPF, e-mail ou código #FC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl py-2.5 pl-11 pr-4 text-xs font-medium text-white focus:outline-none focus:border-[#FF6B1A] focus:ring-1 focus:ring-[#FF6B1A]/40 placeholder:text-[#CBD5E1]/40 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#CBD5E1]/50 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Select Controls: Period & Sort */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Period Selector */}
                <div className="flex items-center gap-1.5 bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-1.5 text-xs text-[#CBD5E1]">
                  <Calendar className="w-3.5 h-3.5 text-[#FF6B1A]" />
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-2 text-xs"
                  >
                    <option value="Todos" className="bg-[#0F172A]">Todos os Períodos</option>
                    <option value="Hoje" className="bg-[#0F172A]">Hoje</option>
                    <option value="Esta Semana" className="bg-[#0F172A]">Esta Semana</option>
                    <option value="Este Mês" className="bg-[#0F172A]">Este Mês</option>
                    <option value="Este Ano" className="bg-[#0F172A]">Este Ano</option>
                  </select>
                </div>

                {/* Sort Selector */}
                <div className="flex items-center gap-1.5 bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-1.5 text-xs text-[#CBD5E1]">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#FF6B1A]" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer pr-2 text-xs"
                  >
                    <option value="date-desc" className="bg-[#0F172A]">Mais Recentes</option>
                    <option value="date-asc" className="bg-[#0F172A]">Mais Antigos</option>
                    <option value="value-desc" className="bg-[#0F172A]">Maior Valor</option>
                    <option value="value-asc" className="bg-[#0F172A]">Menor Valor</option>
                    <option value="name-asc" className="bg-[#0F172A]">Nome (A-Z)</option>
                  </select>
                </div>

                {/* Export Button */}
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="flex items-center gap-1.5 bg-[#0F172A] border border-[#334155] hover:border-[#FF6B1A] text-[#CBD5E1] hover:text-white rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer"
                  title="Exportar todos os registros filtrados em PDF ou Excel"
                >
                  <FileText className="w-3.5 h-3.5 text-[#FF6B1A]" />
                  <span>Exportar Relatórios</span>
                </button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              <span className="text-[11px] font-bold text-[#CBD5E1]/50 uppercase tracking-widest mr-1 shrink-0">
                Status:
              </span>
              {['Todos', 'Pendente', 'Em Análise', 'Aprovado', 'Recusado'].map((st) => {
                const count =
                  st === 'Todos'
                    ? proposals.length
                    : proposals.filter((p) => (p.status || 'Pendente') === st).length;

                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedStatus === st
                        ? 'bg-[#FF6B1A] text-white shadow-sm'
                        : 'bg-[#1E293B] text-[#CBD5E1] border border-[#334155] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{st}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        selectedStatus === st ? 'bg-white/20 text-white' : 'bg-[#0F172A] text-[#CBD5E1]/70'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-x-auto">
            {isLoading ? (
              /* Skeleton Loading State */
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-[#0F172A]/60 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : paginatedProposals.length === 0 ? (
              /* Empty Results State */
              <div className="p-16 text-center text-[#CBD5E1]/50 text-xs flex flex-col items-center justify-center space-y-3">
                <Inbox className="w-12 h-12 stroke-1 opacity-40 text-[#CBD5E1]" />
                <p className="font-bold text-white text-sm">Nenhuma proposta encontrada.</p>
                <p className="max-w-xs text-[#CBD5E1]/70">
                  Não foram encontrados cadastros para os filtros e parâmetros selecionados.
                </p>
                {(searchQuery || selectedStatus !== 'Todos' || selectedPeriod !== 'Todos') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedStatus('Todos');
                      setSelectedPeriod('Todos');
                    }}
                    className="mt-2 px-4 py-2 bg-[#FF6B1A] hover:bg-[#E85D04] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            ) : (
              /* Data Table */
              <table className="w-full text-left text-xs text-white">
                <thead>
                  <tr className="text-[10px] text-[#CBD5E1]/70 uppercase tracking-widest font-bold border-b border-[#334155] bg-[#0F172A]">
                    <th className="px-6 py-3.5 whitespace-nowrap">ID / Envio</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Titular Principal (P1)</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Cônjuge (P2)?</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Valor Imóvel</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Financiado</th>
                    <th className="px-6 py-3.5 whitespace-nowrap">Status</th>
                    <th className="px-6 py-3.5 whitespace-nowrap text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#334155]">
                  {paginatedProposals.map((item) => {
                    const p1 = item.payload.p1;
                    const dateFormatted = new Date(
                      item.payload.submittedAt || item.created_at || Date.now()
                    ).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    const currentStatus = item.status || 'Pendente';

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedProposal(item)}
                        className="hover:bg-white/5 cursor-pointer bg-transparent transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-white text-xs">#{item.id}</div>
                          <div className="text-[10px] text-[#CBD5E1]/50 mt-0.5 font-medium">
                            {dateFormatted}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-white text-xs">{p1?.fullName}</div>
                          <div className="text-[11px] text-[#CBD5E1]/70 font-mono mt-0.5">
                            {p1?.cpf}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${
                              item.payload.hasP2
                                ? 'bg-white text-[#0F172A]'
                                : 'bg-[#0F172A] text-[#CBD5E1]/70 border border-[#334155]'
                            }`}
                          >
                            {item.payload.hasP2 ? 'Sim (Cônjuge)' : 'Não'}
                          </span>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap font-bold text-white text-xs">
                          R$ {Number(item.payload.saleValue || 0).toLocaleString('pt-BR')}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-[#FF6B1A] text-xs">
                            R$ {Number(item.payload.financingValue || 0).toLocaleString('pt-BR')}
                          </div>
                          <div className="text-[10px] text-[#CBD5E1]/70 uppercase tracking-widest mt-0.5 font-bold">
                            {item.payload.termYears} anos •{' '}
                            {String(item.payload.amortizationSystem || '').toUpperCase()}
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 bg-[#0F172A] border border-[#334155] px-2.5 py-1 rounded-lg w-max shadow-sm">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                currentStatus === 'Aprovado'
                                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                                  : currentStatus === 'Recusado'
                                  ? 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                                  : 'bg-[#FF6B1A] shadow-[0_0_8px_rgba(255,107,26,0.5)]'
                              }`}
                            />
                            <span className="text-[10px] font-bold text-[#CBD5E1]">
                              {currentStatus}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProposal(item);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 border border-[#334155] text-[#CBD5E1] hover:bg-[#334155] hover:text-white rounded-lg text-[9px] uppercase font-bold tracking-widest transition-all shadow-sm cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Detalhes
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPDF(item);
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#FF6B1A] text-white rounded-lg text-[9px] uppercase font-bold tracking-widest hover:bg-[#E85D04] transition-all shadow-sm cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              PDF
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDelete(item.id, e)}
                              className="w-7 h-7 flex items-center justify-center border border-[#334155] hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 rounded-lg text-[#CBD5E1]/50 transition-all shadow-sm cursor-pointer"
                              title="Excluir proposta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {filteredAndSortedProposals.length > 0 && (
            <div className="p-4 border-t border-[#334155] bg-[#0F172A] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#CBD5E1]">
              <div className="flex items-center gap-3">
                <span>
                  Exibindo{' '}
                  <strong className="text-white">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </strong>{' '}
                  a{' '}
                  <strong className="text-white">
                    {Math.min(currentPage * itemsPerPage, filteredAndSortedProposals.length)}
                  </strong>{' '}
                  de <strong className="text-white">{filteredAndSortedProposals.length}</strong>{' '}
                  registros
                </span>
                <div className="hidden sm:flex items-center gap-1 text-[11px]">
                  <span>| Exibir:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-[#1E293B] border border-[#334155] text-white rounded px-2 py-0.5 focus:outline-none cursor-pointer"
                  >
                    <option value={10}>10 por pg</option>
                    <option value={25}>25 por pg</option>
                    <option value={50}>50 por pg</option>
                  </select>
                </div>
              </div>

              {/* Page Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg border border-[#334155] bg-[#1E293B] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-xs cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-[#FF6B1A] text-white shadow-sm'
                        : 'bg-[#1E293B] text-[#CBD5E1] border border-[#334155] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded-lg border border-[#334155] bg-[#1E293B] hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-xs cursor-pointer flex items-center gap-1"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Inspection Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#1E293B] border border-[#334155] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 text-white my-8">
            <div className="flex justify-between items-start border-b border-[#334155] pb-4">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xs bg-[#FF6B1A]/20 text-[#FF6B1A] font-bold px-2.5 py-1 rounded-md border border-[#FF6B1A]/30">
                    #{selectedProposal.id}
                  </span>
                  <span className="text-xs text-[#CBD5E1]/60">
                    Recebido em:{' '}
                    {new Date(
                      selectedProposal.payload.submittedAt || selectedProposal.created_at || Date.now()
                    ).toLocaleString('pt-BR')}
                  </span>
                </div>
                <h2 className="text-2xl font-black mt-2">
                  {selectedProposal.payload.p1.fullName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="text-[#CBD5E1] hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Control */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#0F172A] border border-[#334155]">
              <span className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider">
                Status da Análise de Crédito:
              </span>
              <div className="flex flex-wrap gap-2">
                {(['Pendente', 'Em Análise', 'Aprovado', 'Recusado'] as ProposalStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleStatusChange(selectedProposal.id, st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (selectedProposal.status || 'Pendente') === st
                          ? 'bg-[#FF6B1A] text-white shadow-sm'
                          : 'bg-[#1E293B] text-[#CBD5E1] hover:text-white border border-[#334155]'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Details Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Proponente 1 */}
              <div className="bg-[#0F172A] p-5 rounded-xl border border-[#334155] space-y-3">
                <h4 className="font-bold text-[#FF6B1A] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Titular Principal (P1)
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[#CBD5E1]/60 block">CPF:</span>
                    <span className="font-semibold">{selectedProposal.payload.p1.cpf}</span>
                  </div>
                  <div>
                    <span className="text-[#CBD5E1]/60 block">RG:</span>
                    <span className="font-semibold">{selectedProposal.payload.p1.rg}</span>
                  </div>
                  <div>
                    <span className="text-[#CBD5E1]/60 block">Nascimento:</span>
                    <span className="font-semibold">{selectedProposal.payload.p1.dob}</span>
                  </div>
                  <div>
                    <span className="text-[#CBD5E1]/60 block">Estado Civil:</span>
                    <span className="font-semibold capitalize">
                      {selectedProposal.payload.p1.maritalStatus}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#CBD5E1]/60 block">Email:</span>
                    <span className="font-semibold">{selectedProposal.payload.p1.email}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#CBD5E1]/60 block">Celular:</span>
                    <span className="font-semibold">{selectedProposal.payload.p1.phoneMobile}</span>
                  </div>
                  <div>
                    <span className="text-[#CBD5E1]/60 block">Profissão:</span>
                    <span className="font-semibold">{selectedProposal.payload.p1.profession}</span>
                  </div>
                  <div>
                    <span className="text-[#CBD5E1]/60 block">Renda Bruta:</span>
                    <span className="font-semibold text-emerald-400">
                      R$ {Number(selectedProposal.payload.p1.salary || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Co-Proponente (P2) */}
              <div className="bg-[#0F172A] p-5 rounded-xl border border-[#334155] space-y-3">
                <h4 className="font-bold text-[#FF6B1A] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Segundo Proponente (P2)
                </h4>
                {selectedProposal.payload.hasP2 && selectedProposal.payload.p2 ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <span className="text-[#CBD5E1]/60 block">Nome:</span>
                      <span className="font-semibold">{selectedProposal.payload.p2.fullName}</span>
                    </div>
                    <div>
                      <span className="text-[#CBD5E1]/60 block">Relacionamento:</span>
                      <span className="font-semibold">{selectedProposal.payload.p2Relationship}</span>
                    </div>
                    <div>
                      <span className="text-[#CBD5E1]/60 block">CPF:</span>
                      <span className="font-semibold">{selectedProposal.payload.p2.cpf}</span>
                    </div>
                    <div>
                      <span className="text-[#CBD5E1]/60 block">Profissão:</span>
                      <span className="font-semibold">{selectedProposal.payload.p2.profession}</span>
                    </div>
                    <div>
                      <span className="text-[#CBD5E1]/60 block">Renda Bruta:</span>
                      <span className="font-semibold text-emerald-400">
                        R$ {Number(selectedProposal.payload.p2.salary || 0).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#CBD5E1]/50 italic pt-4">
                    Nenhum coparticipante adicionado na proposta.
                  </p>
                )}
              </div>

              {/* Property and Operation */}
              <div className="bg-[#0F172A] p-5 rounded-xl border border-[#334155] space-y-3 md:col-span-2">
                <h4 className="font-bold text-[#FF6B1A] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4" /> Objeto da Operação e Financiamento
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <span className="text-[#CBD5E1]/60 block">Endereço Pretendido:</span>
                    <span className="font-semibold text-sm">
                      {selectedProposal.payload.targetPropertyAddress}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#CBD5E1]/60 block">Valor da Venda / Avaliação:</span>
                    <span className="font-bold text-white text-sm">
                      R$ {Number(selectedProposal.payload.saleValue || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#CBD5E1]/60 block">Entrada (Recursos Próprios):</span>
                    <span className="font-bold text-white text-sm">
                      R$ {Number(selectedProposal.payload.downPayment || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#CBD5E1]/60 block">Valor a Financiar:</span>
                    <span className="font-bold text-[#FF6B1A] text-sm">
                      R$ {Number(selectedProposal.payload.financingValue || 0).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#CBD5E1]/60 block">Prazo da Operação:</span>
                    <span className="font-semibold">{selectedProposal.payload.termYears} anos</span>
                  </div>
                  <div>
                    <span className="text-[#CBD5E1]/60 block">Sistema de Amortização:</span>
                    <span className="font-semibold uppercase">
                      {selectedProposal.payload.amortizationSystem}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#CBD5E1]/60 block">Uso de FGTS:</span>
                    <span className="font-semibold">
                      {selectedProposal.payload.useFgts === 'sim' || selectedProposal.payload.useFgts === true
                        ? `Sim (R$ ${Number(selectedProposal.payload.fgtsValue || 0).toLocaleString('pt-BR')})`
                        : 'Não'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-[#334155] pt-4">
              <button
                type="button"
                onClick={() => handleDelete(selectedProposal.id)}
                className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Cadastro
              </button>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedProposal(null)}
                  className="px-4 py-2 rounded-xl border border-[#334155] text-xs font-bold text-[#CBD5E1] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedProposal)}
                  className="px-5 py-2 bg-[#FF6B1A] hover:bg-[#E85D04] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#FF6B1A]/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Baixar PDF Regulatória
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report & Export Modal */}
      {isReportModalOpen && (
        <ReportExportModal
          proposals={proposals}
          onClose={() => setIsReportModalOpen(false)}
          adminName={adminUser?.nome}
        />
      )}

      {/* Admin Manager Modal */}
      {isAdminModalOpen && (
        <AdminManagerModal
          onClose={() => setIsAdminModalOpen(false)}
          currentAdminEmail={adminUser?.email}
        />
      )}
    </div>
  );
};
