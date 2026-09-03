import { useMemo } from 'react';
import { LiveClock } from './LiveClock';

interface DashboardHeaderProps {
  userName?: string;
  timeZone?: string;
}

export function DashboardHeader({
  userName,
  timeZone = 'America/Sao_Paulo',
}: DashboardHeaderProps) {
  // Compute greeting dynamically based on current time in specified timezone
  const greeting = useMemo(() => {
    try {
      const now = new Date();
      const hourStr = new Intl.DateTimeFormat('pt-BR', {
        timeZone: timeZone || 'America/Sao_Paulo',
        hour: 'numeric',
        hour12: false,
      }).format(now);
      const hour = parseInt(hourStr, 10);
      if (hour >= 5 && hour < 12) return 'Bom dia';
      if (hour >= 12 && hour < 18) return 'Boa tarde';
      return 'Boa noite';
    } catch {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'Bom dia';
      if (hour >= 12 && hour < 18) return 'Boa tarde';
      return 'Boa noite';
    }
  }, [timeZone]);

  // Compute full date in pt-BR
  const formattedDate = useMemo(() => {
    try {
      const activeZone = timeZone || 'America/Sao_Paulo';
      const now = new Date();
      const weekday = new Intl.DateTimeFormat('pt-BR', {
        timeZone: activeZone,
        weekday: 'long',
      }).format(now);
      const day = new Intl.DateTimeFormat('pt-BR', {
        timeZone: activeZone,
        day: 'numeric',
      }).format(now);
      const month = new Intl.DateTimeFormat('pt-BR', {
        timeZone: activeZone,
        month: 'long',
      }).format(now);
      const year = new Intl.DateTimeFormat('pt-BR', {
        timeZone: activeZone,
        year: 'numeric',
      }).format(now);

      return `${weekday}, ${day} de ${month} de ${year}`.toUpperCase();
    } catch {
      return new Date().toLocaleDateString('pt-BR').toUpperCase();
    }
  }, [timeZone]);

  return (
    <header className="relative w-full border-b border-[#E8E9EA] bg-white px-6 py-7 md:px-10 md:py-8">
      {/* Decorative top accent line in Coral */}
      <div className="absolute top-0 left-0 h-[3px] w-28 bg-[#F15A3C]" />

      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        {/* Left Column: Date & Greeting */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9E9EA0]">
              {formattedDate}
            </span>
          </div>

          <div className="flex flex-col">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#1D1D1D]">
              {greeting}
              {userName ? (
                <>
                  , <span className="text-[#1D1D1D] font-normal">{userName}.</span>
                </>
              ) : (
                '.'
              )}
            </h1>
            <p className="mt-1 text-sm font-normal text-[#666668]">
              Central executiva de operações e inteligência Melière.
            </p>
          </div>
        </div>

        {/* Right Column: Live Clock & System Status */}
        <div className="flex flex-row items-center justify-between md:flex-col md:items-end gap-3 pt-2 md:pt-0 border-t border-[#F2F3F3] md:border-t-0">
          <div className="flex items-center gap-2 md:hidden">
            <span className="h-2 w-2 rounded-full bg-[#F15A3C]" />
            <span className="text-xs font-medium text-[#666668]">Melière Office</span>
          </div>
          <LiveClock timeZone={timeZone || 'America/Sao_Paulo'} />
        </div>
      </div>
    </header>
  );
}
