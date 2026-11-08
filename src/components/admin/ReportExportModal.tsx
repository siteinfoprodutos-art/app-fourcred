import React, { useState, useMemo } from 'react';
import { ProposalRecord } from '../../types/proposal';
import {
  ReportFilterOptions,
  filterProposalsForReport,
  generateProposalsPDFReport,
  generateProposalsExcelReport,
} from '../../services/reportExportService';
import { proposalService } from '../../services/proposalService';
import {
  X,
  FileSpreadsheet,
  FileText,
  Filter,
  Calendar,
  CheckCircle2,
  DollarSign,
  Search,
  RefreshCcw,
  SlidersHorizontal,
} from 'lucide-react';

interface ReportExportModalProps {
  proposals: ProposalRecord[];
  onClose: () => void;
  adminName?: string;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  proposals,
  onClose,
  adminName = 'Administrador Fourcred',
}) => {
  const [filters, setFilters] = useState<ReportFilterOptions>({
    startDate: '',
    endDate: '',
    status: 'Todos',
    amortizationSystem: 'Todos',
    hasP2: 'Todos',
    usedFgts: 'Todos',
    searchQuery: '',
  });

  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compute filtered dataset
  const filteredProposals = useMemo(() => {
    return filterProposalsForReport(proposals, filters);
  }, [proposals, filters]);

  // Compute metrics for filtered dataset
  const totalVolume = useMemo(() => {
    return filteredProposals.reduce((acc, p) => acc + Number(p.payload.financingValue || 0), 0);
  }, [filteredProposals]);

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: 'Todos',
      amortizationSystem: 'Todos',
      hasP2: 'Todos',
      usedFgts: 'Todos',
      searchQuery: '',
    });
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    setSuccessMsg(null);
    try {
      generateProposalsPDFReport(filteredProposals, filters, adminName);
      await proposalService.logReportExport('pdf', filters, filteredProposals.length);
      setSuccessMsg(`Relatório PDF com ${filteredProposals.length} registros gerado com sucesso!`);
    } catch (err: any) {
      alert(`Erro ao gerar PDF: ${err?.message || 'Falha de processamento'}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    setSuccessMsg(null);
    try {
      generateProposalsExcelReport(filteredProposals, filters, adminName);
      await proposalService.logReportExport('excel', filters, filteredProposals.length);
      setSuccessMsg(`Planilha Excel com ${filteredProposals.length} registros gerada com sucesso!`);
    } catch (err: any) {
      alert(`Erro ao gerar Excel: ${err?.message || 'Falha de processamento'}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 text-white my-8 relative">
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b border-[#334155] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FF6B1A]/10 rounded-xl border border-[#FF6B1A]/20 text-[#FF6B1A]">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Módulo de Relatórios & Exportação
              </h2>
              <p className="text-xs text-[#CBD5E1]/70 mt-0.5">
                Gere documentos executivos em PDF ou planilhas Excel consolidadas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#CBD5E1]/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Filters Form */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#CBD5E1] uppercase tracking-widest flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#FF6B1A]" />
              Filtros Avançados do Relatório
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-[#CBD5E1]/60 hover:text-[#FF6B1A] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCcw className="w-3 h-3" />
              Limpar Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0F172A] p-4 rounded-xl border border-[#334155]">
            {/* Start Date */}
            <div>
              <label className="block text-[11px] font-semibold text-[#CBD5E1] mb-1">
                Data Inicial:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <label className="block text-[11px] font-semibold text-[#CBD5E1] mb-1">
                Data Final:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-semibold text-[#CBD5E1] mb-1">
                Status da Proposta:
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full bg-[#1E293B] border border-[#334155] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#FF6B1A] cursor-pointer"
              >
                <option value="Todos">Todos os Status</option>
                <option value="Pendente">Pendente</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Recusado">Recusado</option>
              </select>
            </div>

            {/* Amortization System */}
            <div>
              <label className="block text-[11px] font-semibold text-[#CBD5E1] mb-1">
                Sistema de Amortização:
              </label>
              <select
                value={filters.amortizationSystem}
                onChange={(e) => setFilters({ ...filters, amortizationSystem: e.target.value })}
                className="w-full bg-[#1E293B] border border-[#334155] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#FF6B1A] cursor-pointer"
              >
                <option value="Todos">Todos (SAC / Price)</option>
                <option value="SAC">SAC (Sistema Amortização Constante)</option>
                <option value="Price">Price (Tabela Price)</option>
              </select>
            </div>

            {/* Co-Proposer P2 */}
            <div>
              <label className="block text-[11px] font-semibold text-[#CBD5E1] mb-1">
                Possui Cônjuge (P2):
              </label>
              <select
                value={filters.hasP2}
                onChange={(e) => setFilters({ ...filters, hasP2: e.target.value })}
                className="w-full bg-[#1E293B] border border-[#334155] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#FF6B1A] cursor-pointer"
              >
                <option value="Todos">Todos</option>
                <option value="Sim">Sim (Com Proponente 2)</option>
                <option value="Não">Não (Individual)</option>
              </select>
            </div>

            {/* FGTS Usage */}
            <div>
              <label className="block text-[11px] font-semibold text-[#CBD5E1] mb-1">
                Uso do FGTS:
              </label>
              <select
                value={filters.usedFgts}
                onChange={(e) => setFilters({ ...filters, usedFgts: e.target.value })}
                className="w-full bg-[#1E293B] border border-[#334155] rounded-lg py-2 px-3 text-xs text-white focus:outline-none focus:border-[#FF6B1A] cursor-pointer"
              >
                <option value="Todos">Todos</option>
                <option value="Sim">Sim (Com Saldo FGTS)</option>
                <option value="Não">Não</option>
              </select>
            </div>

            {/* Text Search */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-[#CBD5E1] mb-1">
                Filtrar por Nome, CPF, E-mail ou Código:
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#CBD5E1]/50 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Digite para pesquisar..."
                  value={filters.searchQuery || ''}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-lg py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Counter Box */}
        <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] p-4 rounded-xl border border-[#334155] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-[#CBD5E1]/70 font-bold uppercase tracking-widest block">
              Resultado dos Filtros Selecionados
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-white">{filteredProposals.length}</span>
              <span className="text-xs text-[#CBD5E1]/80 font-medium">
                cadastros correspondem aos critérios (de {proposals.length} totais)
              </span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[10px] text-[#CBD5E1]/70 font-bold uppercase tracking-widest block">
              Volume Financiado Selecionado
            </span>
            <span className="text-lg font-black text-[#FF6B1A]">
              R$ {totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#334155] text-xs font-bold text-[#CBD5E1] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            disabled={filteredProposals.length === 0 || isExportingExcel}
            onClick={handleExportExcel}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {isExportingExcel ? 'Gerando Excel...' : 'Exportar Planilha Excel (.xlsx)'}
          </button>
          <button
            type="button"
            disabled={filteredProposals.length === 0 || isExportingPDF}
            onClick={handleExportPDF}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FF6B1A] hover:bg-[#E85D04] text-white text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {isExportingPDF ? 'Gerando PDF...' : 'Exportar Relatório PDF'}
          </button>
        </div>
      </div>
    </div>
  );
};
