import React, { useState } from 'react';
import {
  X,
  Building2,
  Presentation,
  FileText,
  Layers,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Client } from '../../types/clients';
import { CreatePresentationInput } from '../../types/presentations';

interface CreatePresentationModalProps {
  isOpen: boolean;
  clients: Client[];
  initialClientId?: string;
  onClose: () => void;
  onSubmit: (input: CreatePresentationInput) => Promise<{ id: string }>;
  isSubmitting: boolean;
  error?: string | null;
}

export const CreatePresentationModal: React.FC<CreatePresentationModalProps> = ({
  isOpen,
  clients,
  initialClientId,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}) => {
  const [clientId, setClientId] = useState<string>(initialClientId || '');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clientId) {
      setFormError('Por favor, selecione o cliente.');
      return;
    }

    if (!title.trim()) {
      setFormError('Por favor, informe o título da apresentação.');
      return;
    }

    try {
      await onSubmit({
        client_id: clientId,
        title: title.trim(),
        description: description.trim() || null,
        round_number: roundNumber > 0 ? roundNumber : 1,
        status: 'draft',
      });
    } catch {
      // Handled by parent error prop
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
                Nova Apresentação
              </h2>
              <p className="text-[11px] text-[#666668]">
                Crie uma rodada para organizar e aprovar conteúdos com o cliente.
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

          {/* Client Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1D1D1D] flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>Cliente *</span>
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={isSubmitting || Boolean(initialClientId)}
              className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] focus:outline-hidden focus:border-[#F15A3C] focus:bg-white cursor-pointer"
            >
              <option value="">Selecione o cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.commercial_name ? `(${c.commercial_name})` : ''}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="Ex: Planejamento Semanal — Semana 10 / Março"
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] placeholder-[#9E9EA0] focus:outline-hidden focus:border-[#F15A3C] focus:bg-white transition-all"
            />
          </div>

          {/* Round Number */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1D1D1D] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#9E9EA0]" />
              <span>Número da Rodada</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={99}
                value={roundNumber}
                onChange={(e) => setRoundNumber(parseInt(e.target.value, 10) || 1)}
                disabled={isSubmitting}
                className="w-24 px-3 py-2 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] focus:outline-hidden focus:border-[#F15A3C] focus:bg-white transition-all"
              />
              <span className="text-[11px] text-[#666668]">
                Identifica a versão ou ciclo de aprovação desta rodada.
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="font-bold text-[#1D1D1D]">
              Descrição / Orientações Gerais (Opcional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione um contexto geral para a rodada de apresentação..."
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-[#E8E9EA] rounded-xl text-[#1D1D1D] placeholder-[#9E9EA0] focus:outline-hidden focus:border-[#F15A3C] focus:bg-white transition-all resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#E8E9EA]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#EDEEEE] rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !clientId}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d9482b] rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Criar e Abrir Editor</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
