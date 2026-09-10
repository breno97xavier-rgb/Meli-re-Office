import React, { useState, useEffect } from 'react';
import {
  X,
  Presentation,
  FileText,
  Layers,
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Presentation as PresentationType, UpdatePresentationInput } from '../../types/presentations';
import { PRESENTATION_STATUS_LABELS } from './PresentationStatusBadge';

interface EditPresentationModalProps {
  isOpen: boolean;
  presentation: PresentationType;
  onClose: () => void;
  onSave: (input: UpdatePresentationInput) => Promise<unknown>;
  isSaving: boolean;
  error?: string | null;
}

export const EditPresentationModal: React.FC<EditPresentationModalProps> = ({
  isOpen,
  presentation,
  onClose,
  onSave,
  isSaving,
  error,
}) => {
  const [title, setTitle] = useState(presentation.title);
  const [description, setDescription] = useState(presentation.description || '');
  const [roundNumber, setRoundNumber] = useState(presentation.round_number || 1);
  const [status, setStatus] = useState(presentation.status || 'draft');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && presentation) {
      setTitle(presentation.title);
      setDescription(presentation.description || '');
      setRoundNumber(presentation.round_number || 1);
      setStatus(presentation.status || 'draft');
      setFormError(null);
    }
  }, [isOpen, presentation]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError('O título da apresentação é obrigatório.');
      return;
    }

    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || null,
        round_number: roundNumber > 0 ? roundNumber : 1,
        status,
      });
      onClose();
    } catch {
      // Handled by parent error
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-[#E8E9EA] rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E9EA] bg-[#FAFAFA]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FDF1EE] text-[#F15A3C] flex items-center justify-center font-bold">
              <Presentation className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#1D1D1D] font-display">
                Editar Dados da Apresentação
              </h2>
              <p className="text-[11px] text-[#666668]">
                Altere título, rodada, status ou descrição desta apresentação.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9E9EA0] hover:text-[#1D1D1D] p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {(error || formError) && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <p className="flex-1">{formError || error}</p>
            </div>
          )}

          {/* Presentation Title */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1D1D1D] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>Título da Apresentação *</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] focus:outline-hidden focus:border-[#F15A3C] focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Round Number */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#1D1D1D] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#9E9EA0]" />
                <span>Rodada</span>
              </label>
              <input
                type="number"
                min={1}
                max={99}
                value={roundNumber}
                onChange={(e) => setRoundNumber(parseInt(e.target.value, 10) || 1)}
                disabled={isSaving}
                className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] focus:outline-hidden focus:border-[#F15A3C] focus:bg-white transition-all"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="font-bold text-[#1D1D1D] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#9E9EA0]" />
                <span>Status</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] focus:outline-hidden focus:border-[#F15A3C] focus:bg-white cursor-pointer"
              >
                {Object.entries(PRESENTATION_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1D1D1D]">
              Descrição / Orientações Gerais
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione um contexto ou observações gerais para esta rodada..."
              disabled={isSaving}
              className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] placeholder-[#9E9EA0] focus:outline-hidden focus:border-[#F15A3C] focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8E9EA]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#1D1D1D] hover:bg-black rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
