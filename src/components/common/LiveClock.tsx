import { useEffect, useState } from 'react';

interface LiveClockProps {
  timeZone?: string;
  showSeconds?: boolean;
  showTimeZone?: boolean;
  className?: string;
}

export function LiveClock({
  timeZone = 'America/Sao_Paulo',
  showSeconds = true,
  showTimeZone = true,
  className = '',
}: LiveClockProps) {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('pt-BR', {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          second: showSeconds ? '2-digit' : undefined,
          hour12: false,
        });
        setTimeString(formatter.format(now));
      } catch {
        // Fallback in case of invalid timezone
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        setTimeString(showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`);
      }
    };

    updateClock();
    const timerId = window.setInterval(updateClock, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [timeZone, showSeconds]);

  return (
    <div className={`flex flex-col items-end text-right ${className}`}>
      <div 
        className="font-mono text-2xl lg:text-3xl font-medium tracking-tight text-[#1D1D1D] tabular-nums"
        aria-label={`Horário atual: ${timeString}`}
      >
        {timeString || '--:--:--'}
      </div>
      {showTimeZone && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[#9E9EA0] mt-0.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F15A3C] animate-pulse" />
          <span>{timeZone}</span>
        </div>
      )}
    </div>
  );
}
