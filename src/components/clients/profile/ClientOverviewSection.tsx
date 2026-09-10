import React from 'react';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  Instagram,
  FileText,
  Calendar,
  DollarSign,
  Briefcase,
  CheckCircle2,
  FileCheck,
  ExternalLink,
  Info,
  Clock,
} from 'lucide-react';
import { Client } from '../../../types/clients';
import {
  ClientStatusBadge,
  STATUS_CONFIG,
  formatCurrency,
  formatDate,
} from '../ClientStatusBadge';

interface ClientOverviewSectionProps {
  client: Client;
  onOpenEdit: () => void;
}

export const ClientOverviewSection: React.FC<ClientOverviewSectionProps> = ({
  client,
  onOpenEdit,
}) => {
  const currentStatusConfig = STATUS_CONFIG[client.status] || STATUS_CONFIG.onboarding;

  return (
    <div className="p-6 md:p-8 space-y-8 bg-white rounded-b-2xl border-x border-b border-[#E8E9EA]">
      {/* 3-Column Grid for Primary Operational Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Dados Cadastrais e Institucionais */}
        <div className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E9EA]">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#F15A3C]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1D]">
                Dados Cadastrais
              </h3>
            </div>
            <button
              type="button"
              onClick={onOpenEdit}
              className="text-[11px] font-semibold text-[#666668] hover:text-[#1D1D1D] hover:underline cursor-pointer"
            >
              Editar
            </button>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <span className="text-[11px] font-medium text-[#666668] block">
                Nome Comercial / Fantasia
              </span>
              <span className="font-semibold text-[#1D1D1D] block mt-0.5">
                {client.commercial_name || client.name}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-[#666668] block">
                Razão Social
              </span>
              <span className="font-medium text-[#1D1D1D] block mt-0.5">
                {client.name}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-medium text-[#666668] block">
                Segmento de Atuação
              </span>
              <span className="font-medium text-[#1D1D1D] block mt-0.5">
                {client.segment || <span className="text-[#9E9EA0] italic">Não informado</span>}
              </span>
            </div>

            <div className="pt-2 border-t border-[#E8E9EA] space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9EA0] block">
                Canais de Contato
              </span>

              <div className="flex items-center gap-2 text-xs">
                <Mail className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="text-[#1D1D1D] hover:underline truncate"
                  >
                    {client.email}
                  </a>
                ) : (
                  <span className="text-[#9E9EA0] italic">E-mail não cadastrado</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Phone className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
                {client.phone ? (
                  <span className="text-[#1D1D1D]">{client.phone}</span>
                ) : (
                  <span className="text-[#9E9EA0] italic">Telefone não cadastrado</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Globe className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
                {client.website ? (
                  <a
                    href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1D1D1D] hover:underline inline-flex items-center gap-1 truncate"
                  >
                    <span className="truncate">{client.website}</span>
                    <ExternalLink className="w-3 h-3 text-[#9E9EA0]" />
                  </a>
                ) : (
                  <span className="text-[#9E9EA0] italic">Website não cadastrado</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Instagram className="w-3.5 h-3.5 text-[#9E9EA0] shrink-0" />
                {client.instagram ? (
                  <a
                    href={`https://instagram.com/${client.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1D1D1D] hover:underline inline-flex items-center gap-1"
                  >
                    <span>{client.instagram}</span>
                    <ExternalLink className="w-3 h-3 text-[#9E9EA0]" />
                  </a>
                ) : (
                  <span className="text-[#9E9EA0] italic">Instagram não cadastrado</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Status & Vigência Contratual */}
        <div className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E9EA]">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#F15A3C]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1D]">
                Status & Vigência
              </h3>
            </div>
            <ClientStatusBadge status={client.status} />
          </div>

          <div className="space-y-4 text-xs">
            {/* Status Explicativo */}
            <div className="bg-white border border-[#E8E9EA] rounded-xl p-3.5 flex items-start gap-3 shadow-2xs">
              <span className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${currentStatusConfig.dot}`} />
              <div>
                <span className="font-bold text-[#1D1D1D] block">
                  {currentStatusConfig.label}
                </span>
                <p className="text-[11px] text-[#666668] mt-0.5">
                  {client.status === 'onboarding' && 'Cliente em fase inicial de integração, alinhamento e setup.'}
                  {client.status === 'active' && 'Contrato em vigência com serviços operacionais ativos.'}
                  {client.status === 'paused' && 'Serviços temporariamente pausados ou em renegociação.'}
                  {client.status === 'ended' && 'Contrato encerrado ou serviços descontinuados.'}
                </p>
              </div>
            </div>

            {/* Período de Vigência */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium text-[#666668] block">
                Período Contratual
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-[#E8E9EA] rounded-xl p-2.5">
                  <span className="text-[10px] text-[#9E9EA0] block">Início</span>
                  <span className="font-semibold text-[#1D1D1D] block mt-0.5">
                    {formatDate(client.contract_start_date)}
                  </span>
                </div>
                <div className="bg-white border border-[#E8E9EA] rounded-xl p-2.5">
                  <span className="text-[10px] text-[#9E9EA0] block">Término</span>
                  <span className="font-semibold text-[#1D1D1D] block mt-0.5">
                    {formatDate(client.contract_end_date)}
                  </span>
                </div>
              </div>
            </div>

            {/* Condições Financeiras */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-medium text-[#666668] block">
                Condições Financeiras Contratadas
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-[#E8E9EA] rounded-xl p-2.5">
                  <span className="text-[10px] text-[#666668] block">Recorrência Mensal</span>
                  <span className="text-xs font-bold text-[#1D1D1D] block mt-0.5">
                    {client.monthly_amount !== null && client.monthly_amount !== undefined
                      ? `${formatCurrency(client.monthly_amount)}/mês`
                      : '—'}
                  </span>
                </div>
                <div className="bg-white border border-[#E8E9EA] rounded-xl p-2.5">
                  <span className="text-[10px] text-[#666668] block">Setup / Pontual</span>
                  <span className="text-xs font-bold text-[#1D1D1D] block mt-0.5">
                    {client.one_time_amount !== null && client.one_time_amount !== undefined
                      ? formatCurrency(client.one_time_amount)
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Origem Comercial */}
        <div className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E9EA]">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#F15A3C]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1D]">
                Origem Comercial
              </h3>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Contrato de Origem */}
            {client.origin_contract_id ? (
              <div className="bg-white border border-[#E8E9EA] rounded-xl p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9EA0] flex items-center gap-1">
                    <FileText className="w-3 h-3 text-[#F15A3C]" />
                    Contrato de Conversão
                  </span>
                  {client.origin_contract?.status && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {client.origin_contract.status}
                    </span>
                  )}
                </div>

                <div>
                  <span className="font-bold text-[#1D1D1D] block">
                    {client.origin_contract?.contract_number || `Contrato #${client.origin_contract_id.slice(0, 8)}`}
                  </span>
                  {client.origin_contract?.title && (
                    <p className="text-[11px] text-[#666668] truncate mt-0.5">
                      {client.origin_contract.title} (v{client.origin_contract.version || 1})
                    </p>
                  )}
                </div>

                {client.origin_contract?.signed_at && (
                  <div className="flex items-center gap-1 text-[10px] text-[#666668] pt-1 border-t border-[#F2F3F3]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Assinado em {formatDate(client.origin_contract.signed_at)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-[#E8E9EA] rounded-xl p-3 text-[11px] text-[#9E9EA0] italic text-center">
                Sem contrato de conversão vinculado diretamente.
              </div>
            )}

            {/* Oportunidade de Origem */}
            {client.origin_opportunity_id ? (
              <div className="bg-white border border-[#E8E9EA] rounded-xl p-3.5 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E9EA0] flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-[#F15A3C]" />
                    Oportunidade Comercial
                  </span>
                  {client.origin_opportunity?.stage && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F2F3F3] text-[#1D1D1D]">
                      {client.origin_opportunity.stage}
                    </span>
                  )}
                </div>

                <div>
                  <span className="font-bold text-[#1D1D1D] block truncate">
                    {client.origin_opportunity?.title || `Oportunidade #${client.origin_opportunity_id.slice(0, 8)}`}
                  </span>
                  {client.origin_opportunity?.estimated_value !== null && client.origin_opportunity?.estimated_value !== undefined && (
                    <p className="text-[11px] text-[#666668] mt-0.5">
                      Valor estimado:{' '}
                      <span className="font-semibold text-[#1D1D1D]">
                        {formatCurrency(client.origin_opportunity.estimated_value)}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-dashed border-[#E8E9EA] rounded-xl p-3 text-[11px] text-[#9E9EA0] italic text-center">
                Sem oportunidade comercial registrada na origem.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Observações Internas */}
      <div className="bg-[#FAFAFA] border border-[#E8E9EA] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E9EA]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#9E9EA0]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1D1D1D]">
              Observações Internas e Diretrizes da Operação
            </h3>
          </div>
          <button
            type="button"
            onClick={onOpenEdit}
            className="text-[11px] font-semibold text-[#666668] hover:text-[#1D1D1D] hover:underline cursor-pointer"
          >
            Editar observações
          </button>
        </div>

        {client.notes ? (
          <p className="text-xs text-[#1D1D1D] whitespace-pre-wrap leading-relaxed">
            {client.notes}
          </p>
        ) : (
          <p className="text-xs text-[#9E9EA0] italic">
            Nenhuma observação interna cadastrada para este cliente.
          </p>
        )}
      </div>

      {/* Registro de Auditoria / Sistema */}
      <div className="flex items-center justify-between text-[11px] text-[#9E9EA0] pt-2 border-t border-[#E8E9EA]">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Cadastrado em: {formatDate(client.created_at)}</span>
        </div>
        <div>
          <span>Última atualização: {formatDate(client.updated_at)}</span>
        </div>
      </div>
    </div>
  );
};
