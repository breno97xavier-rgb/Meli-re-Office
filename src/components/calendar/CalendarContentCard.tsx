import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Content } from '../../types/contents';
import { CalendarContentCardVisual } from './CalendarContentCardVisual';

interface CalendarContentCardProps {
  content: Content;
  onClick: (content: Content) => void;
  showClientName?: boolean;
  isDraggable?: boolean;
  isMoving?: boolean;
  compact?: boolean;
}

export const CalendarContentCard: React.FC<CalendarContentCardProps> = ({
  content,
  onClick,
  showClientName = true,
  isDraggable = true,
  isMoving = false,
  compact = false,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: content.id,
    data: { content },
    disabled: !isDraggable || isMoving,
  });

  return (
    <div
      ref={setNodeRef}
      {...(isDraggable && !isMoving ? { ...listeners, ...attributes } : {})}
      className="w-full"
    >
      {compact ? <button type="button" disabled={isMoving} onClick={() => { if (!isDragging) onClick(content); }} title={content.internal_title} className="block w-full truncate rounded border border-zinc-200 bg-white px-2 py-1.5 text-left text-xs text-zinc-800 disabled:opacity-50">Conteúdo · {content.internal_title || 'Sem título'}</button> : <CalendarContentCardVisual
        content={content}
        onClick={() => onClick(content)}
        showClientName={showClientName}
        isDragging={isDragging}
        isMoving={isMoving}
        isOverlay={false}
      />}
    </div>
  );
};
