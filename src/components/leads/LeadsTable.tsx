import React from 'react';
import { MessageSquare, Mail, Globe, Clock, ChevronRight } from 'lucide-react';
import { Lead } from '../../types/leads';
import {
  LeadStatusBadge,
  getServiceLabel,
  getSourceLabel,
  getPreferredContactLabel,
} from './LeadStatusBadge';

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
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
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
              <th className="py-3.5 px-4 hidden sm:table-cell">Serviço</th>
              <th className="py-3.5 px-4 hidden md:table-cell">Origem</th>
              <th className="py-3.5 px-4 hidden lg:table-cell">Contato Preferido</th>
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
                  <td className="py-4 px-4 sm:px-6">
                    <div className="font-medium text-[#1D1D1D] group-hover:text-[#F15A3C] transition-colors">
                      {lead.name}
                    </div>
                    {lead.business_name ? (
                      <div className="text-xs text-[#666668] mt-0.5 font-normal">
                        {lead.business_name}
                      </div>
                    ) : (
                      <div className="text-xs text-[#9E9EA0] mt-0.5 italic font-normal">
                        Negócio não informado
                      </div>
                    )}
                  </td>

                  {/* Serviço */}
                  <td className="py-4 px-4 hidden sm:table-cell">
                    <span className="inline-flex items-center text-xs font-medium text-[#333335] bg-[#F7F7F8] border border-[#E8E9EA] px-2.5 py-1 rounded-md">
                      {getServiceLabel(lead.service)}
                    </span>
                  </td>

                  {/* Origem */}
                  <td className="py-4 px-4 hidden md:table-cell">
                    <div className="inline-flex items-center gap-1.5 text-xs text-[#666668]">
                      <Globe className="w-3.5 h-3.5 text-[#9E9EA0]" />
                      <span>{getSourceLabel(lead.source)}</span>
                    </div>
                  </td>

                  {/* Contato Preferido */}
                  <td className="py-4 px-4 hidden lg:table-cell">
                    <div className="inline-flex items-center gap-1.5 text-xs text-[#666668]">
                      {lead.preferred_contact === 'whatsapp' ? (
                        <MessageSquare className="w-3.5 h-3.5 text-[#059669]" />
                      ) : lead.preferred_contact === 'email' ? (
                        <Mail className="w-3.5 h-3.5 text-[#2563EB]" />
                      ) : null}
                      <span>{getPreferredContactLabel(lead.preferred_contact)}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4">
                    <LeadStatusBadge status={lead.status} />
                  </td>

                  {/* Data de Entrada */}
                  <td className="py-4 px-4 hidden sm:table-cell text-right">
                    <div className="inline-flex items-center gap-1.5 text-xs text-[#666668]">
                      <Clock className="w-3 h-3 text-[#9E9EA0]" />
                      <span>{formatDate(lead.created_at)}</span>
                    </div>
                  </td>

                  {/* Seta indicativa */}
                  <td className="py-4 px-3 text-right">
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
