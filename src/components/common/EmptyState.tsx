import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  variant?: 'light' | 'dark';
  className?: string;
  showIcon?: boolean;
}

export function EmptyState({
  message,
  variant = 'light',
  className = '',
  showIcon = false,
}: EmptyStateProps) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`flex flex-col items-start justify-center rounded-[8px] p-4 transition-colors ${
        isDark
          ? 'bg-[#242424]/60 border border-[#333333]/80 text-[#9E9EA0]'
          : 'bg-[#F9F9FA] border border-[#E8E9EA]/80 text-[#666668]'
      } ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {showIcon ? (
          <Inbox className={`h-4 w-4 shrink-0 ${isDark ? 'text-[#666668]' : 'text-[#9E9EA0]'}`} />
        ) : (
          <span
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
              isDark ? 'bg-[#444444]' : 'bg-[#DCDDDE]'
            }`}
          />
        )}
        <p className="text-xs font-normal leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
