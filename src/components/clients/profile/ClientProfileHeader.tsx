import React from 'react';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Edit3,
  Tag,
  Clock,
  ExternalLink,
  Globe,
  Instagram,
  Mail,
  Phone,
} from 'lucide-react';
import { Client } from '../../../types/clients';
import {
  ClientStatusBadge,
  formatCurrency,
  formatDate,
} from '../ClientStatusBadge';

interface ClientProfileHeaderProps {
  client: Client;
  onBack: () => void;
  onOpenEdit: () => void;
}

export const ClientProfileHeader: React.FC<ClientProfileHeaderProps> = ({
  client,
  onBack,
  onOpenEdit,
}) => {
  const getInitials = () => {
    const title = client.commercial_name || client.name || 'CL';
    const parts = title.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return title.slice(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white border border-[#E8E9EA] rounded-2xl p-6 shadow-2xs space-y-6">
      {/* Top Bar: Back button & Edit action */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          id="btn-back-to-clients"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] rounded-lg transition-all cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Clientes</span>
        </button>

        <button
          type="button"
          id="btn-edit-client-header"
          onClick={onOpenEdit}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-lg transition-all cursor-pointer shadow-xs"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Editar dados do cliente</span>
        </button>
      </div>

      {/* Main Profile Info Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-2">
        {/* Left: Avatar + Names + Badges */}
        <div className="flex items-start gap-4 min-w-0">
          {client.logo_url ? (
            <img
              src={client.logo_url}
              alt={client.commercial_name || client.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-2xl object-contain bg-white border border-[#E8E9EA] p-1.5 shrink-0 shadow-xs"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#1D1D1D] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-xs tracking-tight">
              {getInitials()}
            </div>
          )}

          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-[#1D1D1D] tracking-tight truncate">
                {client.commercial_name || client.name}
              </h1>
              <ClientStatusBadge status={client.status} />
            </div>

            {client.commercial_name && client.commercial_name !== client.name && (
              <p className="text-xs font-medium text-[#666668] truncate">
                Razão Social: <span className="text-[#1D1D1D]">{client.name}</span>
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-[#666668] flex-wrap pt-0.5">
              {client.segment && (
                <span className="inline-flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-[#9E9EA0]" />
                  <span>{client.segment}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#9E9EA0]" />
                <span>Cliente desde {formatDate(client.created_at)}</span>
              </span>

              {client.website && (
                <a
                  href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#1D1D1D] hover:underline"
                >
                  <Globe className="w-3.5 h-3.5 text-[#9E9EA0]" />
                  <span className="truncate max-w-[150px]">Website</span>
                  <ExternalLink className="w-3 h-3 text-[#9E9EA0]" />
                </a>
              )}

              {client.instagram && (
                <a
                  href={`https://instagram.com/${client.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#1D1D1D] hover:underline"
                >
                  <Instagram className="w-3.5 h-3.5 text-[#9E9EA0]" />
                  <span>{client.instagram}</span>
                  <ExternalLink className="w-3 h-3 text-[#9E9EA0]" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Contract & Financial Metrics Cards */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          {/* Vigência */}
          <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl px-4 py-3 min-w-[150px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666668] flex items-center gap-1 block">
              <Calendar className="w-3 h-3 text-[#9E9EA0]" />
              Vigência Contratual
            </span>
            <div className="text-xs font-bold text-[#1D1D1D] mt-1">
              {client.contract_start_date ? (
                <span>
                  {formatDate(client.contract_start_date)}
                  {client.contract_end_date && ` → ${formatDate(client.contract_end_date)}`}
                </span>
              ) : (
                <span className="text-[#9E9EA0] font-normal">Não definida</span>
              )}
            </div>
          </div>

          {/* Mensalidade Recorrente */}
          <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl px-4 py-3 min-w-[140px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666668] flex items-center gap-1 block">
              <DollarSign className="w-3 h-3 text-[#F15A3C]" />
              Recorrência
            </span>
            <div className="text-sm font-bold text-[#1D1D1D] mt-1">
              {client.monthly_amount !== null && client.monthly_amount !== undefined
                ? `${formatCurrency(client.monthly_amount)}/mês`
                : '—'}
            </div>
          </div>

          {/* Setup / Valor Pontual */}
          {client.one_time_amount !== null && client.one_time_amount !== undefined && client.one_time_amount > 0 && (
            <div className="bg-[#F7F7F8] border border-[#E8E9EA] rounded-xl px-4 py-3 min-w-[130px]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#666668] flex items-center gap-1 block">
                <DollarSign className="w-3 h-3 text-[#9E9EA0]" />
                Setup / Pontual
              </span>
              <div className="text-sm font-bold text-[#1D1D1D] mt-1">
                {formatCurrency(client.one_time_amount)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
