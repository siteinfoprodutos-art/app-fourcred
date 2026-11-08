import { jsPDF } from 'jspdf';
import { ProposalPayload } from '../types/proposal';

export const generateProposalPDF = (data: ProposalPayload, id?: string) => {
  const doc = new jsPDF();
  let currentY = 20;
  const leftX = 15;
  const pageHeight = doc.internal.pageSize.height;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight >= pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }
  };

  const addSection = (title: string) => {
    checkPageBreak(15);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // Deep corporate navy
    doc.text(title, leftX, currentY);
    currentY += 10;
  };

  const addField = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    checkPageBreak(8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    const labelText = `${label}: `;
    doc.text(labelText, leftX, currentY);
    doc.setFont('helvetica', 'normal');
    const labelWidth = doc.getTextWidth(labelText);
    doc.text(String(value), leftX + labelWidth, currentY);
    currentY += 8;
  };

  // Title header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(249, 115, 22); // Fourcred Orange
  doc.text('Ficha Cadastral FOURCRED', leftX, currentY);
  currentY += 15;

  addField('ID da Submissão', id || 'NOVO-' + Math.random().toString(36).substring(2, 9).toUpperCase());
  addField('Data', new Date(data.submittedAt || Date.now()).toLocaleString('pt-BR'));
  currentY += 5;

  addSection('1. DADOS DO PRIMEIRO PROPONENTE');
  const f = data.p1;
  addField('Nome Completo', f.fullName);
  addField('CPF', f.cpf);
  addField('RG', f.rg);
  addField('Data de Nascimento', f.dob);
  addField('Estado Civil', f.maritalStatus);
  addField('Tem Filhos', f.hasChildren);
  if (f.hasChildren === 'sim') addField('Qtd Filhos', f.childrenCount);
  addField('Email Principal', f.email);
  addField('Telefone Celular', f.phoneMobile);
  if (f.phoneHome) addField('Telefone Residencial', f.phoneHome);

  addSection('Obrigações Financeiras (P1)');
  addField('Possui Financiamento', f.hasFinancing);
  if (f.hasFinancing === 'sim' && f.financingInstallment) addField('Valor Prestação', `R$ ${f.financingInstallment}`);
  addField('Possui Empréstimo', f.hasLoan);
  if (f.hasLoan === 'sim' && f.loanInstallment) addField('Valor Prestação', `R$ ${f.loanInstallment}`);

  addSection('Dados Profissionais (P1)');
  addField('Profissão', f.profession);
  addField('Tempo de trabalho sob regime do FGTS', f.serviceTime);
  addField('Renda Mensal Familiar Bruta', `R$ ${Number(f.salary || 0).toLocaleString('pt-BR')}`);
  addField('Outras Rendas', f.otherIncomes ? `R$ ${Number(f.otherIncomes).toLocaleString('pt-BR')}` : 'N/A');
  if (f.otherIncomesOrigin) addField('Origem Outras Rendas', f.otherIncomesOrigin);

  if (data.hasP2 && data.p2) {
    currentY += 5;
    addSection('2. DADOS DO SEGUNDO PROPONENTE');
    addField('Relacionamento', data.p2Relationship);
    const p = data.p2;
    addField('Nome Completo', p.fullName);
    addField('CPF', p.cpf);
    addField('RG', p.rg);
    addField('Data de Nascimento', p.dob);
    addField('Email Principal', p.email);
    addField('Telefone Celular', p.phoneMobile);

    addSection('Dados Profissionais (P2)');
    addField('Profissão', p.profession);
    addField('Tempo de trabalho sob regime do FGTS', p.serviceTime);
    addField('Renda Mensal Familiar Bruta', `R$ ${Number(p.salary || 0).toLocaleString('pt-BR')}`);
  }

  currentY += 5;
  addSection('3. ANÁLISE DE CRÉDITO');
  addField('Já usou FGTS', data.usedFgts);
  addField('Subsídio FGTS', data.fgtsSubsidy);
  addField('Possui Imóvel', data.ownsProperty);
  if (data.ownsProperty === 'sim') {
    if (data.propertyAddress) addField('Endereço do Imóvel', data.propertyAddress);
    if (data.propertyFraction) addField('Fração (%)', data.propertyFraction);
  }
  if (data.otherAssets) addField('Outros Bens', data.otherAssets);
  addField('Endereço Imóvel Pretendido', data.targetPropertyAddress);
  addField('Vagas de Garagem', data.parkingSpaces);

  currentY += 5;
  addSection('4. VALORES DA OPERAÇÃO');
  addField('Valor de Venda', `R$ ${Number(data.saleValue || 0).toLocaleString('pt-BR')}`);
  addField('Entrada', `R$ ${Number(data.downPayment || 0).toLocaleString('pt-BR')}`);
  addField('Usará FGTS', data.useFgts === 'sim' || data.useFgts === true ? 'sim' : 'nao');
  if (data.useFgts === 'sim' || data.useFgts === true) {
    addField('Valor FGTS', `R$ ${Number(data.fgtsValue || 0).toLocaleString('pt-BR')}`);
  }
  addField('Valor Financiamento', `R$ ${Number(data.financingValue || 0).toLocaleString('pt-BR')}`);
  addField('Prazo (Anos)', data.termYears);
  addField('Sistema de Amortização', (data.amortizationSystem || '').toUpperCase());

  currentY += 15;
  checkPageBreak(30);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Declaração: O proponente declarou que as informações são verdadeiras e', leftX, currentY);
  doc.text('autorizou a busca de dados nos Órgãos de Proteção ao Crédito.', leftX, currentY + 5);

  const cpfSafe = (f.cpf || 'proposta').replace(/[^a-zA-Z0-9]/g, '');
  doc.save(`Ficha_Fourcred_${cpfSafe}.pdf`);
};
