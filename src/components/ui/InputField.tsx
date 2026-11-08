import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  name,
  error,
  icon,
  rightElement,
  type = 'text',
  className = '',
  containerClassName = '',
  required,
  ...props
}) => {
  return (
    <div className={`flex flex-col space-y-2 ${containerClassName}`}>
      <label htmlFor={name} className="text-[12px] font-bold text-[#CBD5E1] tracking-wide flex items-center gap-1">
        {label}
        {required && <span className="text-[#FF6B1A]">*</span>}
      </label>
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 flex items-center text-[#CBD5E1]/50 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          className={`w-full px-4 py-3 bg-[#0F172A] border border-[#334155] rounded-xl text-[14px] font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B1A]/20 focus:border-[#FF6B1A] transition-all placeholder:text-[#64748B] ${
            icon ? 'pl-10' : ''
          } ${rightElement ? 'pr-[140px]' : ''} ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <span className="text-[11px] font-semibold text-red-400 mt-1">{error}</span>
      )}
    </div>
  );
};
