import React from 'react';

interface TextareaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  name: string;
  error?: string;
  containerClassName?: string;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  label,
  name,
  error,
  containerClassName = '',
  className = '',
  rows = 3,
  required,
  ...props
}) => {
  return (
    <div className={`flex flex-col space-y-2 ${containerClassName}`}>
      <label htmlFor={name} className="text-[12px] font-bold text-[#CBD5E1] tracking-wide flex items-center gap-1">
        {label}
        {required && <span className="text-[#FF6B1A]">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        className={`px-4 py-3 bg-[#0F172A] border border-[#334155] rounded-xl text-[14px] font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B1A]/20 focus:border-[#FF6B1A] transition-all placeholder:text-[#64748B] resize-none ${className}`}
        {...props}
      />
      {error && (
        <span className="text-[11px] font-semibold text-red-400 mt-1">{error}</span>
      )}
    </div>
  );
};
