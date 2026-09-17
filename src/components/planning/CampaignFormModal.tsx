import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Calendar, Target, FileText } from 'lucide-react';
import {
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
} from '../../types/planning';

interface CampaignFormModalProps {
  isOpen: boolean;
  campaignToEdit?: Campaign | null;
  onClose: () => void;
  onSave: (
    input: Omit<CreateCampaignInput, 'client_id'> | UpdateCampaignInput
  ) => Promise<Campaign | null>;
}

export const CampaignFormModal: React.FC<CampaignFormModalProps> = ({
  isOpen,
  campaignToEdit,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(campaignToEdit);

  // Form states
  const [name, setName] = useState<string>('');
  const [objective, setObjective] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // UI / Error states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Sync form on open or when campaignToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (campaignToEdit) {
        setName(campaignToEdit.name || '');
        setObjective(campaignToEdit.objective || '');
        setStartDate(campaignToEdit.start_date || '');
        setEndDate(campaignToEdit.end_date || '');
        setNotes(campaignToEdit.notes || '');
      } else {
        setName('');
        setObjective('');
        setStartDate('');
        setEndDate('');
        setNotes('');
      }
      setDateError(null);
      setNameError(null);
      setGeneralError(null);
      setSubmitting(false);
    }
  }, [isOpen, campaignToEdit]);

  // Date validation in real time
  const validateDates = (startVal: string, endVal: string): boolean => {
    const start = startVal ? startVal.trim() : '';
    const end = endVal ? endVal.trim() : '';

    if (end && !start) {
      setDateError('A data inicial é obrigatória se a data final for informada.');
      return false;
    }

    if (start && end && end < start) {
      setDateError('A data final deve ser igual ou posterior à data inicial.');
      return false;
    }

    setDateError(null);
    return true;
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    validateDates(val, endDate);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    validateDates(startDate, val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Name
    const cleanName = name.trim();
    if (!cleanName) {
      setNameError('O nome da campanha é obrigatório.');
      return;
    }
    setNameError(null);

    // 2. Validate Dates
    const datesValid = validateDates(startDate, endDate);
    if (!datesValid) {
      return;
    }

    setSubmitting(true);
    setGeneralError(null);

    try {
      const payload = {
        name: cleanName,
        objective: objective.trim() || undefined,
        start_date: startDate ? startDate.trim() : null,
        end_date: endDate ? endDate.trim() : null,
        notes: notes.trim() || undefined,
      };

      const result = await onSave(payload);
      if (result) {
        onClose();
      }
    } catch (err: any) {
      console.error('Erro ao salvar formulário de campanha:', err);
      setGeneralError(err.message || 'Falha ao salvar campanha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="campaign-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-form-modal-title"
    >
      <div
        className="bg-white border border-[#E8E9EA] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E9EA]">
          <div className="space-y-0.5">
            <h3 id="campaign-form-modal-title" className="text-base font-semibold text-[#1D1D1D]">
              {isEditing ? 'Editar Campanha' : 'Nova Campanha'}
            </h3>
            <p className="text-xs text-[#666668]">
              {isEditing
                ? 'Atualize as informações da iniciativa selecionada.'
                : 'Defina uma iniciativa específica para o cliente (inicia como Rascunho).'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-[#8C8D8F] hover:text-[#1D1D1D] rounded-lg hover:bg-[#F2F3F3] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* General error alert */}
          {generalError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {/* 1. Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="campaign-name-input"
              className="block text-xs font-semibold text-[#1D1D1D]"
            >
              Nome da campanha <span className="text-[#F3705A]">*</span>
            </label>
            <input
              id="campaign-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError && e.target.value.trim()) setNameError(null);
              }}
              placeholder="Ex: Dia dos Namorados, Lançamento de Cardápio, Black Friday"
              className={`w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border rounded-lg focus:outline-none focus:ring-1 transition-colors ${
                nameError
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                  : 'border-[#E8E9EA] focus:border-[#1D1D1D] focus:ring-[#1D1D1D]'
              }`}
            />
            {nameError && <p className="text-[11px] text-red-600">{nameError}</p>}
          </div>

          {/* 2. Dates (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#1D1D1D]">
                Período da campanha <span className="text-[#8C8D8F] font-normal">(Opcional)</span>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[11px] text-[#666668]">Data inicial</span>
                <div className="relative">
                  <input
                    id="campaign-start-date-input"
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] focus:ring-1 focus:ring-[#1D1D1D] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-[#666668]">Data final</span>
                <div className="relative">
                  <input
                    id="campaign-end-date-input"
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] focus:ring-1 focus:ring-[#1D1D1D] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Date Validation Alert */}
            {dateError && (
              <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{dateError}</span>
              </p>
            )}
            <p className="text-[11px] text-[#8C8D8F]">
              Datas são opcionais. Você pode criar campanhas sem período fixo ou apenas com data inicial.
            </p>
          </div>

          {/* 3. Objective */}
          <div className="space-y-1.5">
            <label
              htmlFor="campaign-objective-input"
              className="block text-xs font-semibold text-[#1D1D1D]"
            >
              Objetivo da campanha <span className="text-[#8C8D8F] font-normal">(Opcional)</span>
            </label>
            <textarea
              id="campaign-objective-input"
              rows={3}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ex: Alavancar reservas de mesas e posicionar o menu especial de inverno..."
              className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] focus:ring-1 focus:ring-[#1D1D1D] transition-colors resize-none"
            />
          </div>

          {/* 4. Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="campaign-notes-input"
              className="block text-xs font-semibold text-[#1D1D1D]"
            >
              Observações e alinhamentos <span className="text-[#8C8D8F] font-normal">(Opcional)</span>
            </label>
            <textarea
              id="campaign-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Campanha alinhada com o time de salão; fotos já produzidas..."
              className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] focus:ring-1 focus:ring-[#1D1D1D] transition-colors resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#E8E9EA] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-[#666668] hover:text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#E8E9EA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || Boolean(dateError)}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Salvar alterações' : 'Criar campanha'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
