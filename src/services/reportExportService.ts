import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ProposalRecord } from '../types/proposal';

export interface ReportFilterOptions {
  startDate?: string;
  endDate?: string;
  status?: string;
  amortizationSystem?: string;
  hasP2?: string; // 'Todos' | 'Sim' | 'Não'
  usedFgts?: string; // 'Todos' | 'Sim' | 'Não'
  searchQuery?: string;
}

export const filterProposalsForReport = (
  proposals: ProposalRecord[],
  filters: ReportFilterOptions
): ProposalRecord[] => {
  return proposals.filter((p) => {
    const payload = p.payload;
    const submittedDateStr = payload.submittedAt || p.created_at;

    // 1. Date Range
    if (filters.startDate) {
      const start = new Date(filters.startDate + 'T00:00:00');
      const itemDate = new Date(submittedDateStr || 0);
      if (itemDate < start) return false;
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate + 'T23:59:59');
      const itemDate = new Date(submittedDateStr || 0);
      if (itemDate > end) return false;
    }

    // 2. Status
    if (filters.status && filters.status !== 'Todos') {
      const status = p.status || 'Pendente';
      if (status !== filters.status) return false;
    }

    // 3. Amortization System
    if (filters.amortizationSystem && filters.amortizationSystem !== 'Todos') {
      const amort = (payload.amortizationSystem || '').toLowerCase();
      if (amort !== filters.amortizationSystem.toLowerCase()) return false;
    }

    // 4. Has P2 (Co-proposer)
    if (filters.hasP2 && filters.hasP2 !== 'Todos') {
      const hasP2 = Boolean(payload.hasP2);
      if (filters.hasP2 === 'Sim' && !hasP2) return false;
      if (filters.hasP2 === 'Não' && hasP2) return false;
    }

    // 5. Used FGTS
    if (filters.usedFgts && filters.usedFgts !== 'Todos') {
      const fgtsUsed =
        payload.useFgts === 'sim' || payload.useFgts === true || payload.usedFgts === 'sim';
      if (filters.usedFgts === 'Sim' && !fgtsUsed) return false;
      if (filters.usedFgts === 'Não' && fgtsUsed) return false;
    }

    // 6. Text Search Query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const p1 = payload.p1;
      const name = p1?.fullName || '';
      const cpf = p1?.cpf || '';
      const email = p1?.email || '';
      const id = p.id || '';
      const targetAddress = payload.targetPropertyAddress || '';

      const matches =
        name.toLowerCase().includes(q) ||
        cpf.includes(q) ||
        email.toLowerCase().includes(q) ||
        id.toLowerCase().includes(q) ||
        targetAddress.toLowerCase().includes(q);

      if (!matches) return false;
    }

    return true;
  });
};

const formatCurrency = (val: number | string | undefined): string => {
  const num = Number(val || 0);
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Generate Corporate PDF Report using jsPDF + jspdf-autotable
 */
export const generateProposalsPDFReport = (
  proposals: ProposalRecord[],
  filters: ReportFilterOptions,
  adminName: string = 'Administrador Fourcred'
): void => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const totalVolume = proposals.reduce((acc, p) => acc + Number(p.payload.financingValue || 0), 0);
  const nowFormatted = formatDate(new Date().toISOString());

  // Colors
  const orangeColor: [number, number, number] = [255, 107, 26]; // #FF6B1A
  const darkNavy: [number, number, number] = [15, 23, 42]; // #0F172A
  const textGray: [number, number, number] = [100, 116, 139];

  // Header Bar
  doc.setFillColor(...orangeColor);
  doc.rect(0, 0, doc.internal.pageSize.width, 4, 'F');

  // Corporate Brand Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...darkNavy);
  doc.text('FOURCRED', 14, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...orangeColor);
  doc.text('SOLUÇÕES DE CRÉDITO IMOBILIÁRIO — RELATÓRIO EXECUTIVO', 56, 15);

  doc.setFontSize(8);
  doc.setTextColor(...textGray);
  doc.text(`Gerado por: ${adminName} | Data de Emissão: ${nowFormatted}`, 14, 22);

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 25, doc.internal.pageSize.width - 14, 25);

  // Report Summary Card
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 28, doc.internal.pageSize.width - 28, 20, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 28, doc.internal.pageSize.width - 28, 20, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...darkNavy);
  doc.text(`Total de Cadastros: ${proposals.length}`, 18, 35);
  doc.text(`Volume Financiado Acumulado: ${formatCurrency(totalVolume)}`, 18, 42);

  // Active Filters Text
  const filterDescParts: string[] = [];
  if (filters.startDate || filters.endDate) {
    filterDescParts.push(`Período: ${filters.startDate || 'Início'} a ${filters.endDate || 'Atual'}`);
  }
  if (filters.status && filters.status !== 'Todos') filterDescParts.push(`Status: ${filters.status}`);
  if (filters.amortizationSystem && filters.amortizationSystem !== 'Todos') {
    filterDescParts.push(`Amortização: ${filters.amortizationSystem}`);
  }
  if (filters.hasP2 && filters.hasP2 !== 'Todos') filterDescParts.push(`Possui P2: ${filters.hasP2}`);
  if (filters.usedFgts && filters.usedFgts !== 'Todos') filterDescParts.push(`FGTS: ${filters.usedFgts}`);
  if (filters.searchQuery) filterDescParts.push(`Busca: "${filters.searchQuery}"`);

  const filterSummary = filterDescParts.length > 0 ? filterDescParts.join(' | ') : 'Todos os cadastros sem restrição';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textGray);
  doc.text(`Filtros Aplicados: ${filterSummary}`, 150, 35, { maxWidth: 130 });

  // Prepare Table Data
  const tableHeaders = [
    'ID',
    'Data Envio',
    'Proponente (P1)',
    'CPF P1',
    'Cônjuge (P2)',
    'Valor Imóvel',
    'Entrada',
    'Financiado',
    'Prazo',
    'Amort.',
    'Status',
  ];

  const tableRows = proposals.map((item) => {
    const p1 = item.payload.p1;
    const p2Info = item.payload.hasP2 ? `Sim (${item.payload.p2Relationship || 'Cônjuge'})` : 'Não';
    const status = item.status || 'Pendente';

    return [
      item.id,
      formatDate(item.payload.submittedAt || item.created_at),
      p1?.fullName || 'N/D',
      p1?.cpf || 'N/D',
      p2Info,
      formatCurrency(item.payload.saleValue),
      formatCurrency(item.payload.downPayment),
      formatCurrency(item.payload.financingValue),
      `${item.payload.termYears || 0} anos`,
      (item.payload.amortizationSystem || '').toUpperCase(),
      status,
    ];
  });

  // Render Table with autoTable
  autoTable(doc, {
    startY: 52,
    head: [tableHeaders],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 20 },
      1: { cellWidth: 26 },
      2: { cellWidth: 42, fontStyle: 'bold' },
      3: { cellWidth: 25 },
      4: { cellWidth: 22 },
      5: { cellWidth: 25, halign: 'right' },
      6: { cellWidth: 25, halign: 'right' },
      7: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 16, halign: 'center' },
      9: { cellWidth: 16, halign: 'center' },
      10: { cellWidth: 22, fontStyle: 'bold', halign: 'center' },
    },
    margin: { left: 14, right: 14, bottom: 18 },
    didDrawPage: (data) => {
      // Footer Page Numbering (Página X de Y)
      const pageCount = (doc.internal as any).getNumberOfPages();
      const currentPage = data.pageNumber;

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);

      // Left footer
      doc.text(
        'Fourcred V2 — Relatório Oficial de Operações — Documento Estritamente Confidencial',
        14,
        doc.internal.pageSize.height - 8
      );

      // Right footer page number
      const pageText = `Página ${currentPage} de ${pageCount}`;
      doc.text(pageText, doc.internal.pageSize.width - 14 - doc.getTextWidth(pageText), doc.internal.pageSize.height - 8);
    },
  });

  const dateFileTag = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 12);
  doc.save(`Fourcred_Relatorio_Propostas_${dateFileTag}.pdf`);
};

/**
 * Generate Excel Workbook (.xlsx) using SheetJS (XLSX)
 */
export const generateProposalsExcelReport = (
  proposals: ProposalRecord[],
  filters: ReportFilterOptions,
  adminName: string = 'Administrador Fourcred'
): void => {
  const nowFormatted = formatDate(new Date().toISOString());
  const totalVolume = proposals.reduce((acc, p) => acc + Number(p.payload.financingValue || 0), 0);

  // Active Filters Text
  const filterDescParts: string[] = [];
  if (filters.startDate || filters.endDate) {
    filterDescParts.push(`Período: ${filters.startDate || 'Início'} a ${filters.endDate || 'Atual'}`);
  }
  if (filters.status && filters.status !== 'Todos') filterDescParts.push(`Status: ${filters.status}`);
  if (filters.amortizationSystem && filters.amortizationSystem !== 'Todos') {
    filterDescParts.push(`Amortização: ${filters.amortizationSystem}`);
  }
  if (filters.hasP2 && filters.hasP2 !== 'Todos') filterDescParts.push(`Possui P2: ${filters.hasP2}`);
  if (filters.usedFgts && filters.usedFgts !== 'Todos') filterDescParts.push(`FGTS: ${filters.usedFgts}`);
  if (filters.searchQuery) filterDescParts.push(`Busca: "${filters.searchQuery}"`);

  const filterSummary = filterDescParts.length > 0 ? filterDescParts.join(' | ') : 'Todos os cadastros sem restrição';

  // Build Array of Arrays for SheetJS
  const sheetData: any[][] = [
    ['FOURCRED V2 - RELATÓRIO DE CADASTROS DE CRÉDITO IMOBILIÁRIO'],
    [`Gerado em: ${nowFormatted}`, `Gerado por: ${adminName}`],
    [`Filtros Aplicados: ${filterSummary}`],
    [`Total de Registros: ${proposals.length}`, `Volume Financiado Acumulado: ${formatCurrency(totalVolume)}`],
    [], // Empty row separator
    [
      'ID Proposta',
      'Data Envio',
      'Status',
      'Nome Proponente (P1)',
      'CPF P1',
      'RG P1',
      'Nascimento P1',
      'Estado Civil P1',
      'E-mail P1',
      'Telefone P1',
      'Profissão P1',
      'Tempo FGTS P1',
      'Renda Mensal P1 (R$)',
      'Possui Cônjuge (P2)',
      'Nome Cônjuge (P2)',
      'CPF Cônjuge (P2)',
      'E-mail Cônjuge (P2)',
      'Profissão Cônjuge (P2)',
      'Renda Cônjuge P2 (R$)',
      'Já usou FGTS?',
      'Possui Imóvel?',
      'Endereço Imóvel Pretendido',
      'Vagas Garagem',
      'Valor Venda (R$)',
      'Valor Entrada (R$)',
      'Usará FGTS no Financiamento?',
      'Valor FGTS (R$)',
      'Valor Financiado (R$)',
      'Prazo (Anos)',
      'Sistema Amortização',
    ],
  ];

  proposals.forEach((item) => {
    const payload = item.payload;
    const p1 = payload.p1;
    const p2 = payload.p2;

    sheetData.push([
      item.id,
      formatDate(payload.submittedAt || item.created_at),
      item.status || 'Pendente',
      p1?.fullName || '',
      p1?.cpf || '',
      p1?.rg || '',
      p1?.dob || '',
      p1?.maritalStatus || '',
      p1?.email || '',
      p1?.phoneMobile || '',
      p1?.profession || '',
      p1?.serviceTime || '',
      Number(p1?.salary || 0),
      payload.hasP2 ? `Sim (${payload.p2Relationship || 'Cônjuge'})` : 'Não',
      payload.hasP2 && p2 ? p2.fullName || '' : '',
      payload.hasP2 && p2 ? p2.cpf || '' : '',
      payload.hasP2 && p2 ? p2.email || '' : '',
      payload.hasP2 && p2 ? p2.profession || '' : '',
      payload.hasP2 && p2 ? Number(p2.salary || 0) : 0,
      payload.usedFgts || 'nao',
      payload.ownsProperty || 'nao',
      payload.targetPropertyAddress || '',
      payload.parkingSpaces || 0,
      Number(payload.saleValue || 0),
      Number(payload.downPayment || 0),
      payload.useFgts === 'sim' || payload.useFgts === true ? 'Sim' : 'Não',
      Number(payload.fgtsValue || 0),
      Number(payload.financingValue || 0),
      Number(payload.termYears || 0),
      (payload.amortizationSystem || '').toUpperCase(),
    ]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Format Column Widths for Readability
  worksheet['!cols'] = [
    { wch: 14 }, // ID Proposta
    { wch: 18 }, // Data Envio
    { wch: 14 }, // Status
    { wch: 30 }, // Nome P1
    { wch: 16 }, // CPF P1
    { wch: 16 }, // RG P1
    { wch: 14 }, // Nascimento
    { wch: 14 }, // Estado Civil
    { wch: 28 }, // E-mail P1
    { wch: 16 }, // Telefone P1
    { wch: 22 }, // Profissão P1
    { wch: 16 }, // Tempo FGTS
    { wch: 18 }, // Renda P1
    { wch: 16 }, // Has P2
    { wch: 30 }, // Nome P2
    { wch: 16 }, // CPF P2
    { wch: 28 }, // E-mail P2
    { wch: 22 }, // Profissão P2
    { wch: 18 }, // Renda P2
    { wch: 14 }, // Usou FGTS
    { wch: 14 }, // Possui Imóvel
    { wch: 45 }, // Endereço
    { wch: 14 }, // Garagem
    { wch: 18 }, // Valor Venda
    { wch: 18 }, // Valor Entrada
    { wch: 22 }, // Usará FGTS
    { wch: 16 }, // Valor FGTS
    { wch: 20 }, // Valor Financiado
    { wch: 14 }, // Prazo
    { wch: 18 }, // Amortização
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cadastros Fourcred');

  const dateFileTag = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 12);
  XLSX.writeFile(workbook, `Fourcred_Relatorio_Propostas_${dateFileTag}.xlsx`);
};
