import React from 'react';
import { Users, TrendingUp, FileText, FileCheck } from 'lucide-react';
import type { RoutePath } from '../../types';
import { useRouter } from '../../hooks/useRouter';

interface CommercialTabsProps {
  activeTab: 'leads' | 'oportunidades' | 'propostas' | 'contratos';
  onNavigate?: (path: RoutePath) => void;
}

export const CommercialTabs: React.FC<CommercialTabsProps> = ({
  activeTab,
  onNavigate,
}) => {
  const router = useRouter();
  const handleNav = onNavigate || router.navigate;

  return (
    <div
      id="commercial-tabs-nav"
      className="flex items-center gap-1.5 sm:gap-2 p-1 bg-[#E8E9EA]/50 rounded-xl w-fit border border-[#E8E9EA] overflow-x-auto max-w-full"
    >
      <button
        id="tab-btn-leads"
        onClick={() => handleNav('/comercial/leads')}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
          activeTab === 'leads'
            ? 'bg-white text-[#1D1D1D] shadow-xs border border-[#E8E9EA]'
            : 'text-[#666668] hover:text-[#1D1D1D] hover:bg-white/50 border border-transparent'
        }`}
      >
        <Users
          className={`w-4 h-4 ${
            activeTab === 'leads' ? 'text-[#F15A3C]' : 'text-[#9E9EA0]'
          }`}
        />
        <span>Leads</span>
      </button>

      <button
        id="tab-btn-oportunidades"
        onClick={() => handleNav('/comercial/oportunidades')}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
          activeTab === 'oportunidades'
            ? 'bg-white text-[#1D1D1D] shadow-xs border border-[#E8E9EA]'
            : 'text-[#666668] hover:text-[#1D1D1D] hover:bg-white/50 border border-transparent'
        }`}
      >
        <TrendingUp
          className={`w-4 h-4 ${
            activeTab === 'oportunidades' ? 'text-[#F15A3C]' : 'text-[#9E9EA0]'
          }`}
        />
        <span>Oportunidades</span>
      </button>

      <button
        id="tab-btn-propostas"
        onClick={() => handleNav('/comercial/propostas')}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
          activeTab === 'propostas'
            ? 'bg-white text-[#1D1D1D] shadow-xs border border-[#E8E9EA]'
            : 'text-[#666668] hover:text-[#1D1D1D] hover:bg-white/50 border border-transparent'
        }`}
      >
        <FileText
          className={`w-4 h-4 ${
            activeTab === 'propostas' ? 'text-[#F15A3C]' : 'text-[#9E9EA0]'
          }`}
        />
        <span>Propostas</span>
      </button>

      <button
        id="tab-btn-contratos"
        onClick={() => handleNav('/comercial/contratos')}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap ${
          activeTab === 'contratos'
            ? 'bg-white text-[#1D1D1D] shadow-xs border border-[#E8E9EA]'
            : 'text-[#666668] hover:text-[#1D1D1D] hover:bg-white/50 border border-transparent'
        }`}
      >
        <FileCheck
          className={`w-4 h-4 ${
            activeTab === 'contratos' ? 'text-[#F15A3C]' : 'text-[#9E9EA0]'
          }`}
        />
        <span>Contratos</span>
      </button>
    </div>
  );
};
