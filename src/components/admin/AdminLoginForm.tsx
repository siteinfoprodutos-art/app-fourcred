import React, { useState } from 'react';
import { proposalService, AdminProfile } from '../../services/proposalService';
import { InputField } from '../ui/InputField';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

interface AdminLoginFormProps {
  onLoginSuccess: (admin: AdminProfile) => void;
  isSupabaseConfigured: boolean;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha o e-mail e a senha.');
      return;
    }

    try {
      setIsLoading(true);
      const session = await proposalService.login(email.trim(), password);
      onLoginSuccess(session.adminInfo);
    } catch (err: any) {
      setError(err?.message || 'Falha ao realizar login. Verifique suas credenciais.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 bg-[#0F172A] min-h-[calc(100vh-140px)] flex flex-col justify-center items-center">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 text-[#FF6B1A] mb-2 shadow-lg shadow-[#FF6B1A]/10">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Mesa de Crédito Fourcred
          </h2>
          <p className="text-xs text-[#CBD5E1] max-w-xs mx-auto">
            Acesso administrativo restrito a gestores cadastrados e autorizados.
          </p>
        </div>

        {/* Form Box */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            <InputField
              label="E-mail Administrativo"
              name="adminEmail"
              type="email"
              required
              placeholder="gestor@fourcred.com.br"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <InputField
              label="Senha de Acesso"
              name="adminPassword"
              type="password"
              required
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-[#FF6B1A] hover:bg-[#E85D04] text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#FF6B1A]/20 transition-all focus:outline-none flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar na Área de Gestão</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
