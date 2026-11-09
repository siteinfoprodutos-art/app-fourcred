import React from 'react';
import { Home, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
  const isHome = currentPath === '/';
  const isCliente = currentPath === '/cliente';
  const isAdmin = currentPath === '/admin';

  return (
    <header className="flex flex-col md:flex-row items-center justify-between px-4 sm:px-8 py-4 border-b border-[#334155] bg-[#1E293B] gap-4 sticky top-0 z-40 backdrop-blur-md bg-[#1E293B]/95">
      {/* Brand Logo */}
      <div className="flex items-center w-full justify-between md:w-auto md:justify-start">
        <button
          onClick={() => onNavigate('/')}
          className="relative inline-flex items-baseline pb-2 px-1 group cursor-pointer focus:outline-none"
          title="Voltar à tela inicial de escolha de perfil"
        >
          <span className="text-[18px] sm:text-[22px] font-black tracking-widest text-white group-hover:text-slate-100 transition-colors">
            FOURCRED
          </span>
          <span className="text-[#FF6B1A] font-black text-[22px] sm:text-[26px] leading-none ml-[1px]">
            $
          </span>
          <svg
            viewBox="0 0 200 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute bottom-0.5 left-0 w-full h-auto text-[#FF6B1A]"
          >
            <path
              d="M5 4 Q 90 22 178 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M170 2 L180 6 L174 14"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>

        {/* Mobile badge */}
        <div className="flex md:hidden items-center gap-2">
          {isAdmin ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#E85D04] shadow-md border border-[#334155] flex items-center justify-center text-xs font-bold text-white">
              FC
            </div>
          ) : (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[#0F172A] text-[#CBD5E1] border border-[#334155]">
              {isCliente ? 'Área Cliente' : 'Fourcred V2'}
            </span>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex items-center gap-4 sm:gap-6 text-sm font-semibold w-full justify-center md:w-auto md:justify-start overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
        {isHome && (
          <span className="text-xs font-bold text-[#FF6B1A] uppercase tracking-widest bg-[#0F172A] px-3.5 py-1.5 rounded-xl border border-[#334155] shadow-sm">
            Portal Fourcred
          </span>
        )}

        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="cursor-pointer transition-colors whitespace-nowrap text-xs sm:text-sm font-bold relative py-1 focus:outline-none flex items-center gap-1.5 text-[#CBD5E1] hover:text-white"
            >
              <Home className="w-4 h-4 text-[#FF6B1A]" />
              <span>Início</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/cliente')}
              className="cursor-pointer transition-colors whitespace-nowrap text-xs sm:text-sm font-bold relative py-1 focus:outline-none text-[#CBD5E1] hover:text-white"
            >
              Formulários
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="cursor-pointer transition-colors whitespace-nowrap text-xs sm:text-sm font-bold relative py-1 focus:outline-none text-[#FF6B1A]"
            >
              Dashboard
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6B1A] rounded-full" />
            </button>
          </>
        )}

        {isCliente && (
          <>
            <button
              type="button"
              onClick={() => onNavigate('/cliente')}
              className="cursor-pointer transition-colors whitespace-nowrap text-xs sm:text-sm font-bold relative py-1 focus:outline-none text-[#FF6B1A]"
            >
              Formulário de Crédito
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6B1A] rounded-full" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="cursor-pointer transition-colors whitespace-nowrap text-xs text-[#CBD5E1]/70 hover:text-white flex items-center gap-1 bg-[#0F172A] px-3 py-1.5 rounded-xl border border-[#334155]"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#FF6B1A]" />
              <span>Trocar Perfil</span>
            </button>
          </>
        )}
      </nav>

      {/* User Badge or Profile Status */}
      <div className="hidden md:flex items-center gap-4 shrink-0">
        {isAdmin ? (
          <>
            <div className="text-right">
              <p className="text-xs font-bold text-white leading-tight">Mesa de Crédito</p>
              <p className="text-[10px] text-[#FF6B1A] font-semibold">Admin Gestor</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#E85D04] shadow-md border border-[#334155] flex items-center justify-center text-white font-bold text-xs">
              FC
            </div>
          </>
        ) : (
          <div className="text-right">
            <p className="text-xs font-bold text-white leading-tight">Fourcred V2</p>
            <p className="text-[10px] text-emerald-400 font-semibold">{isCliente ? 'Sessão do Cliente' : 'Selecione o Perfil'}</p>
          </div>
        )}
      </div>
    </header>
  );
};
