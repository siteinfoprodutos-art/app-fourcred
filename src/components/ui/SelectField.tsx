import React from 'react';

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  name: string;
  options: SelectOption[];
  error?: string;
  containerClassName?: string;
  placeholderOption?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  options,
  error,
  containerClassName = '',
  className = '',
  placeholderOption = 'Selecione...',
  required,
  ...props
}) => {
  return (
    <div className={`flex flex-col space-y-2 ${containerClassName}`}>
      <label htmlFor={name} className="text-[12px] font-bold text-[#CBD5E1] tracking-wide flex items-center gap-1">
        {label}
        {required && <span className="text-[#FF6B1A]">*</span>}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          required={required}
          className={`w-full px-4 py-3 bg-[#0F172A] border border-[#334155] rounded-xl text-[14px] font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B1A]/20 focus:border-[#FF6B1A] transition-all appearance-none cursor-pointer pr-10 ${className}`}
          {...props}
        >
          {placeholderOption && (
            <option value="" className="bg-[#0F172A] text-[#64748B]">
              {placeholderOption}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#0F172A] text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#CBD5E1]/60">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
      {error && (
        <span className="text-[11px] font-semibold text-red-400 mt-1">{error}</span>
      )}
    </div>
  );
};
