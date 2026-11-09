import React from 'react';
import { Building2, ShieldCheck, ArrowRight, CheckCircle2, Users, FileText } from 'lucide-react';

interface HomeScreenProps {
  onSelectRole: (role: 'cliente' | 'gestor') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectRole }) => {
  return (
    <div className="py-10 sm:py-16 px-4 sm:px-6 lg:px-8 bg-[#0F172A] min-h-[calc(100vh-140px)] flex flex-col justify-center items-center">
      <div className="max-w-5xl w-full space-y-10">
        
        {/* Splash Header / Hero */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 text-[#FF6B1A] text-xs font-bold uppercase tracking-widest shadow-lg shadow-[#FF6B1A]/10">
            <Building2 className="w-4 h-4" />
            <span>Fourcred V2 — Operações Imobiliárias</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Bem-vindo ao Portal <span className="text-[#FF6B1A]">Fourcred</span>
          </h1>

          <p className="text-sm sm:text-base text-[#CBD5E1] font-medium leading-relaxed">
            Selecione o seu perfil para navegar na plataforma. Oferecemos atendimento completo para proponente de crédito e painel analítico para gestores.
          </p>
        </div>

        {/* Profile Choice Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          
          {/* Card 1: Cliente / Proponente */}
          <div className="bg-[#1E293B] border border-[#334155] hover:border-[#FF6B1A]/60 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B1A]/5 rounded-bl-full pointer-events-none group-hover:bg-[#FF6B1A]/10 transition-colors" />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF6B1A] to-[#E85D04] text-white flex items-center justify-center shadow-lg shadow-[#FF6B1A]/20">
                  <FileText className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Acesso Público
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-black text-white group-hover:text-[#FF6B1A] transition-colors">
                  Área do Cliente
                </h2>
                <p className="text-xs sm:text-sm text-[#CBD5E1] mt-2 leading-relaxed">
                  Deseja solicitar ou simular seu financiamento imobiliário? Preencha sua proposta em poucos minutos de forma transparente.
                </p>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-2.5 text-xs text-[#CBD5E1]/90 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sem necessidade de criar conta ou login prévio</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Simulação de parcelas e sistemas SAC / Price</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Envio direto de propostas para análise</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <button
                type="button"
                onClick={() => onSelectRole('cliente')}
                className="w-full py-4 px-6 bg-gradient-to-r from-[#FF6B1A] to-[#E85D04] hover:brightness-110 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#FF6B1A]/25 transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.02]"
              >
                <span>Entrar como Cliente</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Card 2: Gestor / Administração */}
          <div className="bg-[#1E293B] border border-[#334155] hover:border-[#FF6B1A]/60 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF6B1A]/5 rounded-bl-full pointer-events-none group-hover:bg-[#FF6B1A]/10 transition-colors" />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-[#0F172A] border border-[#334155] text-[#FF6B1A] flex items-center justify-center shadow-lg group-hover:border-[#FF6B1A]/50 transition-colors">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Área Restrita
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-black text-white group-hover:text-[#FF6B1A] transition-colors">
                  Mesa de Crédito (Gestor)
                </h2>
                <p className="text-xs sm:text-sm text-[#CBD5E1] mt-2 leading-relaxed">
                  Painel de pré-aprovação de crédito, emissão de relatórios regulatórios e gestão de administradores autorizados.
                </p>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-2.5 text-xs text-[#CBD5E1]/90 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6B1A] shrink-0" />
                  <span>Dashboard analítico e métricas em tempo real</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6B1A] shrink-0" />
                  <span>Exportação em PDF executivo e planilhas Excel</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#FF6B1A] shrink-0" />
                  <span>Gerenciamento e cadastro de múltiplos gestores</span>
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <button
                type="button"
                onClick={() => onSelectRole('gestor')}
                className="w-full py-4 px-6 bg-[#0F172A] hover:bg-[#FF6B1A] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl border border-[#334155] hover:border-[#FF6B1A] shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.02]"
              >
                <Users className="w-4 h-4 text-[#FF6B1A] group-hover:text-white transition-colors" />
                <span>Acessar Mesa de Gestão</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Footer Note */}
        <div className="text-center pt-4">
          <p className="text-xs text-[#CBD5E1]/50 font-medium">
            Fourcred Soluções Financeiras &copy; {new Date().getFullYear()} — Plataforma Homologada de Crédito Imobiliário
          </p>
        </div>

      </div>
    </div>
  );
};
