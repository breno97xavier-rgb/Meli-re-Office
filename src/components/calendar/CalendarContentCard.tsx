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
}

export const CalendarContentCard: React.FC<CalendarContentCardProps> = ({
  content,
  onClick,
  showClientName = true,
  isDraggable = true,
  isMoving = false,
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
      <CalendarContentCardVisual
        content={content}
        onClick={() => onClick(content)}
        showClientName={showClientName}
        isDragging={isDragging}
        isMoving={isMoving}
        isOverlay={false}
      />
    </div>
  );
};
