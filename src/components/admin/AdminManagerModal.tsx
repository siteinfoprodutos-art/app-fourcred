import React, { useState, useEffect } from 'react';
import { proposalService, AdminProfile } from '../../services/proposalService';
import { X, UserPlus, ShieldCheck, Mail, Lock, User, Briefcase, CheckCircle2, AlertCircle, RefreshCw, Users } from 'lucide-react';

interface AdminManagerModalProps {
  onClose: () => void;
  currentAdminEmail?: string;
}

export const AdminManagerModal: React.FC<AdminManagerModalProps> = ({ onClose, currentAdminEmail }) => {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('Gestor de Crédito');
  const [password, setPassword] = useState('fourcred');

  const loadAdmins = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await proposalService.getAdminList();
      setAdmins(list);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar lista de administradores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!nome.trim() || !email.trim()) {
      setError('Por favor, preencha o nome e o e-mail do administrador.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newAdmin = await proposalService.createAdmin({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        cargo: cargo.trim(),
        password: password.trim() || 'fourcred',
      });

      setSuccessMsg(`Administrador "${newAdmin.nome}" cadastrado com sucesso!`);
      setNome('');
      setEmail('');
      setCargo('Gestor de Crédito');
      setPassword('fourcred');
      loadAdmins();
    } catch (err: any) {
      setError(err?.message || 'Falha ao cadastrar novo administrador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#1E293B] border border-[#334155] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6 text-white my-8 relative">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-[#334155] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#FF6B1A]/10 rounded-2xl border border-[#FF6B1A]/20 text-[#FF6B1A]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Gestão de Administradores
              </h2>
              <p className="text-xs text-[#CBD5E1]/70 mt-0.5">
                Cadastre e gerencie os usuários autorizados a acessar a Mesa de Crédito.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#CBD5E1]/60 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 font-semibold flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Box: Cadastrar Novo Administrador */}
        <div className="bg-[#0F172A] border border-[#334155] rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#334155] pb-3">
            <UserPlus className="w-4 h-4 text-[#FF6B1A]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Cadastrar Novo Gestor
            </h3>
          </div>

          <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">
                Nome Completo:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#CBD5E1]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">
                E-mail Administrativo:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#CBD5E1]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="gestor@fourcred.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">
                Cargo / Função:
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-[#CBD5E1]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Gestor de Crédito"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl py-2.5 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1">
                Senha de Acesso:
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#CBD5E1]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="fourcred"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl py-2.5 pl-9 pr-3 text-xs text-white font-mono focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>
            </div>

            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-gradient-to-r from-[#FF6B1A] to-[#E85D04] hover:brightness-110 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Cadastrar Administrador</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Admin List Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#CBD5E1] uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#FF6B1A]" />
              Administradores Cadastrados ({admins.length})
            </span>
            <button
              type="button"
              onClick={loadAdmins}
              className="text-xs text-[#CBD5E1]/60 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar Lista
            </button>
          </div>

          <div className="bg-[#0F172A] border border-[#334155] rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-[#CBD5E1]/50">
                Carregando lista de gestores...
              </div>
            ) : admins.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#CBD5E1]/50">
                Nenhum administrador cadastrado.
              </div>
            ) : (
              <div className="divide-y divide-[#334155]">
                {admins.map((admin) => (
                  <div key={admin.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#FF6B1A]/10 border border-[#FF6B1A]/30 text-[#FF6B1A] flex items-center justify-center font-bold text-sm shrink-0">
                        {admin.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{admin.nome}</span>
                          {currentAdminEmail === admin.email && (
                            <span className="text-[10px] bg-[#FF6B1A] text-white px-2 py-0.5 rounded font-bold uppercase">
                              Você
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#CBD5E1]/70 block">{admin.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#1E293B] text-[#CBD5E1] border border-[#334155]">
                        {admin.cargo || 'Admin Gestor'}
                      </span>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                        Ativo
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-[#334155]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[#334155] text-xs font-bold text-[#CBD5E1] hover:text-white transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
