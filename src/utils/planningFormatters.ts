import { EditorialPlanStatus, CampaignStatus } from '../types/planning';

/**
 * Formata data no formato YYYY-MM-DD para DD/MM/YYYY
 */
export function formatDateBR(dateString?: string | null): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

/**
 * Formata um período entre start_date e end_date para ciclos
 * Exemplo: "01/09/2026 — 30/09/2026"
 */
export function formatCyclePeriod(startDate?: string | null, endDate?: string | null): string {
  if (!startDate && !endDate) return 'Período não definido';
  if (startDate && !endDate) return `A partir de ${formatDateBR(startDate)}`;
  if (!startDate && endDate) return `Até ${formatDateBR(endDate)}`;
  return `${formatDateBR(startDate)} — ${formatDateBR(endDate)}`;
}

/**
 * Formata o período de uma campanha com suporte a datas opcionais
 * - sem start_date e sem end_date: "Sem período definido"
 * - somente start_date: "A partir de DD/MM/AAAA"
 * - start_date + end_date: "DD/MM/AAAA — DD/MM/AAAA"
 */
export function formatCampaignPeriod(startDate?: string | null, endDate?: string | null): string {
  if (!startDate && !endDate) return 'Sem período definido';
  if (startDate && !endDate) return `A partir de ${formatDateBR(startDate)}`;
  if (!startDate && endDate) return `Até ${formatDateBR(endDate)}`;
  return `${formatDateBR(startDate)} — ${formatDateBR(endDate)}`;
}

/**
 * Retorna o label amigável em português para o status do plano editorial
 */
export function getEditorialPlanStatusLabel(status: EditorialPlanStatus): string {
  switch (status) {
    case 'draft':
      return 'Rascunho';
    case 'active':
      return 'Ativo';
    case 'completed':
      return 'Concluído';
    case 'archived':
      return 'Arquivado';
    default:
      return status;
  }
}

/**
 * Retorna o label amigável em português para o status da campanha
 */
export function getCampaignStatusLabel(status: CampaignStatus): string {
  switch (status) {
    case 'draft':
      return 'Rascunho';
    case 'active':
      return 'Ativa';
    case 'completed':
      return 'Concluída';
    case 'archived':
      return 'Arquivada';
    default:
      return status;
  }
}

/**
 * Retorna as classes Tailwind para a badge de status do plano editorial
 */
export function getEditorialPlanStatusBadgeClass(status: EditorialPlanStatus): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'completed':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'archived':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'draft':
    default:
      return 'bg-[#F2F3F3] text-[#666668] border-[#E8E9EA]';
  }
}

/**
 * Retorna as classes Tailwind para a badge de status da campanha
 */
export function getCampaignStatusBadgeClass(status: CampaignStatus): string {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'completed':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'archived':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'draft':
    default:
      return 'bg-[#F2F3F3] text-[#666668] border-[#E8E9EA]';
  }
}
