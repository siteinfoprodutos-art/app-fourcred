import React, { useState, useEffect } from 'react';
import { ProposalPayload } from '../../types/proposal';
import { proposalService } from '../../services/proposalService';
import { InputField } from '../ui/InputField';
import { SelectField } from '../ui/SelectField';
import { TextareaField } from '../ui/TextareaField';
import { ToggleYesNo } from '../ui/ToggleYesNo';
import { maskCPF, maskPhone } from '../../utils/masks';
import { isValidCPF, isValidEmail, isValidPhone } from '../../utils/validation';
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  Check,
  Server,
  Info,
  ShieldCheck,
} from 'lucide-react';

const STEPS = [
  { num: 1, title: 'Dados Pessoais (P1)', subtitle: 'Identidade e contato' },
  { num: 2, title: 'Renda & Trabalho (P1)', subtitle: 'Profissional' },
  { num: 3, title: 'Co-Proponente (P2)', subtitle: 'Cônjuge ou parceiro' },
  { num: 4, title: 'Análise de Crédito', subtitle: 'FGTS e Bens' },
  { num: 5, title: 'Imóvel & Operação', subtitle: 'Financiamento' },
];

const INITIAL_FORM: ProposalPayload = {
  p1: {
    fullName: '',
    cpf: '',
    rg: '',
    dob: '',
    maritalStatus: 'casado',
    hasChildren: 'nao',
    childrenCount: '',
    email: '',
    phoneMobile: '',
    phoneHome: '',
    profession: '',
    serviceTime: '',
    salary: '',
    otherIncomes: '',
    otherIncomesOrigin: '',
    hasFinancing: 'nao',
    hasLoan: 'nao',
  },
  hasP2: false,
  p2Relationship: 'Cônjuge',
  p2: {
    fullName: '',
    cpf: '',
    rg: '',
    dob: '',
    maritalStatus: 'casado',
    email: '',
    phoneMobile: '',
    profession: '',
    serviceTime: '',
    salary: '',
  },
  usedFgts: 'nao',
  fgtsSubsidy: 'nao',
  ownsProperty: 'nao',
  propertyAddress: '',
  propertyFraction: '',
  otherAssets: '',
  targetPropertyAddress: '',
  parkingSpaces: 1,
  saleValue: '',
  downPayment: '',
  useFgts: 'nao',
  fgtsValue: '',
  financingValue: '',
  termYears: 30,
  amortizationSystem: 'sac',
  acceptedTerms: false,
};

export const ProposalForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProposalPayload>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSubmittedId, setLastSubmittedId] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleP1Change = (field: keyof typeof formData.p1, rawValue: any) => {
    let value = rawValue;
    if (field === 'cpf') {
      value = maskCPF(rawValue);
    } else if (field === 'phoneMobile' || field === 'phoneHome') {
      value = maskPhone(rawValue);
    }

    setFormData((prev) => ({
      ...prev,
      p1: {
        ...prev.p1,
        [field]: value,
      },
    }));

    if (errors[`p1.${field}`]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`p1.${field}`];
        return copy;
      });
    }
  };

  const handleP2Change = (field: keyof NonNullable<typeof formData.p2>, rawValue: any) => {
    let value = rawValue;
    if (field === 'cpf') {
      value = maskCPF(rawValue);
    } else if (field === 'phoneMobile') {
      value = maskPhone(rawValue);
    }

    setFormData((prev) => ({
      ...prev,
      p2: {
        ...(prev.p2 || ({} as any)),
        [field]: value,
      },
    }));

    if (errors[`p2.${field}`]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[`p2.${field}`];
        return copy;
      });
    }
  };

  const handleRootChange = (field: keyof ProposalPayload, value: any) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      // Auto calculate approximate financing value when saleValue or downPayment change
      if (field === 'saleValue' || field === 'downPayment' || field === 'fgtsValue' || field === 'useFgts') {
        const sale = Number(field === 'saleValue' ? value : updated.saleValue) || 0;
        const down = Number(field === 'downPayment' ? value : updated.downPayment) || 0;
        const fgtsActive = updated.useFgts === 'sim' || updated.useFgts === true;
        const fgts = fgtsActive
          ? Number(field === 'fgtsValue' ? value : updated.fgtsValue) || 0
          : 0;
        const financed = Math.max(0, sale - down - fgts);
        if (financed > 0 && (!updated.financingValue || Number(updated.financingValue) === 0)) {
          updated.financingValue = financed;
        }
      }

      return updated;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  // Step validation with thorough format and business rules
  const validateCurrentStep = (): boolean => {
    const errs: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.p1.fullName.trim()) {
        errs['p1.fullName'] = 'Nome Completo é obrigatório';
      } else if (formData.p1.fullName.trim().split(' ').length < 2) {
        errs['p1.fullName'] = 'Informe o nome completo sem abreviações';
      }

      if (!formData.p1.cpf.trim()) {
        errs['p1.cpf'] = 'CPF é obrigatório';
      } else if (!isValidCPF(formData.p1.cpf)) {
        errs['p1.cpf'] = 'CPF inválido. Verifique os números digitados.';
      }

      if (!formData.p1.rg.trim()) {
        errs['p1.rg'] = 'RG é obrigatório';
      }

      if (!formData.p1.dob) {
        errs['p1.dob'] = 'Data de nascimento é obrigatória';
      } else {
        const birthDate = new Date(formData.p1.dob);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        if (age < 18 || isNaN(age)) {
          errs['p1.dob'] = 'Proponente deve ter no mínimo 18 anos';
        }
      }

      if (!formData.p1.email.trim()) {
        errs['p1.email'] = 'Email é obrigatório';
      } else if (!isValidEmail(formData.p1.email)) {
        errs['p1.email'] = 'Formato de email inválido (ex: nome@dominio.com)';
      }

      if (!formData.p1.phoneMobile.trim()) {
        errs['p1.phoneMobile'] = 'Celular é obrigatório';
      } else if (!isValidPhone(formData.p1.phoneMobile)) {
        errs['p1.phoneMobile'] = 'Celular deve conter DDD e 9 dígitos';
      }

      if (formData.p1.hasChildren === 'sim' && !formData.p1.childrenCount) {
        errs['p1.childrenCount'] = 'Informe a quantidade de filhos';
      }
    } else if (currentStep === 2) {
      if (!formData.p1.profession.trim()) {
        errs['p1.profession'] = 'Profissão é obrigatória';
      }
      if (!formData.p1.serviceTime.trim()) {
        errs['p1.serviceTime'] = 'Tempo de FGTS é obrigatório';
      }
      if (!formData.p1.salary || Number(formData.p1.salary) <= 0) {
        errs['p1.salary'] = 'Renda mensal deve ser superior a R$ 0,00';
      }
    } else if (currentStep === 3) {
      if (formData.hasP2) {
        if (!formData.p2?.fullName?.trim()) {
          errs['p2.fullName'] = 'Nome do proponente 2 é obrigatório';
        }
        if (!formData.p2?.cpf?.trim()) {
          errs['p2.cpf'] = 'CPF do proponente 2 é obrigatório';
        } else if (!isValidCPF(formData.p2.cpf)) {
          errs['p2.cpf'] = 'CPF inválido para o segundo proponente';
        }
        if (!formData.p2?.rg?.trim()) {
          errs['p2.rg'] = 'RG do proponente 2 é obrigatório';
        }
        if (!formData.p2?.dob) {
          errs['p2.dob'] = 'Data de nascimento é obrigatória';
        }
        if (!formData.p2?.email?.trim()) {
          errs['p2.email'] = 'Email é obrigatório';
        } else if (!isValidEmail(formData.p2.email)) {
          errs['p2.email'] = 'Formato de email inválido';
        }
        if (!formData.p2?.phoneMobile?.trim()) {
          errs['p2.phoneMobile'] = 'Celular é obrigatório';
        } else if (!isValidPhone(formData.p2.phoneMobile)) {
          errs['p2.phoneMobile'] = 'Celular do proponente 2 inválido';
        }
        if (!formData.p2?.salary || Number(formData.p2.salary) <= 0) {
          errs['p2.salary'] = 'Renda do segundo proponente é obrigatória';
        }
        if (!formData.p2?.profession?.trim()) {
          errs['p2.profession'] = 'Profissão do titular 2 é obrigatória';
        }
        if (!formData.p2?.serviceTime?.trim()) {
          errs['p2.serviceTime'] = 'Tempo de FGTS é obrigatório';
        }
      }
    } else if (currentStep === 4) {
      if (formData.ownsProperty === 'sim' && !formData.propertyAddress?.trim()) {
        errs['propertyAddress'] = 'Endereço do imóvel é obrigatório';
      }
    } else if (currentStep === 5) {
      if (!formData.targetPropertyAddress.trim()) {
        errs['targetPropertyAddress'] = 'Endereço do imóvel pretendido é obrigatório';
      }
      if (formData.parkingSpaces === undefined || formData.parkingSpaces === '') {
        errs['parkingSpaces'] = 'Número de vagas é obrigatório';
      }
      const sale = Number(formData.saleValue) || 0;
      const down = Number(formData.downPayment) || 0;
      const finance = Number(formData.financingValue) || 0;

      if (!sale || sale <= 0) {
        errs['saleValue'] = 'Valor de venda/avaliação deve ser superior a R$ 0,00';
      }
      if (!down || down <= 0) {
        errs['downPayment'] = 'Entrada deve ser informada';
      } else if (down >= sale && sale > 0) {
        errs['downPayment'] = 'A entrada deve ser inferior ao valor total de venda do imóvel';
      }
      if (!finance || finance <= 0) {
        errs['financingValue'] = 'Valor a ser financiado é obrigatório';
      } else if (sale > 0 && finance > sale * 0.90) {
        errs['financingValue'] = 'O financiamento excede os limites operacionais permitidos (máx. 80-90%)';
      }
      if (!formData.termYears || Number(formData.termYears) < 1 || Number(formData.termYears) > 35) {
        errs['termYears'] = 'Prazo deve estar entre 1 e 35 anos';
      }
      if (!formData.acceptedTerms) {
        errs['acceptedTerms'] = 'Você deve aceitar os termos e declarações para prosseguir';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) {
      // scroll to first error
      const firstErrorEl = document.querySelector('.text-red-400');
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    let next = currentStep + 1;
    // Skip Step 3 if hasP2 is false
    if (next === 3 && !formData.hasP2) {
      next = 4;
    }
    setCurrentStep(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrev = () => {
    let prev = currentStep - 1;
    // Skip Step 3 going backwards if hasP2 is false
    if (prev === 3 && !formData.hasP2) {
      prev = 2;
    }
    setCurrentStep(prev);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit proposal with duplicate submission prevention
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (currentStep < 5) {
      handleNext();
      return;
    }

    if (isSubmitting) return;

    if (!validateCurrentStep()) {
      setTimeout(() => {
        const firstErrorEl = document.querySelector('.text-red-400');
        if (firstErrorEl) {
          firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    try {
      setIsSubmitting(true);
      const record = await proposalService.createProposal(formData);
      setLastSubmittedId(record.id);
      setIsSuccess(true);
      // Clean form state immediately upon confirmed persistence
      setFormData(INITIAL_FORM);
      setCurrentStep(1);
      setErrors({});
    } catch (err: any) {
      console.error('Erro ao salvar proposta:', err);
      setSubmitError(
        `Falha ao enviar proposta para o servidor: ${err?.message || 'Erro de comunicação'}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 bg-[#0F172A] text-[#F8FAFC] min-h-[calc(100vh-140px)] flex flex-col justify-start">
      {/* Submission Error Banner */}
      {submitError && (
        <div className="max-w-5xl mx-auto w-full mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-xs text-red-400 font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{submitError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="text-red-400 hover:text-white transition-colors text-[11px] cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Success Modal */}
      {isSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-[#1E293B] border border-[#334155] p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6">
            <div className="w-20 h-20 bg-[#FF6B1A]/10 rounded-full flex items-center justify-center mx-auto border border-[#FF6B1A]/30">
              <CheckCircle2 className="w-10 h-10 text-[#FF6B1A]" />
            </div>
            <div>
              <span className="text-xs bg-[#FF6B1A]/20 text-[#FF6B1A] font-bold px-2.5 py-1 rounded-md border border-[#FF6B1A]/30 uppercase tracking-widest inline-block mb-3">
                #{lastSubmittedId}
              </span>
              <h2 className="text-2xl font-bold text-white mb-2">Sucesso!</h2>
              <p className="text-[#94A3B8] text-sm leading-relaxed">
                Sua ficha cadastral foi enviada e gravada com sucesso no banco de dados Supabase PostgreSQL da Fourcred.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSuccess(false);
                setFormData(INITIAL_FORM);
                setCurrentStep(1);
              }}
              className="w-full bg-[#FF6B1A] hover:bg-[#E85D04] text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg shadow-[#FF6B1A]/20 cursor-pointer"
            >
              Nova Proposta
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto w-full space-y-0">
        {/* Step Progress Top Bar */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-t-xl px-4 sm:px-10 flex items-center justify-between overflow-x-auto hide-scrollbar gap-4 sm:gap-6 h-20 shadow-md relative z-10 w-full mb-[-1px]">
          {STEPS.map((step) => {
            const isActive = currentStep === step.num;
            const isCompleted = currentStep > step.num;
            const isP2Disabled = step.num === 3 && !formData.hasP2;

            return (
              <div
                key={step.num}
                className={`flex items-center gap-3 min-w-max py-4 h-full relative transition-all ${
                  isActive ? 'opacity-100' : 'opacity-50'
                } ${isP2Disabled ? 'opacity-20 pointer-events-none' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center shrink-0 transition-colors shadow-sm ${
                    isActive
                      ? 'bg-[#FF6B1A] text-white shadow-[#FF6B1A]/30'
                      : isCompleted
                      ? 'bg-[#1E293B] border border-[#FF6B1A] text-[#FF6B1A]'
                      : 'bg-[#0F172A] border border-[#334155] text-[#CBD5E1]/50'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.num}
                </div>
                <div className="flex flex-col justify-center">
                  <div className={`text-[13px] font-bold ${isActive || isCompleted ? 'text-white' : 'text-[#CBD5E1]/70'}`}>
                    {step.title}
                  </div>
                  <div className="text-[#CBD5E1]/50 text-[11px] font-medium leading-none mt-1">
                    {step.subtitle}
                  </div>
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#FF6B1A] rounded-t-sm shadow-[0_0_12px_rgba(255,107,26,0.5)]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Form Body Box */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-b-xl p-6 sm:p-10 shadow-xl relative z-0 min-h-[500px]">
          <form
            onSubmit={handleSubmit}
            noValidate
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (currentStep < 5) {
                  handleNext();
                } else if (!isSubmitting) {
                  handleSubmit(e);
                }
              }
            }}
          >
            {/* STEP 1: Dados Pessoais (P1) */}
            <div className={currentStep === 1 ? 'block space-y-8 animate-in fade-in duration-200' : 'hidden'}>
              <div>
                <div className="mb-6 border-b border-[#334155] pb-4">
                  <h2 className="text-xl font-bold text-white tracking-tight mb-1">
                    Identificação do Primeiro Proponente
                  </h2>
                  <p className="text-[13px] text-[#CBD5E1]">
                    Insira abaixo os dados básicos de identidade do proponente titular da operação.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                  <InputField
                    label="Nome Completo *"
                    name="p1.fullName"
                    required
                    placeholder="Nome sem abreviações"
                    value={formData.p1.fullName}
                    onChange={(e) => handleP1Change('fullName', e.target.value)}
                    error={errors['p1.fullName']}
                  />
                  <InputField
                    label="CPF *"
                    name="p1.cpf"
                    required
                    placeholder="000.000.000-00"
                    value={formData.p1.cpf}
                    onChange={(e) => handleP1Change('cpf', e.target.value)}
                    error={errors['p1.cpf']}
                  />
                  <InputField
                    label="RG *"
                    name="p1.rg"
                    required
                    placeholder="Nº e Órgão Emissor"
                    value={formData.p1.rg}
                    onChange={(e) => handleP1Change('rg', e.target.value)}
                    error={errors['p1.rg']}
                  />
                  <InputField
                    label="Data de Nascimento *"
                    name="p1.dob"
                    type="date"
                    required
                    value={formData.p1.dob}
                    onChange={(e) => handleP1Change('dob', e.target.value)}
                    error={errors['p1.dob']}
                  />
                  <SelectField
                    label="Estado Civil *"
                    name="p1.maritalStatus"
                    required
                    value={formData.p1.maritalStatus}
                    onChange={(e) => handleP1Change('maritalStatus', e.target.value)}
                    options={[
                      { label: 'Solteiro(a)', value: 'solteiro' },
                      { label: 'Casado(a)', value: 'casado' },
                      { label: 'União Estável', value: 'uniao_estavel' },
                      { label: 'Divorciado(a)', value: 'divorciado' },
                      { label: 'Viúvo(a)', value: 'viuvo' },
                    ]}
                  />
                  <div className="flex flex-col gap-5 md:col-span-1">
                    <SelectField
                      label="Tem filhos? *"
                      name="p1.hasChildren"
                      required
                      value={formData.p1.hasChildren}
                      onChange={(e) => handleP1Change('hasChildren', e.target.value)}
                      options={[
                        { label: 'Sim', value: 'sim' },
                        { label: 'Não', value: 'nao' },
                      ]}
                    />
                    {formData.p1.hasChildren === 'sim' && (
                      <InputField
                        label="Quantos? *"
                        name="p1.childrenCount"
                        type="number"
                        min="1"
                        required
                        placeholder="Ex: 2"
                        value={formData.p1.childrenCount || ''}
                        onChange={(e) => handleP1Change('childrenCount', e.target.value)}
                        error={errors['p1.childrenCount']}
                      />
                    )}
                  </div>
                  <InputField
                    label="Email Principal *"
                    name="p1.email"
                    type="email"
                    required
                    placeholder="nome@email.com"
                    value={formData.p1.email}
                    onChange={(e) => handleP1Change('email', e.target.value)}
                    error={errors['p1.email']}
                  />
                  <InputField
                    label="Telefone Celular *"
                    name="p1.phoneMobile"
                    required
                    placeholder="(00) 00000-0000"
                    value={formData.p1.phoneMobile}
                    onChange={(e) => handleP1Change('phoneMobile', e.target.value)}
                    error={errors['p1.phoneMobile']}
                  />
                  <InputField
                    label="Telefone Residencial"
                    name="p1.phoneHome"
                    placeholder="(00) 0000-0000"
                    value={formData.p1.phoneHome || ''}
                    onChange={(e) => handleP1Change('phoneHome', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* STEP 2: Renda & Trabalho (P1) */}
            <div className={currentStep === 2 ? 'block space-y-8 animate-in fade-in duration-200' : 'hidden'}>
              <div>
                <div className="mb-6 border-b border-[#334155] pb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Perfil de Renda e Atividade Profissional (P1)
                  </h2>
                  <p className="text-[13px] text-slate-400 mt-2">
                    Insira suas informações sobre atividade econômica atual para balizamento de renda.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                  <InputField
                    label="Profissão Atual *"
                    name="p1.profession"
                    required
                    placeholder="Ex: Engenheiro Civil, Analista..."
                    value={formData.p1.profession}
                    onChange={(e) => handleP1Change('profession', e.target.value)}
                    error={errors['p1.profession']}
                  />
                  <InputField
                    label="Tempo de trabalho sob regime do FGTS *"
                    name="p1.serviceTime"
                    required
                    placeholder="Ex: 3 anos e meio"
                    value={formData.p1.serviceTime}
                    onChange={(e) => handleP1Change('serviceTime', e.target.value)}
                    error={errors['p1.serviceTime']}
                  />
                  <InputField
                    label="Renda Mensal Familiar Bruta (R$) *"
                    name="p1.salary"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.p1.salary}
                    onChange={(e) => handleP1Change('salary', e.target.value)}
                    error={errors['p1.salary']}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                  <InputField
                    label="Outras Rendas Mensais (Valor R$)"
                    name="p1.otherIncomes"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.p1.otherIncomes || ''}
                    onChange={(e) => handleP1Change('otherIncomes', e.target.value)}
                  />
                  <InputField
                    label="Origem / Comprovação de Outras Rendas"
                    name="p1.otherIncomesOrigin"
                    placeholder="Ex: Aluguéis, dividendos, comissões..."
                    value={formData.p1.otherIncomesOrigin || ''}
                    onChange={(e) => handleP1Change('otherIncomesOrigin', e.target.value)}
                  />
                </div>

                {/* Co-Proponente Toggle Box */}
                <div className="mt-8 border border-[#334155] bg-[#0F172A] p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 text-[#FF6B1A] text-xl">👥</div>
                    <div>
                      <h3 className="text-[15px] font-bold text-white tracking-wide">
                        Adicionar Cônjuge ou Segundo Proponente?
                      </h3>
                      <p className="text-[13px] text-[#CBD5E1] mt-1">
                        Somar rendas de dois proponentes aumenta significativamente a margem de aprovação.
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.hasP2}
                      onChange={(e) => handleRootChange('hasP2', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-[#1E293B] border border-[#334155] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#0F172A] after:border-gray-500 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#FF6B1A]" />
                    <span className="ml-3 text-[13px] font-bold text-[#CBD5E1] uppercase tracking-wider w-8">
                      {formData.hasP2 ? 'SIM' : 'NÃO'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* STEP 3: Co-Proponente (P2) */}
            <div className={currentStep === 3 ? 'block space-y-8 animate-in fade-in duration-200' : 'hidden'}>
              <div>
                <div className="border border-[#334155] bg-[#0F172A] shadow-sm rounded-xl p-5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[15px] font-bold text-white flex items-center gap-2">
                      <span className="text-[#FF6B1A]">👥</span> Segundo Proponente Coparticipante
                    </h3>
                    <p className="text-[13px] text-[#CBD5E1] mt-1">
                      Insira as informações do parceiro que agregará recursos ao pleito.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                  <SelectField
                    label="Relacionamento com Proponente 1 *"
                    name="p2Relationship"
                    required
                    value={formData.p2Relationship || 'Cônjuge'}
                    onChange={(e) => handleRootChange('p2Relationship', e.target.value)}
                    options={[
                      { label: 'Cônjuge', value: 'Cônjuge' },
                      { label: 'União Estável', value: 'União Estável' },
                      { label: 'Outro', value: 'Outro' },
                    ]}
                  />
                  <InputField
                    label="Nome Completo do Segundo Proponente *"
                    name="p2.fullName"
                    required
                    value={formData.p2?.fullName || ''}
                    onChange={(e) => handleP2Change('fullName', e.target.value)}
                    error={errors['p2.fullName']}
                  />
                  <InputField
                    label="CPF *"
                    name="p2.cpf"
                    required
                    placeholder="000.000.000-00"
                    value={formData.p2?.cpf || ''}
                    onChange={(e) => handleP2Change('cpf', e.target.value)}
                    error={errors['p2.cpf']}
                  />
                  <InputField
                    label="RG *"
                    name="p2.rg"
                    required
                    placeholder="Nº e Órgão Emissor"
                    value={formData.p2?.rg || ''}
                    onChange={(e) => handleP2Change('rg', e.target.value)}
                    error={errors['p2.rg']}
                  />
                  <InputField
                    label="Data de Nascimento *"
                    name="p2.dob"
                    type="date"
                    required
                    value={formData.p2?.dob || ''}
                    onChange={(e) => handleP2Change('dob', e.target.value)}
                    error={errors['p2.dob']}
                  />
                  <SelectField
                    label="Estado Civil *"
                    name="p2.maritalStatus"
                    required
                    value={formData.p2?.maritalStatus || 'casado'}
                    onChange={(e) => handleP2Change('maritalStatus', e.target.value)}
                    options={[
                      { label: 'Solteiro(a)', value: 'solteiro' },
                      { label: 'Casado(a)', value: 'casado' },
                      { label: 'União Estável', value: 'uniao_estavel' },
                      { label: 'Divorciado(a)', value: 'divorciado' },
                      { label: 'Viúvo(a)', value: 'viuvo' },
                    ]}
                  />
                  <InputField
                    label="Email Principal *"
                    name="p2.email"
                    type="email"
                    required
                    placeholder="nome@email.com"
                    value={formData.p2?.email || ''}
                    onChange={(e) => handleP2Change('email', e.target.value)}
                    error={errors['p2.email']}
                  />
                  <InputField
                    label="Telefone Celular *"
                    name="p2.phoneMobile"
                    required
                    placeholder="(00) 00000-0000"
                    value={formData.p2?.phoneMobile || ''}
                    onChange={(e) => handleP2Change('phoneMobile', e.target.value)}
                    error={errors['p2.phoneMobile']}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest border-b border-[#334155] pb-2 mb-6">
                    Informações Profissionais do Proponente 2:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                    <InputField
                      label="Renda Mensal Familiar Bruta Titular 2 *"
                      name="p2.salary"
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.p2?.salary || ''}
                      onChange={(e) => handleP2Change('salary', e.target.value)}
                      error={errors['p2.salary']}
                    />
                    <InputField
                      label="Profissão do Titular 2 *"
                      name="p2.profession"
                      required
                      placeholder="Ex: Arquiteta, Professora..."
                      value={formData.p2?.profession || ''}
                      onChange={(e) => handleP2Change('profession', e.target.value)}
                      error={errors['p2.profession']}
                    />
                    <InputField
                      label="Tempo de trabalho sob regime do FGTS *"
                      name="p2.serviceTime"
                      required
                      placeholder="Ex: 2 anos"
                      containerClassName="md:col-span-2"
                      value={formData.p2?.serviceTime || ''}
                      onChange={(e) => handleP2Change('serviceTime', e.target.value)}
                      error={errors['p2.serviceTime']}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* STEP 4: Análise de Crédito */}
            <div className={currentStep === 4 ? 'block space-y-8 animate-in fade-in duration-200' : 'hidden'}>
              <div>
                <div className="mb-6 border-b border-[#334155] pb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Histórico de FGTS e outros Bens
                  </h2>
                  <p className="text-[13px] text-slate-400 mt-1">
                    Dados relativos à sua situação patrimonial e elegibilidade de subsídios habitacionais.
                  </p>
                </div>

                <div className="bg-[#0F172A] border border-[#334155] rounded-xl px-6 py-2 mb-8 shadow-sm">
                  <ToggleYesNo
                    label="Já utilizou recursos do FGTS para aquisição de imóvel?"
                    sublabel="Em qualquer localidade do território nacional"
                    value={formData.usedFgts}
                    onChange={(val) => handleRootChange('usedFgts', val)}
                  />
                  <ToggleYesNo
                    label="Já foi beneficiado com algum subsídio oriundo do FGTS?"
                    sublabel="Ex: Desconto em juros na taxa do Programa Minha Casa Minha Vida"
                    value={formData.fgtsSubsidy}
                    onChange={(val) => handleRootChange('fgtsSubsidy', val)}
                  />
                  <ToggleYesNo
                    label="É proprietário de outro imóvel ou possui fração ideal?"
                    sublabel="Terrenos, salas, apartamentos comerciais ou residenciais"
                    value={formData.ownsProperty}
                    onChange={(val) => handleRootChange('ownsProperty', val)}
                  />
                </div>

                {formData.ownsProperty === 'sim' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 animate-in fade-in">
                    <InputField
                      label="Endereço do Imóvel Existente *"
                      name="propertyAddress"
                      required
                      placeholder="Rua, número, cidade..."
                      value={formData.propertyAddress || ''}
                      onChange={(e) => handleRootChange('propertyAddress', e.target.value)}
                      error={errors['propertyAddress']}
                    />
                    <InputField
                      label="Fração Ideal Possuída (%)"
                      name="propertyFraction"
                      type="number"
                      placeholder="100"
                      value={formData.propertyFraction || ''}
                      onChange={(e) => handleRootChange('propertyFraction', e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <TextareaField
                    label="Outros Bens e Aplicações Patrimoniais"
                    name="otherAssets"
                    rows={4}
                    placeholder="Descreva investimentos, veículos ou outras reservas financeiras relevantes..."
                    value={formData.otherAssets || ''}
                    onChange={(e) => handleRootChange('otherAssets', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* STEP 5: Imóvel & Operação */}
            <div className={currentStep === 5 ? 'block space-y-8 animate-in fade-in duration-200' : 'hidden'}>
              <div>
                <div className="mb-6 border-b border-[#334155] pb-4">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Dados do Imóvel Pretendido e Operação Financeira
                  </h2>
                  <p className="text-[13px] text-slate-400 mt-1">
                    Configuração monetária exata da sua proposta de aquisição, prazos e modalidade de cálculo amortizável.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                  <InputField
                    label="Endereço Completo do Imóvel Pretendido *"
                    name="targetPropertyAddress"
                    required
                    containerClassName="md:col-span-3"
                    placeholder="Rua, Número, Complemento, Bairro, Cidade - UF"
                    value={formData.targetPropertyAddress}
                    onChange={(e) => handleRootChange('targetPropertyAddress', e.target.value)}
                    error={errors['targetPropertyAddress']}
                  />
                  <InputField
                    label="Nº Vagas de Garagem no Imóvel *"
                    name="parkingSpaces"
                    type="number"
                    min="0"
                    required
                    value={formData.parkingSpaces}
                    onChange={(e) => handleRootChange('parkingSpaces', e.target.value)}
                    error={errors['parkingSpaces']}
                  />
                  <InputField
                    label="Valor Total de Venda / Avaliação (R$) *"
                    name="saleValue"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.saleValue}
                    onChange={(e) => handleRootChange('saleValue', e.target.value)}
                    error={errors['saleValue']}
                  />
                  <InputField
                    label="Entrada (Recursos Próprios) (R$) *"
                    name="downPayment"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.downPayment}
                    onChange={(e) => handleRootChange('downPayment', e.target.value)}
                    error={errors['downPayment']}
                  />
                </div>

                {/* FGTS deduction */}
                <div className="border border-[#334155] bg-[#0F172A] p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        id="useFgtsCheckbox"
                        checked={formData.useFgts === 'sim' || formData.useFgts === true}
                        onChange={(e) => handleRootChange('useFgts', e.target.checked ? 'sim' : 'nao')}
                        className="w-5 h-5 text-[#FF6B1A] bg-[#1E293B] border-[#334155] rounded-md focus:ring-[#FF6B1A]/20 transition-colors cursor-pointer"
                      />
                    </div>
                    <div>
                      <label htmlFor="useFgtsCheckbox" className="text-[15px] font-bold text-white tracking-wide cursor-pointer block">
                        Deseja abater ou utilizar saldo de FGTS na operação?
                      </label>
                      <p className="text-[13px] text-[#CBD5E1] mt-1">
                        Você pode resgatar saldos de contas ativas e inativas.
                      </p>
                    </div>
                  </div>
                  {(formData.useFgts === 'sim' || formData.useFgts === true) && (
                    <div className="w-full md:w-64">
                      <InputField
                        label="VALOR DO FGTS A UTILIZAR (R$)"
                        name="fgtsValue"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="uppercase"
                        value={formData.fgtsValue || ''}
                        onChange={(e) => handleRootChange('fgtsValue', e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                  <InputField
                    label="Valor da Parcela Financiada (R$) * (Aprox.)"
                    name="financingValue"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.financingValue}
                    onChange={(e) => handleRootChange('financingValue', e.target.value)}
                    error={errors['financingValue']}
                  />
                  <InputField
                    label="Prazo Financiamento (Anos) *"
                    name="termYears"
                    type="number"
                    min="1"
                    max="35"
                    required
                    value={formData.termYears}
                    onChange={(e) => handleRootChange('termYears', e.target.value)}
                    error={errors['termYears']}
                  />
                  <SelectField
                    label="Sistema de Amortização *"
                    name="amortizationSystem"
                    required
                    value={formData.amortizationSystem}
                    onChange={(e) => handleRootChange('amortizationSystem', e.target.value)}
                    options={[
                      { label: 'SAC (Parcelas Decrescentes)', value: 'sac' },
                      { label: 'Price (Tabela Price - Fixas)', value: 'price' },
                    ]}
                  />
                </div>

                {/* Regulatory Note */}
                <div className="border border-[#334155] bg-[#0F172A] p-6 rounded-xl flex items-start gap-4 mb-8 shadow-sm">
                  <span className="text-[#CBD5E1] mt-0.5 border border-[#334155] rounded-full w-6 h-6 flex items-center justify-center shrink-0 text-sm font-bold bg-[#1E293B]">
                    i
                  </span>
                  <p className="text-[13px] text-[#CBD5E1] font-medium leading-relaxed">
                    * Lembre-se que o limite máximo de financiamento imobiliário no Brasil costuma ser de{' '}
                    <strong className="text-white">80% do valor avaliado</strong> do imóvel.
                  </p>
                </div>

                {/* Terms of Agreement */}
                <div className="bg-[#0F172A] border border-[#FF6B1A]/50 rounded-xl p-6 text-white text-sm shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#FF6B1A]" />
                  <h3 className="font-bold text-lg mb-4 ml-2">DECLARAÇÕES E TERMOS DO CANDIDATO</h3>
                  <div className="flex items-start gap-4 ml-2">
                    <input
                      id="acceptedTerms"
                      type="checkbox"
                      checked={formData.acceptedTerms}
                      onChange={(e) => handleRootChange('acceptedTerms', e.target.checked)}
                      className="w-5 h-5 mt-0.5 text-[#FF6B1A] rounded-md bg-[#1E293B] border-[#334155] focus:ring-2 focus:ring-[#FF6B1A]/20 transition-colors cursor-pointer shrink-0"
                    />
                    <div>
                      <label htmlFor="acceptedTerms" className="font-bold text-[14px] cursor-pointer block">
                        Declaro que as informações acima prestadas são verdadeiras e exatas.
                      </label>
                      <p className="text-[#CBD5E1] mt-1.5 text-[13px] leading-relaxed">
                        Autorizo a Fourcred Soluções Imobiliárias a utilizar estes dados para fins de simulação e
                        pré-aprovação de crédito junto a instituições financeiras, incluindo consultas a órgãos de
                        proteção ao crédito (SPC, Serasa) e o envio de propostas.
                      </p>
                      {errors['acceptedTerms'] && (
                        <p className="text-red-400 mt-2 text-xs font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {errors['acceptedTerms']}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-[#334155] my-8" />

            {/* Stepper Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <button
                type="button"
                onClick={handlePrev}
                className={`px-8 py-3.5 bg-[#0F172A] border border-[#334155] text-[#CBD5E1] font-bold rounded-xl text-[14px] hover:bg-[#334155] hover:text-white transition-all shadow-sm focus:outline-none w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer ${
                  currentStep === 1 ? 'opacity-0 pointer-events-none' : ''
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                &lt; Anterior
              </button>

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-10 py-3.5 bg-[#FF6B1A] text-white font-bold rounded-xl text-[14px] shadow-[0_4px_14px_rgba(255,107,26,0.3)] hover:bg-[#E85D04] transition-all focus:outline-none flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
                >
                  Próximo Passo &gt;
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-10 py-3.5 bg-[#FF6B1A] text-white font-bold rounded-xl text-[14px] shadow-[0_4px_14px_rgba(255,107,26,0.3)] hover:bg-[#E85D04] transition-all focus:outline-none flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Enviar Proposta de Financiamento ✓</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
