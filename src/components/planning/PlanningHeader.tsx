import React from 'react';
import { Building2, Compass, Layers } from 'lucide-react';
import { Client } from '../../types/clients';

interface PlanningHeaderProps {
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
  loadingClients: boolean;
}

export const PlanningHeader: React.FC<PlanningHeaderProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  loadingClients,
}) => {
  const activeClients = clients.filter(
    (c) => c.status === 'active' || c.status === 'onboarding'
  );

  return (
    <div
      id="planning-header"
      className="bg-white border border-[#E8E9EA] rounded-xl p-5 md:p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1D1D1D] text-white flex items-center justify-center">
            <Compass className="w-4 h-4 text-[#F3705A]" />
          </div>
          <h1 className="text-lg md:text-xl font-semibold text-[#1D1D1D] tracking-tight">
            Planejamento
          </h1>
        </div>
        <p className="text-xs text-[#666668]">
          Diretrizes estratégicas da marca e catálogo mestre de pilares editoriais.
        </p>
      </div>

      {/* Client Selector */}
      <div className="flex items-center gap-3 self-start md:self-auto">
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8D8F] pointer-events-none" />
          <select
            id="planning-client-select"
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            disabled={loadingClients}
            className="pl-9 pr-9 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] cursor-pointer appearance-none min-w-[220px] max-w-[320px] truncate transition-all disabled:opacity-60"
          >
            <option value="">Selecione um cliente...</option>
            {activeClients.length > 0 ? (
              <optgroup label="Clientes Ativos">
                {activeClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.commercial_name || client.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {clients.filter((c) => c.status !== 'active' && c.status !== 'onboarding').length > 0 ? (
              <optgroup label="Outros Clientes">
                {clients
                  .filter((c) => c.status !== 'active' && c.status !== 'onboarding')
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.commercial_name || client.name} ({client.status})
                    </option>
                  ))}
              </optgroup>
            ) : null}
          </select>
        </div>
      </div>
    </div>
  );
};
