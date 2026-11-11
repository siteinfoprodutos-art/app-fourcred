import { jsPDF } from 'jspdf';
import { ProposalPayload } from '../types/proposal';

/**
 * Helper to format currency values cleanly (e.g. R$ 450.000,00)
 */
const formatCurrency = (val: number | string | undefined | null): string => {
  const num = Number(val || 0);
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Helper to format Portuguese dates (e.g. 15/05/1990)
 */
const formatDateStr = (dateStr?: string): string => {
  if (!dateStr) return 'N/D';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR');
};

/**
 * Draw Vector FOURCRED Logo ($ symbol & curved arrow)
 */
const drawFourcredLogo = (doc: jsPDF, x: number, y: number, isDarkBg: boolean = true) => {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  if (isDarkBg) {
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setTextColor(15, 23, 42); // #0F172A Navy
  }
  doc.text('FOURCRED', x, y);

  const textWidth = doc.getTextWidth('FOURCRED');

  // Orange $ Symbol
  doc.setTextColor(255, 107, 26); // #FF6B1A
  doc.text('$', x + textWidth + 1, y);

  // Curved underline accent arrow
  doc.setDrawColor(255, 107, 26);
  doc.setLineWidth(0.8);
  doc.line(x, y + 2.5, x + textWidth + 6, y + 2.5);
  doc.line(x + textWidth + 4, y + 1, x + textWidth + 6, y + 2.5);
  doc.line(x + textWidth + 4, y + 4, x + textWidth + 6, y + 2.5);
};

export const generateProposalPDF = (data: ProposalPayload, id?: string, status: string = 'Pendente') => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width; // 210mm
  const pageHeight = doc.internal.pageSize.height; // 297mm
  const leftX = 14;
  const rightX = pageWidth - 14;
  const contentWidth = pageWidth - 28;

  let currentY = 0;

  // Header & Footer helper function for page breaks
  const drawPageHeaderAndFooter = (pageNo: number, totalPages: number) => {
    // 1. Top Header Banner
    doc.setFillColor(15, 23, 42); // #0F172A Dark Navy
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Orange Accent Bottom Line on Header
    doc.setFillColor(255, 107, 26); // #FF6B1A
    doc.rect(0, 28, pageWidth, 2, 'F');

    // Brand Logo
    drawFourcredLogo(doc, leftX, 17, true);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225); // #CBD5E1
    doc.text('SOLUÇÕES FINANCEIRAS & CRÉDITO IMOBILIÁRIO', leftX, 23);

    // Right Side Corporate Contact Info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('Central de Atendimento Fourcred', rightX, 10, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text('Tel: (11) 4003-4921 | WhatsApp: (11) 98765-4321', rightX, 15, { align: 'right' });
    doc.text('E-mail: contato@fourcred.com.br', rightX, 19.5, { align: 'right' });
    doc.text('Website: www.fourcred.com.br', rightX, 24, { align: 'right' });

    // 2. Bottom Footer
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(leftX, pageHeight - 16, rightX, pageHeight - 16);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // #94A3B8
    doc.text(
      'Fourcred Soluções Financeiras Ltda. • CNPJ: 42.189.503/0001-90 • Av. Paulista, 1000, São Paulo - SP',
      leftX,
      pageHeight - 11
    );

    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${pageNo} de ${totalPages}`, rightX, pageHeight - 11, { align: 'right' });

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(160, 160, 160);
    doc.text(
      'Documento confidencial emitido eletronicamente para fins de análise e pré-aprovação de financiamento imobiliário.',
      leftX,
      pageHeight - 6
    );
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight >= pageHeight - 22) {
      doc.addPage();
      currentY = 36;
    }
  };

  // Section Header Drawer
  const addSectionHeader = (title: string) => {
    checkPageBreak(14);
    doc.setFillColor(15, 23, 42); // Navy background
    doc.roundedRect(leftX, currentY, contentWidth, 8, 1.5, 1.5, 'F');

    // Orange left bar
    doc.setFillColor(255, 107, 26);
    doc.rect(leftX, currentY, 2.5, 8, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(title, leftX + 6, currentY + 5.5);

    currentY += 11;
  };

  // Grid Table Row Drawer
  const addTwoColumnRow = (
    label1: string,
    val1: string | number | undefined | null,
    label2?: string,
    val2?: string | number | undefined | null,
    isAlternate: boolean = false
  ) => {
    checkPageBreak(7);
    const rowHeight = 6.5;

    if (isAlternate) {
      doc.setFillColor(248, 250, 252); // Soft gray
      doc.rect(leftX, currentY - 4.5, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(leftX, currentY + 2, rightX, currentY + 2);

    const halfWidth = contentWidth / 2;

    // Column 1
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105); // #475569
    doc.text(`${label1}:`, leftX + 2, currentY);

    const l1Width = doc.getTextWidth(`${label1}: `);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const strVal1 = String(val1 !== undefined && val1 !== null && val1 !== '' ? val1 : 'N/D');
    doc.text(strVal1, leftX + 2 + l1Width, currentY, { maxWidth: halfWidth - l1Width - 4 });

    // Column 2
    if (label2) {
      const col2X = leftX + halfWidth + 2;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(`${label2}:`, col2X, currentY);

      const l2Width = doc.getTextWidth(`${label2}: `);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const strVal2 = String(val2 !== undefined && val2 !== null && val2 !== '' ? val2 : 'N/D');
      doc.text(strVal2, col2X + l2Width, currentY, { maxWidth: halfWidth - l2Width - 4 });
    }

    currentY += rowHeight;
  };

  // Start Page 1 Content
  currentY = 35;

  // 1. Title Banner Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(leftX, currentY, contentWidth, 22, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftX, currentY, contentWidth, 22, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('PROPOSTA DE FINANCIAMENTO IMOBILIÁRIO', leftX + 5, currentY + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Relatório Oficial de Avaliação Cadastral e Parâmetros de Crédito', leftX + 5, currentY + 14);

  // Proposal ID & Status Badges (Right Box)
  const codeText = `CÓDIGO: #${id || 'FC-882194'}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 107, 26);
  doc.text(codeText, rightX - 5, currentY + 8, { align: 'right' });

  const dateText = `Data: ${new Date(data.submittedAt || Date.now()).toLocaleString('pt-BR')}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(dateText, rightX - 5, currentY + 14, { align: 'right' });

  currentY += 27;

  // 2. Executive Financial Highlights Summary Box
  doc.setFillColor(15, 23, 42); // Dark Navy Card
  doc.roundedRect(leftX, currentY, contentWidth, 24, 3, 3, 'F');

  doc.setFillColor(255, 107, 26); // Top accent stripe
  doc.rect(leftX, currentY, contentWidth, 1.5, 'F');

  const colWidth = contentWidth / 4;

  // Highlight 1: Valor Financiamento
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(203, 213, 225);
  doc.text('VALOR FINANCIADO', leftX + 6, currentY + 8);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'black');
  doc.setTextColor(255, 107, 26);
  doc.text(formatCurrency(data.financingValue), leftX + 6, currentY + 16);

  // Highlight 2: Valor Venda
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(203, 213, 225);
  doc.text('VALOR DO IMÓVEL', leftX + colWidth + 4, currentY + 8);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(formatCurrency(data.saleValue), leftX + colWidth + 4, currentY + 16);

  // Highlight 3: Entrada
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(203, 213, 225);
  doc.text('ENTRADA / SINAL', leftX + colWidth * 2 + 4, currentY + 8);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(52, 211, 153); // Emerald Green
  doc.text(formatCurrency(data.downPayment), leftX + colWidth * 2 + 4, currentY + 16);

  // Highlight 4: Prazo & Sistema
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(203, 213, 225);
  doc.text('PRAZO & SISTEMA', leftX + colWidth * 3 + 4, currentY + 8);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`${data.termYears || 30} anos • ${(data.amortizationSystem || 'SAC').toUpperCase()}`, leftX + colWidth * 3 + 4, currentY + 16);

  currentY += 30;

  // 3. Section 1: Dados do Proponente Principal (P1)
  addSectionHeader('1. DADOS DO TITULAR PRINCIPAL (PROPONENTE 1)');
  const p1 = data.p1 || ({} as any);
  let rowToggle = false;

  addTwoColumnRow('Nome Completo', p1.fullName, 'CPF', p1.cpf, (rowToggle = !rowToggle));
  addTwoColumnRow('RG / Órgão Emissor', p1.rg, 'Data de Nascimento', formatDateStr(p1.dob), (rowToggle = !rowToggle));
  addTwoColumnRow('Estado Civil', p1.maritalStatus, 'Possui Filhos/Dependentes', p1.hasChildren === 'sim' ? `Sim (${p1.childrenCount || 1})` : 'Não', (rowToggle = !rowToggle));
  addTwoColumnRow('E-mail Principal', p1.email, 'Telefone Celular', p1.phoneMobile, (rowToggle = !rowToggle));
  if (p1.phoneHome) {
    addTwoColumnRow('Telefone Residencial', p1.phoneHome, 'Profissão / Cargo', p1.profession, (rowToggle = !rowToggle));
  } else {
    addTwoColumnRow('Profissão / Cargo', p1.profession, 'Tempo Trabalho (FGTS)', p1.serviceTime, (rowToggle = !rowToggle));
  }

  addTwoColumnRow('Renda Mensal Bruta', formatCurrency(p1.salary), 'Outras Rendas', p1.otherIncomes ? formatCurrency(p1.otherIncomes) : 'Não possui', (rowToggle = !rowToggle));
  if (p1.otherIncomesOrigin) {
    addTwoColumnRow('Origem Outras Rendas', p1.otherIncomesOrigin, 'Possui Financiamento Ativo', p1.hasFinancing === 'sim' ? `Sim (R$ ${p1.financingInstallment || 0}/mês)` : 'Não', (rowToggle = !rowToggle));
  } else {
    addTwoColumnRow('Possui Financiamento Ativo', p1.hasFinancing === 'sim' ? `Sim (R$ ${p1.financingInstallment || 0}/mês)` : 'Não', 'Possui Empréstimo Ativo', p1.hasLoan === 'sim' ? `Sim (R$ ${p1.loanInstallment || 0}/mês)` : 'Não', (rowToggle = !rowToggle));
  }

  currentY += 4;

  // 4. Section 2: Dados do Segundo Proponente (P2)
  if (data.hasP2 && data.p2) {
    addSectionHeader('2. DADOS DO SEGUNDO PROPONENTE (CÔNJUGE / CO-PARTICIPANTE)');
    const p2 = data.p2;
    let p2RowToggle = false;

    addTwoColumnRow('Grau de Parentesco / Relação', data.p2Relationship || 'Cônjuge', 'Nome Completo P2', p2.fullName, (p2RowToggle = !p2RowToggle));
    addTwoColumnRow('CPF P2', p2.cpf, 'RG P2', p2.rg, (p2RowToggle = !p2RowToggle));
    addTwoColumnRow('Data de Nascimento P2', formatDateStr(p2.dob), 'E-mail P2', p2.email, (p2RowToggle = !p2RowToggle));
    addTwoColumnRow('Telefone Celular P2', p2.phoneMobile, 'Profissão P2', p2.profession, (p2RowToggle = !p2RowToggle));
    addTwoColumnRow('Tempo Trabalho (FGTS)', p2.serviceTime, 'Renda Mensal Bruta P2', formatCurrency(p2.salary), (p2RowToggle = !p2RowToggle));

    currentY += 4;
  }

  // 5. Section 3: Análise de Crédito e Patrimônio
  addSectionHeader('3. ANÁLISE DE CRÉDITO, PATRIMÔNIO & FGTS');
  let sec3Toggle = false;

  addTwoColumnRow('Já Utilizou FGTS nos últimos 3 anos', data.usedFgts === 'sim' ? 'Sim' : 'Não', 'Recebeu Subsídio FGTS', data.fgtsSubsidy === 'sim' ? 'Sim' : 'Não', (sec3Toggle = !sec3Toggle));
  addTwoColumnRow('Possui Outro Imóvel Residencial', data.ownsProperty === 'sim' ? 'Sim' : 'Não', 'Vagas de Garagem Pretendidas', `${data.parkingSpaces || 1} vaga(s)`, (sec3Toggle = !sec3Toggle));

  if (data.ownsProperty === 'sim' && data.propertyAddress) {
    addTwoColumnRow('Endereço do Imóvel Existente', data.propertyAddress, 'Fração Ideal (%)', data.propertyFraction ? `${data.propertyFraction}%` : '100%', (sec3Toggle = !sec3Toggle));
  }

  if (data.otherAssets) {
    addTwoColumnRow('Outros Bens / Investimentos', data.otherAssets, 'Termos Aceitos', data.acceptedTerms ? 'Sim (Autorizado)' : 'Sim', (sec3Toggle = !sec3Toggle));
  }

  currentY += 4;

  // 6. Section 4: Parâmetros Financeiros do Financiamento
  addSectionHeader('4. CONDIÇÕES DO IMÓVEL & VALORES DA OPERAÇÃO');
  let sec4Toggle = false;

  addTwoColumnRow('Endereço do Imóvel Pretendido', data.targetPropertyAddress || 'Imóvel Urbano Residencial', 'Valor Total de Venda', formatCurrency(data.saleValue), (sec4Toggle = !sec4Toggle));
  addTwoColumnRow('Valor da Entrada / Recurso Próprio', formatCurrency(data.downPayment), 'Usará Recursos do FGTS', data.useFgts === 'sim' || data.useFgts === true ? `Sim (${formatCurrency(data.fgtsValue)})` : 'Não', (sec4Toggle = !sec4Toggle));
  const termYearsNum = Number(data.termYears || 30);
  addTwoColumnRow('Valor Efetivo do Financiamento', formatCurrency(data.financingValue), 'Prazo da Operação', `${termYearsNum} anos (${termYearsNum * 12} parcelas)`, (sec4Toggle = !sec4Toggle));
  addTwoColumnRow('Sistema de Amortização', (data.amortizationSystem || 'SAC').toUpperCase() + ' (Parcelas decrescentes ou fixas)', 'Status da Proposta', (status || 'Pendente').toUpperCase(), (sec4Toggle = !sec4Toggle));

  currentY += 10;
  checkPageBreak(30);

  // Signatures / Legal Disclaimer Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(leftX, currentY, contentWidth, 26, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftX, currentY, contentWidth, 26, 2, 2, 'D');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DECLARAÇÃO DE VERACIDADE E AUTORIZAÇÃO DE CONSULTA', leftX + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const text1 = 'O(s) proponente(s) declara(m) sob as penas da lei que todas as informações prestadas nesta proposta são autênticas e exatas.';
  const text2 = 'Autoriza(m) expressamente a Fourcred Soluções Financeiras e suas instituições parceiras a realizarem consultas ao SCR (Sistema de Informações de Crédito do Banco Central) e órgãos de proteção ao crédito (SPC/Serasa) para fins de análise e concessão de crédito imobiliário.';
  doc.text(text1, leftX + 4, currentY + 10, { maxWidth: contentWidth - 8 });
  doc.text(text2, leftX + 4, currentY + 15, { maxWidth: contentWidth - 8 });

  // Signature lines
  const sigY = currentY + 22;
  const sig1X = leftX + 25;
  const sig2X = leftX + contentWidth - 65;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(sig1X, sigY, sig1X + 45, sigY);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(p1.fullName || 'Titular Principal', sig1X + 22.5, sigY + 3, { align: 'center' });

  if (data.hasP2 && data.p2) {
    doc.line(sig2X, sigY, sig2X + 45, sigY);
    doc.text(data.p2.fullName || 'Segundo Proponente', sig2X + 22.5, sigY + 3, { align: 'center' });
  }

  // Calculate total pages and draw headers/footers on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageHeaderAndFooter(i, totalPages);
  }

  const cpfClean = (p1.cpf || 'proposta').replace(/[^a-zA-Z0-9]/g, '');
  const idClean = (id || 'proposta').replace(/[^a-zA-Z0-9]/g, '');
  doc.save(`Fourcred_Proposta_${idClean}_${cpfClean}.pdf`);
};
