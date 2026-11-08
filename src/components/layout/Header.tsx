import React from 'react';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentPath, onNavigate }) => {
  const isForm = currentPath === '/';
  const isAdmin = currentPath === '/admin';

  return (
    <header className="flex flex-col md:flex-row items-center justify-between px-4 sm:px-8 py-4 border-b border-[#334155] bg-[#1E293B] gap-4 sticky top-0 z-40 backdrop-blur-md bg-[#1E293B]/95">
      {/* Brand Logo */}
      <div className="flex items-center w-full justify-between md:w-auto md:justify-start">
        <button
          onClick={() => onNavigate('/')}
          className="relative inline-flex items-baseline pb-2 px-1 group cursor-pointer focus:outline-none"
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

        {/* Mobile quick indicator */}
        <div className="flex md:hidden items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#E85D04] shadow-md border border-[#334155] flex items-center justify-center text-xs font-bold text-white">
            LA
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex gap-6 sm:gap-8 text-sm font-semibold w-full justify-center md:w-auto md:justify-start overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className={`cursor-pointer transition-colors whitespace-nowrap text-sm font-bold relative py-1 focus:outline-none ${
            isForm
              ? 'text-[#FF6B1A]'
              : 'text-[#CBD5E1] hover:text-white'
          }`}
        >
          Formulários
          {isForm && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6B1A] rounded-full" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/admin')}
          className={`cursor-pointer transition-colors whitespace-nowrap text-sm font-bold relative py-1 focus:outline-none ${
            isAdmin
              ? 'text-[#FF6B1A]'
              : 'text-[#CBD5E1] hover:text-white'
          }`}
        >
          Dashboard
          {isAdmin && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6B1A] rounded-full" />
          )}
        </button>
      </nav>

      {/* User Badge */}
      <div className="hidden md:flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-xs font-bold text-white leading-tight">LA Soluções</p>
          <p className="text-[10px] text-[#CBD5E1] font-semibold">Admin Gestor</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FF6B1A] to-[#E85D04] shadow-md border border-[#334155] flex items-center justify-center text-white font-bold text-xs">
          LA
        </div>
      </div>
    </header>
  );
};
