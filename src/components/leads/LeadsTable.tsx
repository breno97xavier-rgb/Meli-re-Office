import React from 'react';
import {
  MessageSquare,
  Mail,
  PhoneCall,
  Globe,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Lead } from '../../types/leads';
import { LeadStatusBadge } from './LeadStatusBadge';
import {
  getSourceLabel,
  getServiceInterestLabel,
  getPreferredCallPeriodLabel,
  getLeadServices,
  getLeadEntityDisplay,
} from '../../utils/leadFormatters';

interface LeadsTableProps {
  leads: Lead[];
  loading: boolean;
  selectedLeadId: string | null;
  onSelectLead: (lead: Lead) => void;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  loading,
  selectedLeadId,
  onSelectLead,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return {
        date: new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }).format(date),
        time: new Intl.DateTimeFormat('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }).format(date),
      };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="bg-white border border-[#E8E9EA] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E8E9EA] bg-[#FAFAFA]">
          <div className="h-4 bg-[#E8E9EA] rounded w-48 animate-pulse" />
        </div>
        <div className="divide-y divide-[#E8E9EA]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4.5 flex items-center justify-between gap-4 animate-pulse">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-[#E8E9EA] rounded w-1/3" />
                <div className="h-3 bg-[#E8E9EA]/60 rounded w-1/4" />
              </div>
              <div className="h-6 bg-[#E8E9EA] rounded w-24 hidden sm:block" />
              <div className="h-6 bg-[#E8E9EA] rounded w-20" />
              <div className="h-4 bg-[#E8E9EA] rounded w-28 hidden md:block" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="leads-table-container" className="bg-white border border-[#E8E9EA] rounded-xl overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E8E9EA] bg-[#FAFAFA] text-xs font-semibold text-[#666668] uppercase tracking-wider">
              <th className="py-3.5 px-4 sm:px-6">Lead / Negócio</th>
              <th className="py-3.5 px-4 hidden sm:table-cell">Interesses</th>
              <th className="py-3.5 px-4 hidden md:table-cell">Origem</th>
              <th className="py-3.5 px-4 hidden lg:table-cell">Contato</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 hidden sm:table-cell text-right">Data de Entrada</th>
              <th className="py-3.5 px-3 text-right">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8E9EA] text-sm text-[#1D1D1D]">
            {leads.map((lead) => {
              const isSelected = selectedLeadId === lead.id;
              const entity = getLeadEntityDisplay(lead);
              const services = getLeadServices(lead);
              const dateInfo = formatDate(lead.created_at);

              return (
                <tr
                  key={lead.id}
                  id={`lead-row-${lead.id}`}
                  onClick={() => onSelectLead(lead)}
                  className={`group cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'bg-[#FDF1EE]/40 hover:bg-[#FDF1EE]/60'
                      : 'hover:bg-[#F7F7F8]'
                  }`}
                >
                  {/* Lead / Negócio */}
                  <td className="py-3.5 px-4 sm:px-6 max-w-[240px] sm:max-w-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#1D1D1D] group-hover:text-[#F15A3C] transition-colors truncate">
                        {entity.title}
                      </span>
                      {entity.badge && (
                        <span
                          id={`lead-type-tag-${lead.id}`}
                          className="px-1.5 py-0.5 text-2xs font-semibold rounded bg-[#F2F3F3] text-[#555557] border border-[#E0E1E2] shrink-0"
                        >
                          {entity.badge}
                        </span>
                      )}
                    </div>
                    {entity.subtitle ? (
                      <div className="text-xs text-[#666668] mt-0.5 truncate font-normal">
                        {entity.subtitle}
                      </div>
                    ) : (
                      <div className="text-xs text-[#9E9EA0] mt-0.5 italic font-normal">
                        Sem subtítulo
                      </div>
                    )}
                  </td>

                  {/* Interesses (Chips limitados a 2) */}
                  <td className="py-3.5 px-4 hidden sm:table-cell">
                    {services.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 max-w-[260px]">
                        {services.slice(0, 2).map((svcKey, idx) => (
                          <span
                            key={`${svcKey}-${idx}`}
                            className="inline-flex items-center text-xs font-medium text-[#333335] bg-[#F7F7F8] border border-[#E8E9EA] px-2 py-0.5 rounded-md truncate max-w-[150px]"
                            title={getServiceInterestLabel(svcKey)}
                          >
                            {getServiceInterestLabel(svcKey)}
                          </span>
                        ))}
                        {services.length > 2 && (
                          <span
                            className="inline-flex items-center text-2xs font-semibold text-[#666668] bg-[#E8E9EA]/60 px-1.5 py-0.5 rounded-md"
                            title={`+${services.length - 2} outro(s) interesse(s)`}
                          >
                            +{services.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-[#9E9EA0] italic font-normal">
                        Não especificado
                      </span>
                    )}
                  </td>

                  {/* Origem */}
                  <td className="py-3.5 px-4 hidden md:table-cell">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs text-[#1D1D1D] font-medium">
                        <Globe className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
                        <span>{getSourceLabel(lead.source)}</span>
                      </div>
                      {lead.utm_campaign && (
                        <div
                          className="text-2xs text-[#9E9EA0] mt-0.5 truncate max-w-[140px]"
                          title={lead.utm_campaign}
                        >
                          {lead.utm_campaign}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Contato Preferido */}
                  <td className="py-3.5 px-4 hidden lg:table-cell">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1D1D1D]">
                        {lead.preferred_contact === 'whatsapp' ? (
                          <MessageSquare className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                        ) : lead.preferred_contact === 'phone' ? (
                          <PhoneCall className="w-3.5 h-3.5 text-[#F15A3C] shrink-0" />
                        ) : lead.preferred_contact === 'email' ? (
                          <Mail className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                        ) : null}
                        <span>
                          {lead.preferred_contact === 'phone'
                            ? 'Ligação'
                            : lead.preferred_contact === 'whatsapp'
                            ? 'WhatsApp'
                            : lead.preferred_contact === 'email'
                            ? 'E-mail'
                            : 'Sem preferência'}
                        </span>
                      </div>
                      {lead.preferred_contact === 'phone' && lead.preferred_call_period && (
                        <div className="text-2xs text-[#666668] mt-0.5">
                          {getPreferredCallPeriodLabel(lead.preferred_call_period)}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <LeadStatusBadge status={lead.status} />
                  </td>

                  {/* Data de Entrada */}
                  <td className="py-3.5 px-4 hidden sm:table-cell text-right">
                    <div>
                      <div className="inline-flex items-center gap-1.5 text-xs text-[#1D1D1D] font-medium">
                        <Clock className="w-3 h-3 text-[#9E9EA0]" />
                        <span>{dateInfo.date}</span>
                      </div>
                      {dateInfo.time && (
                        <div className="text-2xs text-[#9E9EA0] mt-0.5 font-normal">
                          às {dateInfo.time}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Seta indicativa */}
                  <td className="py-3.5 px-3 text-right">
                    <ChevronRight className="w-4 h-4 text-[#9E9EA0] group-hover:text-[#F15A3C] transition-colors ml-auto" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

