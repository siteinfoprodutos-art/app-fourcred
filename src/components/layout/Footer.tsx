import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="px-4 sm:px-8 py-6 sm:py-4 bg-[#0F172A] border-t border-[#334155] flex flex-col sm:flex-row justify-between items-center mt-auto gap-4">
      <div className="flex items-center gap-2 text-xs text-[#CBD5E1]/60">
        <span>© {new Date().getFullYear()} Fourcred Soluções Imobiliárias.</span>
        <span className="hidden sm:inline">•</span>
        <span className="hidden sm:inline">Correspondente Bancário & Gestão de Crédito</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="flex items-center gap-2 bg-[#1E293B] px-3 py-1.5 rounded-full border border-[#334155]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
          <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase inline">
            Sistema Operacional
          </span>
        </div>
        <span className="text-[11px] text-[#CBD5E1]/50 font-medium hidden sm:inline">
          MVP v2.0 - Fintech UI
        </span>
      </div>
    </footer>
  );
};
