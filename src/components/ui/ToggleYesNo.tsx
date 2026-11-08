import React from 'react';

interface ToggleYesNoProps {
  label: string;
  sublabel?: string;
  value: 'sim' | 'nao' | string;
  onChange: (value: 'sim' | 'nao') => void;
  error?: string;
}

export const ToggleYesNo: React.FC<ToggleYesNoProps> = ({
  label,
  sublabel,
  value,
  onChange,
  error,
}) => {
  const isSim = value === 'sim';
  const isNao = value === 'nao' || !value;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-6 border-b border-[#334155] last:border-0 gap-4 group">
      <div className="flex-1 pr-4">
        <h3 className="text-[14px] font-bold text-white tracking-wide">{label}</h3>
        {sublabel && (
          <p className="text-[13px] text-[#CBD5E1]/70 mt-1.5 leading-relaxed">{sublabel}</p>
        )}
        {error && <span className="text-[11px] font-semibold text-red-400 mt-1 block">{error}</span>}
      </div>
      <div className="flex bg-[#0F172A] border border-[#334155] rounded-xl p-1.5 shrink-0 w-fit shadow-sm">
        <button
          type="button"
          onClick={() => onChange('sim')}
          className={`px-8 py-2 text-[13px] font-bold rounded-lg transition-all ${
            isSim
              ? 'bg-[#FF6B1A] text-white shadow-md'
              : 'text-[#CBD5E1]/70 hover:text-white hover:bg-white/5'
          }`}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => onChange('nao')}
          className={`px-8 py-2 text-[13px] font-bold rounded-lg transition-all ${
            isNao
              ? 'bg-[#FF6B1A] text-white shadow-md'
              : 'text-[#CBD5E1]/70 hover:text-white hover:bg-white/5'
          }`}
        >
          Não
        </button>
      </div>
    </div>
  );
};
