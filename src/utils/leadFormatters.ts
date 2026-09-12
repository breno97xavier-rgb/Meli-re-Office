import {
  Lead,
  LeadStatus,
  LeadType,
  LeadServiceInterest,
  LeadCurrentSituation,
  LeadObjective,
  PreferredCallPeriod,
  PreferredContact,
  LeadSource,
  LeadService,
  BusinessStage,
} from '../types/leads';

/**
 * Retorna o label amigável em português para o tipo de lead (Empresa / Autônomo).
 */
export function getLeadTypeLabel(type?: LeadType | string | null): string {
  if (!type) return 'Não especificado';
  switch (type) {
    case 'business':
      return 'Empresa';
    case 'self_employed':
      return 'Autônomo';
    default:
      return type;
  }
}

/**
 * Retorna o label amigável para um serviço de interesse ou serviço legado.
 */
export function getServiceInterestLabel(
  service?: LeadServiceInterest | LeadService | string | null
): string {
  if (!service) return 'Não especificado';
  switch (service) {
    case 'social_media':
      return 'Conteúdo e redes sociais';
    case 'paid_traffic':
      return 'Tráfego pago e aquisição';
    case 'website_portfolio':
    case 'website':
      return 'Site ou portfólio';
    case 'branding_positioning':
    case 'branding':
      return 'Marca e posicionamento';
    case 'full_strategy':
      return 'Estratégia mais completa';
    case 'not_sure':
      return 'Ainda não sei exatamente';
    default:
      return service;
  }
}

/**
 * Alias compatível com helpers antigos.
 */
export const getServiceLabel = getServiceInterestLabel;

/**
 * Retorna o label amigável para a situação atual do lead, adaptando o pronome/conjugação
 * conforme o tipo de lead (Empresa vs. Autônomo vs. Neutro).
 */
export function getCurrentSituationLabel(
  situation?: LeadCurrentSituation | BusinessStage | string | null,
  leadType?: LeadType | null
): string {
  if (!situation) return 'Não informado';

  if (leadType === 'business') {
    switch (situation) {
      case 'not_started':
        return 'Ainda não fazemos nada estruturado';
      case 'in_house':
        return 'Fazemos internamente';
      case 'active_agency_or_freelancer':
        return 'Já trabalhamos com profissionais ou agência';
      case 'past_experience':
        return 'Já trabalhamos com profissionais anteriormente';
      case 'wants_improvement':
        return 'Já tentamos antes, mas queremos melhorar';
      case 'evaluating_options':
        return 'Estamos apenas avaliando possibilidades';
      default:
        break;
    }
  } else if (leadType === 'self_employed') {
    switch (situation) {
      case 'not_started':
        return 'Ainda não faço nada estruturado';
      case 'in_house':
        return 'Faço tudo sozinho';
      case 'active_agency_or_freelancer':
        return 'Já trabalho com algum profissional';
      case 'past_experience':
        return 'Já trabalhei com profissionais anteriormente';
      case 'wants_improvement':
        return 'Já tentei antes, mas quero melhorar';
      case 'evaluating_options':
        return 'Estou apenas avaliando possibilidades';
      default:
        break;
    }
  } else {
    // Sem lead_type definido (neutro)
    switch (situation) {
      case 'not_started':
        return 'Ainda não começou nada estruturado';
      case 'in_house':
        return 'Faz internamente / por conta própria';
      case 'active_agency_or_freelancer':
        return 'Trabalha com agência ou profissional';
      case 'past_experience':
        return 'Já trabalhou com profissionais anteriormente';
      case 'wants_improvement':
        return 'Já tentou antes, mas quer melhorar';
      case 'evaluating_options':
        return 'Avaliando possibilidades';
      default:
        break;
    }
  }

  // Suporte a valores legados do BusinessStage
  switch (situation) {
    case 'starting':
      return 'Começando agora';
    case 'needs_structure':
      return 'Precisa de estruturação';
    case 'has_presence':
      return 'Já possui presença digital';
    case 'professionalizing':
      return 'Profissionalizando a marca';
    default:
      return situation;
  }
}

/**
 * Alias compatível com helpers antigos.
 */
export function getBusinessStageLabel(stage?: BusinessStage | string | null): string {
  return getCurrentSituationLabel(stage, null);
}

/**
 * Retorna o label amigável para um objetivo de negócio/marketing.
 */
export function getObjectiveLabel(
  objective?: LeadObjective | string | null,
  leadType?: LeadType | null
): string {
  if (!objective) return 'Não informado';
  switch (objective) {
    case 'attract_clients':
      return 'Atrair mais clientes';
    case 'brand_perception':
      return 'Melhorar a percepção da marca';
    case 'organize_communication':
      return 'Organizar a comunicação';
    case 'increase_conversion':
      return 'Melhorar conversão';
    case 'repositioning':
      return leadType === 'business'
        ? 'Melhorar o posicionamento'
        : 'Posicionar melhor meu trabalho';
    case 'launch_or_rebrand':
      return 'Lançar ou reformular algo';
    case 'other':
      return 'Outro';
    default:
      return objective;
  }
}

/**
 * Retorna o label amigável para o período preferencial de ligação.
 */
export function getPreferredCallPeriodLabel(
  period?: PreferredCallPeriod | string | null
): string {
  if (!period) return 'Não especificado';
  switch (period) {
    case 'morning':
      return 'Manhã';
    case 'afternoon':
      return 'Tarde';
    default:
      return period;
  }
}

/**
 * Retorna o label amigável para o canal preferencial de contato.
 */
export function getPreferredContactLabel(
  contact?: PreferredContact | string | null
): string {
  if (!contact) return 'Sem preferência';
  switch (contact) {
    case 'whatsapp':
      return 'WhatsApp';
    case 'phone':
      return 'Telefone / Ligação';
    case 'email':
      return 'E-mail';
    default:
      return contact;
  }
}

/**
 * Retorna o label amigável para a origem do lead.
 */
export function getSourceLabel(source?: LeadSource | string | null): string {
  if (!source) return 'Outro';
  switch (source) {
    case 'website':
      return 'Site';
    case 'meta_ads':
      return 'Meta Ads';
    case 'google_ads':
      return 'Google Ads';
    case 'instagram':
      return 'Instagram';
    case 'referral':
      return 'Indicação';
    case 'prospecting':
      return 'Prospecção';
    case 'whatsapp':
      return 'WhatsApp';
    case 'other':
      return 'Outro';
    default:
      return source;
  }
}

/**
 * Retorna o label amigável para o status do lead.
 */
export function getStatusLabel(status: LeadStatus): string {
  switch (status) {
    case 'new':
      return 'Novo';
    case 'contacted':
      return 'Contatado';
    case 'qualified':
      return 'Qualificado';
    case 'disqualified':
      return 'Desqualificado';
    case 'converted':
      return 'Convertido';
    default:
      return status;
  }
}

// ==========================================
// HELPERS DE COMPATIBILIDADE E RETROALIMENTAÇÃO
// ==========================================

/**
 * Extrai a lista unificada de serviços de interesse do Lead.
 * Prioriza services_interest (novo array). Caso nulo/vazio, faz fallback seguro para service legado.
 */
export function getLeadServices(lead?: Partial<Lead> | null): string[] {
  if (!lead) return [];
  if (Array.isArray(lead.services_interest) && lead.services_interest.length > 0) {
    return lead.services_interest.filter(Boolean);
  }
  if (lead.service && typeof lead.service === 'string' && lead.service.trim() !== '') {
    return [lead.service];
  }
  return [];
}

/**
 * Extrai a lista unificada de situações do Lead.
 * Prioriza current_situation (novo array). Caso nulo/vazio, faz fallback para business_stage legado.
 */
export function getLeadSituations(lead?: Partial<Lead> | null): string[] {
  if (!lead) return [];
  if (Array.isArray(lead.current_situation) && lead.current_situation.length > 0) {
    return lead.current_situation.filter(Boolean);
  }
  if (lead.business_stage && typeof lead.business_stage === 'string' && lead.business_stage.trim() !== '') {
    return [lead.business_stage];
  }
  return [];
}

/**
 * Extrai a lista de objetivos do Lead de forma segura.
 */
export function getLeadObjectives(lead?: Partial<Lead> | null): string[] {
  if (!lead) return [];
  if (Array.isArray(lead.objectives) && lead.objectives.length > 0) {
    return lead.objectives.filter(Boolean);
  }
  return [];
}

/**
 * Retorna o melhor texto de anotação/mensagem do Lead.
 * Prioriza notes (campo novo do briefing) e faz fallback para message legado.
 */
export function getLeadNotesOrMessage(lead?: Partial<Lead> | null): string | null {
  if (!lead) return null;
  if (typeof lead.notes === 'string' && lead.notes.trim() !== '') {
    return lead.notes.trim();
  }
  if (typeof lead.message === 'string' && lead.message.trim() !== '') {
    return lead.message.trim();
  }
  return null;
}

/**
 * Verifica se o Lead possui metadados de rastreamento UTM ou navegação preenchidos.
 */
export function hasLeadUtmData(lead?: Partial<Lead> | null): boolean {
  if (!lead) return false;
  return Boolean(
    lead.utm_source?.trim() ||
      lead.utm_medium?.trim() ||
      lead.utm_campaign?.trim() ||
      lead.utm_content?.trim() ||
      lead.utm_term?.trim() ||
      lead.referrer?.trim() ||
      lead.landing_url?.trim()
  );
}

/**
 * Estrutura de identificação do Lead para renderização uniforme na listagem e drawer.
 */
export interface LeadEntityDisplay {
  title: string;
  subtitle: string;
  badge?: string;
}

/**
 * Retorna o título, subtítulo e badge contextual do Lead sem duplicação de dados.
 */
export function getLeadEntityDisplay(lead?: Partial<Lead> | null): LeadEntityDisplay {
  if (!lead) {
    return { title: 'Lead', subtitle: '' };
  }

  const name = lead.name?.trim() || '';
  const businessName = lead.business_name?.trim() || '';
  const segment = lead.segment_or_profession?.trim() || '';

  if (lead.lead_type === 'business') {
    const title = businessName || name || 'Empresa sem nome';
    let subtitle = '';
    if (name && businessName && name.toLowerCase() !== businessName.toLowerCase()) {
      subtitle = name;
    } else if (segment) {
      subtitle = segment;
    } else {
      subtitle = 'Empresa';
    }
    return { title, subtitle, badge: 'Empresa' };
  }

  if (lead.lead_type === 'self_employed') {
    const title = businessName || name || 'Profissional Autônomo';
    let subtitle = '';
    if (segment) {
      subtitle = segment;
    } else if (name && businessName && name.toLowerCase() !== businessName.toLowerCase()) {
      subtitle = name;
    } else {
      subtitle = 'Profissional Autônomo';
    }
    return { title, subtitle, badge: 'Autônomo' };
  }

  // Lead histórico / sem lead_type especificado
  const title = businessName || name || 'Lead';
  let subtitle = '';
  if (businessName && name && businessName.toLowerCase() !== name.toLowerCase()) {
    subtitle = name;
  } else if (segment) {
    subtitle = segment;
  }

  return { title, subtitle };
}
