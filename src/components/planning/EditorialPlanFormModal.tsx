import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Target,
  FileText,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { EditorialPlan, CreateEditorialPlanInput, UpdateEditorialPlanInput } from '../../types/planning';

interface EditorialPlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  planToEdit: EditorialPlan | null;
  onSave: (
    input: Omit<CreateEditorialPlanInput, 'client_id'> | UpdateEditorialPlanInput
  ) => Promise<EditorialPlan | null>;
  isSaving: boolean;
}

export const EditorialPlanFormModal: React.FC<EditorialPlanFormModalProps> = ({
  isOpen,
  onClose,
  planToEdit,
  onSave,
  isSaving,
}) => {
  const isEditing = Boolean(planToEdit);

  // Form states
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [secondaryGoals, setSecondaryGoals] = useState<string[]>([]);
  const [newGoalInput, setNewGoalInput] = useState('');
  const [coreMessage, setCoreMessage] = useState('');
  const [targetPostsCount, setTargetPostsCount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (planToEdit) {
        setTitle(planToEdit.title || '');
        setStartDate(planToEdit.start_date || '');
        setEndDate(planToEdit.end_date || '');
        setPrimaryGoal(planToEdit.primary_goal || '');
        setSecondaryGoals(Array.isArray(planToEdit.secondary_goals) ? [...planToEdit.secondary_goals] : []);
        setCoreMessage(planToEdit.core_message || '');
        setTargetPostsCount(planToEdit.target_posts_count ?? 0);
        setNotes(planToEdit.notes || '');
      } else {
        setTitle('');
        setStartDate('');
        setEndDate('');
        setPrimaryGoal('');
        setSecondaryGoals([]);
        setCoreMessage('');
        setTargetPostsCount(10);
        setNotes('');
      }
      setNewGoalInput('');
      setValidationError(null);
    }
  }, [isOpen, planToEdit]);

  if (!isOpen) return null;

  const handleAddSecondaryGoal = () => {
    const cleanGoal = newGoalInput.trim();
    if (!cleanGoal) return;
    if (secondaryGoals.includes(cleanGoal)) {
      setValidationError('Este objetivo secundário já foi adicionado.');
      return;
    }
    setSecondaryGoals((prev) => [...prev, cleanGoal]);
    setNewGoalInput('');
    setValidationError(null);
  };

  const handleRemoveSecondaryGoal = (indexToRemove: number) => {
    setSecondaryGoals((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleKeyDownNewGoal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSecondaryGoal();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setValidationError('O título do ciclo é obrigatório.');
      return;
    }

    if (!startDate) {
      setValidationError('A data inicial é obrigatória.');
      return;
    }

    if (!endDate) {
      setValidationError('A data final é obrigatória.');
      return;
    }

    if (endDate < startDate) {
      setValidationError('A data final deve ser igual ou posterior à data inicial.');
      return;
    }

    if (targetPostsCount < 0) {
      setValidationError('A meta total de conteúdos deve ser maior ou igual a zero.');
      return;
    }

    setValidationError(null);

    const payload: Omit<CreateEditorialPlanInput, 'client_id'> = {
      title: cleanTitle,
      start_date: startDate,
      end_date: endDate,
      primary_goal: primaryGoal.trim() || undefined,
      secondary_goals: secondaryGoals,
      core_message: coreMessage.trim() || undefined,
      target_posts_count: Number(targetPostsCount),
      notes: notes.trim() || undefined,
    };

    try {
      const result = await onSave(payload);
      if (result) {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar ciclo editorial.';
      setValidationError(msg);
    }
  };

  return (
    <div
      id="editorial-plan-form-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white border border-[#E8E9EA] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E8E9EA] bg-[#FDFDFE] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#F7F7F8] border border-[#E8E9EA]">
              <Calendar className="w-4 h-4 text-[#1D1D1D]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#1D1D1D]">
                {isEditing ? 'Editar Ciclo de Planejamento' : 'Novo Ciclo de Planejamento'}
              </h3>
              <p className="text-xs text-[#666668]">
                {isEditing
                  ? 'Atualize datas, objetivos e metas do ciclo editorial'
                  : 'Defina um período e objetivos para estruturar a produção de conteúdo'}
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

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Section 1: Identificação & Período */}
          <div className="space-y-3.5">
            <div>
              <label htmlFor="plan-title" className="block text-xs font-semibold text-[#1D1D1D] mb-1">
                Título do Ciclo <span className="text-red-500">*</span>
              </label>
              <input
                id="plan-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Ex: Planejamento Outubro 2026, Campanha de Lançamento..."
                disabled={isSaving}
                autoFocus
                className="w-full px-3.5 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label htmlFor="plan-start-date" className="block text-xs font-semibold text-[#1D1D1D] mb-1">
                  Data Inicial <span className="text-red-500">*</span>
                </label>
                <input
                  id="plan-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-xs font-normal text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] transition-all"
                />
              </div>

              <div>
                <label htmlFor="plan-end-date" className="block text-xs font-semibold text-[#1D1D1D] mb-1">
                  Data Final <span className="text-red-500">*</span>
                </label>
                <input
                  id="plan-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-xs font-normal text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] transition-all"
                />
              </div>

              <div>
                <label htmlFor="plan-target-posts" className="block text-xs font-semibold text-[#1D1D1D] mb-1">
                  Meta de Conteúdos
                </label>
                <input
                  id="plan-target-posts"
                  type="number"
                  min="0"
                  step="1"
                  value={targetPostsCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setTargetPostsCount(isNaN(val) ? 0 : Math.max(0, val));
                    if (validationError) setValidationError(null);
                  }}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] transition-all"
                />
                <span className="text-[10px] text-[#8C8D8F] block mt-0.5">
                  Total de posts planejados para o período
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Objetivos & Mensagem Central */}
          <div className="space-y-3.5 pt-2 border-t border-[#F2F3F3]">
            <div>
              <label htmlFor="plan-primary-goal" className="block text-xs font-semibold text-[#1D1D1D] mb-1">
                Objetivo Principal
              </label>
              <textarea
                id="plan-primary-goal"
                rows={2}
                value={primaryGoal}
                onChange={(e) => setPrimaryGoal(e.target.value)}
                placeholder="Qual o foco central ou meta estratégica principal deste ciclo..."
                disabled={isSaving}
                className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all resize-none"
              />
            </div>

            {/* Objetivos Secundários (UX Interativa com Tags) */}
            <div>
              <label className="block text-xs font-semibold text-[#1D1D1D] mb-1">
                Objetivos Secundários
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newGoalInput}
                  onChange={(e) => setNewGoalInput(e.target.value)}
                  onKeyDown={handleKeyDownNewGoal}
                  placeholder="Adicione uma meta secundária e pressione Enter..."
                  disabled={isSaving}
                  className="flex-1 px-3 py-1.5 text-xs text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddSecondaryGoal}
                  disabled={isSaving || !newGoalInput.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#E8E9EA] border border-[#E8E9EA] rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#F3705A]" />
                  <span>Adicionar</span>
                </button>
              </div>

              {secondaryGoals.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {secondaryGoals.map((goal, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 bg-[#FBFBFC] border border-[#E8E9EA] rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F3705A] shrink-0" />
                        <span className="text-[#1D1D1D] truncate">{goal}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSecondaryGoal(idx)}
                        disabled={isSaving}
                        className="p-1 text-[#8C8D8F] hover:text-red-600 rounded transition-colors"
                        title="Remover meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="plan-core-message" className="block text-xs font-semibold text-[#1D1D1D] mb-1">
                Mensagem Central (Key Message)
              </label>
              <textarea
                id="plan-core-message"
                rows={2}
                value={coreMessage}
                onChange={(e) => setCoreMessage(e.target.value)}
                placeholder="Ex: Reforçar posicionamento de autoridade técnica e segurança de dados..."
                disabled={isSaving}
                className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all resize-none"
              />
            </div>
          </div>

          {/* Section 3: Observações */}
          <div className="pt-2 border-t border-[#F2F3F3]">
            <label htmlFor="plan-notes" className="block text-xs font-semibold text-[#1D1D1D] mb-1">
              Observações & Contexto Operacional
            </label>
            <textarea
              id="plan-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruções para o time, dependências, datas-chave ou detalhes de alinhamento..."
              disabled={isSaving}
              className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#F2F3F3]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !startDate || !endDate}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isEditing ? 'Atualizar Ciclo' : 'Criar Ciclo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
