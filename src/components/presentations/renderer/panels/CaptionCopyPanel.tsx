import React, { useState } from 'react';
import { Copy, Check, AlignLeft } from 'lucide-react';
import { Content } from '../../../../types/contents';

interface CaptionCopyPanelProps {
  content?: Content | null;
}

export const CaptionCopyPanel: React.FC<CaptionCopyPanelProps> = ({ content }) => {
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  const captionText = content.caption?.trim() || '';

  const handleCopy = async () => {
    if (!captionText) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(captionText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = captionText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy text:', err);
    }
  };

  return (
    <div className="bg-white border border-[#E8E9EA] rounded-2xl p-4 space-y-3 shadow-xs">
      {/* Header with Title and Copy Button */}
      <div className="flex items-center justify-between border-b border-[#F2F3F3] pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1D1D1D]">
          <AlignLeft className="w-3.5 h-3.5 text-[#F15A3C]" />
          <span>Legenda / Copy da Publicação</span>
        </div>

        {captionText && (
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
              copied
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-[#F7F7F8] hover:bg-[#EDEEEE] text-[#1D1D1D] border border-[#E8E9EA]'
            }`}
            title="Copiar legenda"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[#666668]" />
                <span>Copiar</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Text Body */}
      <div className="max-h-[300px] overflow-y-auto pr-1">
        {captionText ? (
          <p className="text-xs text-[#1D1D1D] leading-relaxed whitespace-pre-wrap font-body selection:bg-[#FDF1EE]">
            {captionText}
          </p>
        ) : (
          <p className="text-xs text-[#9E9EA0] italic py-2">
            Nenhuma legenda cadastrada para esta publicação.
          </p>
        )}
      </div>
    </div>
  );
};
