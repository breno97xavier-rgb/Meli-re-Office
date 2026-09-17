import React, { useState, useEffect } from 'react';
import { X, Layers, Loader2, AlertCircle } from 'lucide-react';
import { ClientPillar } from '../../types/planning';

interface PillarFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  pillarToEdit: ClientPillar | null;
  onSave: (data: { name: string; description?: string }) => Promise<unknown>;
  isSaving: boolean;
}

export const PillarFormModal: React.FC<PillarFormModalProps> = ({
  isOpen,
  onClose,
  pillarToEdit,
  onSave,
  isSaving,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (pillarToEdit) {
        setName(pillarToEdit.name);
        setDescription(pillarToEdit.description || '');
      } else {
        setName('');
        setDescription('');
      }
      setValidationError(null);
    }
  }, [isOpen, pillarToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setValidationError('O nome do pilar é obrigatório.');
      return;
    }

    setValidationError(null);
    try {
      await onSave({
        name: cleanName,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar pilar.';
      setValidationError(msg);
    }
  };

  return (
    <div
      id="pillar-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white border border-[#E8E9EA] rounded-2xl shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E8E9EA] bg-[#FDFDFE]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#F7F7F8] border border-[#E8E9EA]">
              <Layers className="w-4 h-4 text-[#1D1D1D]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1D1D1D]">
                {pillarToEdit ? 'Editar Pilar Editorial' : 'Novo Pilar Editorial'}
              </h3>
              <p className="text-xs text-[#666668]">
                {pillarToEdit
                  ? 'Atualize o nome e diretrizes do pilar'
                  : 'Defina uma linha temática para a produção de conteúdo'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 text-[#8C8D8F] hover:text-[#1D1D1D] rounded-lg hover:bg-[#F2F3F3] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{validationError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="pillar-name"
              className="block text-xs font-semibold text-[#1D1D1D] mb-1.5"
            >
              Nome do Pilar <span className="text-red-500">*</span>
            </label>
            <input
              id="pillar-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Ex: Autoridade & Cases, Educativo, Bastidores..."
              disabled={isSaving}
              autoFocus
              className="w-full px-3.5 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="pillar-description"
              className="block text-xs font-semibold text-[#1D1D1D] mb-1.5"
            >
              Descrição & Diretrizes (Opcional)
            </label>
            <textarea
              id="pillar-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste pilar, formato recomendado e tom desejado..."
              disabled={isSaving}
              className="w-full px-3.5 py-2 text-xs font-normal text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F2F3F3]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 text-xs font-medium text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{pillarToEdit ? 'Atualizar Pilar' : 'Criar Pilar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
