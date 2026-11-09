import React, { useState } from 'react';
import { proposalService, AdminProfile } from '../../services/proposalService';
import { InputField } from '../ui/InputField';
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, KeyRound, CheckCircle2, ChevronLeft } from 'lucide-react';

interface AdminLoginFormProps {
  onLoginSuccess: (admin: AdminProfile) => void;
  isSupabaseConfigured: boolean;
}

export const AdminLoginForm: React.FC<AdminLoginFormProps> = ({
  onLoginSuccess,
}) => {
  // Check session storage if master passcode was already verified in current browser session
  const [isPasscodeVerified, setIsPasscodeVerified] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('fourcred_gestor_passcode_verified') === 'true';
    }
    return false;
  });

  // Step 1 state: Master passcode (fourcred)
  const [accessPasscode, setAccessPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Step 2 state: Email + Password for Supabase login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Step 1: Validate Master Passcode
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);

    const entered = accessPasscode.trim().toLowerCase();
    if (entered === 'fourcred') {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fourcred_gestor_passcode_verified', 'true');
      }
      setIsPasscodeVerified(true);
    } else {
      setPasscodeError('Senha de acesso incorreta. Verifique e tente novamente.');
    }
  };

  // Handle Step 2: Supabase Auth Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha o e-mail e a senha do gestor.');
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

  const handleResetPasscode = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('fourcred_gestor_passcode_verified');
    }
    setIsPasscodeVerified(false);
    setAccessPasscode('');
    setPasscodeError(null);
  };

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 bg-[#0F172A] min-h-[calc(100vh-140px)] flex flex-col justify-center items-center">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Badge Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 text-[#FF6B1A] mb-2 shadow-lg shadow-[#FF6B1A]/10">
            {isPasscodeVerified ? (
              <ShieldCheck className="w-8 h-8" />
            ) : (
              <KeyRound className="w-8 h-8 text-[#FF6B1A]" />
            )}
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {isPasscodeVerified ? 'Mesa de Crédito Fourcred' : 'Acesso à Área de Gestão'}
          </h2>
          <p className="text-xs text-[#CBD5E1] max-w-xs mx-auto">
            {isPasscodeVerified
              ? 'Insira suas credenciais de gestor para acessar o painel.'
              : 'Informe a senha de liberação para acessar a tela de login.'}
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {!isPasscodeVerified ? (
            /* STEP 1: MASTER PASSCODE VALIDATION */
            <form onSubmit={handlePasscodeSubmit} className="space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Lock className="w-3 h-3" />
                <span>Etapa 1 de 2: Validação de Segurança</span>
              </div>

              {passcodeError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span className="font-semibold leading-relaxed">{passcodeError}</span>
                </div>
              )}

              <InputField
                label="Senha de Liberação de Gestor"
                name="accessPasscode"
                type="password"
                required
                placeholder="Digitar senha de acesso..."
                icon={<KeyRound className="w-4 h-4" />}
                value={accessPasscode}
                onChange={(e) => setAccessPasscode(e.target.value)}
              />

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-[#FF6B1A] to-[#E85D04] hover:brightness-110 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-[#FF6B1A]/20 transition-all focus:outline-none flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Acessar Login do Gestor</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* STEP 2: GESTOR LOGIN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div className="flex items-center justify-between mb-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Acesso Liberado (Etapa 2/2)</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetPasscode}
                  className="text-[10px] text-[#CBD5E1]/60 hover:text-white flex items-center gap-1 transition-colors font-semibold"
                  title="Bloquear novamenete"
                >
                  <ChevronLeft className="w-3 h-3" />
                  Bloquear
                </button>
              </div>

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
                label="Senha do Gestor"
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
          )}
        </div>
      </div>
    </div>
  );
};
