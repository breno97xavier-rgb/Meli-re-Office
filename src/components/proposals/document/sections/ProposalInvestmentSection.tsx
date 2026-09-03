import React from 'react';
import { ProposalItem } from '../../../../types/proposals';
import { formatCurrency } from '../../ProposalStatusBadge';

interface ProposalInvestmentSectionProps {
  sectionNumber?: string;
  items?: ProposalItem[];
}

export const ProposalInvestmentSection: React.FC<ProposalInvestmentSectionProps> = ({
  sectionNumber = '04',
  items = [],
}) => {
  if (!items || items.length === 0) return null;

  const monthlyItems = items.filter((i) => i.billing_type === 'monthly');
  const oneTimeItems = items.filter((i) => i.billing_type === 'one_time');

  const monthlyTotal = monthlyItems.reduce(
    (sum, i) => sum + (i.quantity || 0) * (i.unit_price || 0),
    0
  );

  const oneTimeTotal = oneTimeItems.reduce(
    (sum, i) => sum + (i.quantity || 0) * (i.unit_price || 0),
    0
  );

  if (monthlyItems.length === 0 && oneTimeItems.length === 0) return null;

  return (
    <div className="space-y-8 pt-12 pb-10 border-b border-[#E8E9EA]">
      <div className="space-y-1">
        <span className="text-xs font-mono font-bold text-[#F15A3C] tracking-wider">
          {sectionNumber}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-[#1D1D1D] tracking-tight uppercase">
          Investimento
        </h2>
      </div>

      <div className="space-y-8">
        {/* Recurrent / Monthly Investment Table */}
        {monthlyItems.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-[#E8E9EA] pb-2">
              <h3 className="text-xs sm:text-sm font-bold text-[#1D1D1D] uppercase tracking-wider">
                Investimento Recorrente
              </h3>
              <span className="text-[11px] font-semibold text-[#F15A3C] bg-[#FDF1EE] border border-[#FBC3B8] px-2 py-0.5 rounded">
                Mensal
              </span>
            </div>

            <div className="divide-y divide-[#E8E9EA] bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl overflow-hidden">
              {monthlyItems.map((item) => {
                const subtotal = (item.quantity || 0) * (item.unit_price || 0);
                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-[#1D1D1D]">
                        {item.description}
                      </div>
                      <div className="text-xs text-[#666668]">
                        {item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'} × {formatCurrency(item.unit_price)}/mês
                      </div>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-[#1D1D1D] text-right sm:self-center">
                      {formatCurrency(subtotal)} <span className="text-xs text-[#666668] font-normal">/mês</span>
                    </div>
                  </div>
                );
              })}

              {/* Monthly Total Bar */}
              <div className="p-4 sm:p-5 bg-[#F7F7F8] border-t border-[#E8E9EA] flex items-center justify-between gap-4">
                <span className="text-xs sm:text-sm font-bold text-[#1D1D1D] uppercase tracking-wider">
                  Total Recorrente
                </span>
                <span className="text-base sm:text-lg font-extrabold text-[#1D1D1D]">
                  {formatCurrency(monthlyTotal)} <span className="text-xs font-normal text-[#666668]">/mês</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* One-Time Investment Table */}
        {oneTimeItems.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-[#E8E9EA] pb-2">
              <h3 className="text-xs sm:text-sm font-bold text-[#1D1D1D] uppercase tracking-wider">
                Investimento Pontual
              </h3>
              <span className="text-[11px] font-semibold text-[#1D4ED8] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded">
                Pontual / Setup
              </span>
            </div>

            <div className="divide-y divide-[#E8E9EA] bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl overflow-hidden">
              {oneTimeItems.map((item) => {
                const subtotal = (item.quantity || 0) * (item.unit_price || 0);
                return (
                  <div
                    key={item.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
                  >
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-[#1D1D1D]">
                        {item.description}
                      </div>
                      <div className="text-xs text-[#666668]">
                        {item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'} × {formatCurrency(item.unit_price)}
                      </div>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-[#1D1D1D] text-right sm:self-center">
                      {formatCurrency(subtotal)}
                    </div>
                  </div>
                );
              })}

              {/* One-Time Total Bar */}
              <div className="p-4 sm:p-5 bg-[#F7F7F8] border-t border-[#E8E9EA] flex items-center justify-between gap-4">
                <span className="text-xs sm:text-sm font-bold text-[#1D1D1D] uppercase tracking-wider">
                  Total Pontual
                </span>
                <span className="text-base sm:text-lg font-extrabold text-[#1D1D1D]">
                  {formatCurrency(oneTimeTotal)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
