import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Loader2,
  AlertCircle,
  Building2,
  Sparkles,
  Layers,
  FileText,
  Film,
  Image,
  Calendar,
  User,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  ContentFormat,
  EditorialStatus,
  CreateContentInput,
  ContentProfileRelation,
  PRIMARY_CHANNELS,
  FUNNEL_STAGES,
} from '../../types/contents';
import { Client } from '../../types/clients';
import { FORMAT_LABELS, EDITORIAL_STATUS_CONFIG } from './ContentStatusBadge';

interface CreateContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateContentInput) => Promise<unknown>;
  clients: Client[];
  teamProfiles: ContentProfileRelation[];
  initialClientId?: string;
  isSaving: boolean;
  error?: string | null;
}

export const CreateContentModal: React.FC<CreateContentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  clients,
  teamProfiles,
  initialClientId,
  isSaving,
  error,
}) => {
  const [clientId, setClientId] = useState(initialClientId || '');
  const [internalTitle, setInternalTitle] = useState('');
  const [format, setFormat] = useState<ContentFormat>('feed_single');
  const [primaryChannel, setPrimaryChannel] = useState('instagram');
  const [editorialStatus, setEditorialStatus] = useState<EditorialStatus>('draft');
  const [goal, setGoal] = useState('');
  const [pillar, setPillar] = useState('');
  const [funnelStage, setFunnelStage] = useState('');
  const [copy, setCopy] = useState('');
  const [caption, setCaption] = useState('');
  const [script, setScript] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setClientId(initialClientId || (clients.length === 1 ? clients[0].id : ''));
      setInternalTitle('');
      setFormat('feed_single');
      setPrimaryChannel('instagram');
      setEditorialStatus('draft');
      setGoal('');
      setPillar('');
      setFunnelStage('');
      setCopy('');
      setCaption('');
      setScript('');
      setPlannedDate('');
      setAssignedTo('');
      setNotes('');
      setValidationError(null);
    }
  }, [isOpen, initialClientId, clients]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!clientId) {
      setValidationError('Selecione o cliente para associar o conteúdo.');
      return;
    }
    if (!internalTitle.trim()) {
      setValidationError('Informe o título interno do conteúdo.');
      return;
    }

    try {
      await onSave({
        client_id: clientId,
        internal_title: internalTitle.trim(),
        format,
        primary_channel: primaryChannel ? primaryChannel.trim().toLowerCase() : 'instagram',
        editorial_status: editorialStatus,
        goal: goal.trim() || null,
        pillar: pillar.trim() || null,
        funnel_stage: funnelStage ? funnelStage.trim().toLowerCase() : null,
        copy: copy.trim() || null,
        caption: caption.trim() || null,
        script: script.trim() || null,
        planned_date: plannedDate || null,
        assigned_to: assignedTo || null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch {
      // Error handled by parent hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#E8E9EA] overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E9EA] bg-[#FAFAFA] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F15A3C] flex items-center justify-center border border-orange-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1D1D1D]">
                Novo Conteúdo Editorial
              </h2>
              <p className="text-xs text-[#666668]">
                Cadastre um novo item de pauta, definindo formato, estratégia e redação.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8C8D8F] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error alerts */}
          {(validationError || error) && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{validationError || error}</span>
            </div>
          )}

          {/* Section 1: Identificação & Formato (Obrigatórios) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#F2F3F3]">
              <FileText className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span>Identificação & Formato</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cliente */}
              <div>
                <label className="block text-xs font-bold text-[#1D1D1D] mb-1.5">
                  Cliente <span className="text-[#F15A3C]">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8D8F] pointer-events-none" />
                  <select
                    id="content-client-select"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    disabled={Boolean(initialClientId)}
                    required
                    className="w-full pl-9 pr-8 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] disabled:opacity-75 disabled:bg-[#EDEEEE] cursor-pointer"
                  >
                    <option value="">Selecione o cliente...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.commercial_name || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Formato */}
              <div>
                <label className="block text-xs font-bold text-[#1D1D1D] mb-1.5">
                  Formato <span className="text-[#F15A3C]">*</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#F2F3F3] rounded-lg border border-[#E8E9EA]">
                  {(['feed_single', 'carousel', 'reels', 'story'] as ContentFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`py-1.5 text-center text-[11px] font-semibold rounded-md transition-all cursor-pointer truncate px-1 ${
                        format === fmt
                          ? 'bg-white text-[#1D1D1D] shadow-2xs'
                          : 'text-[#666668] hover:text-[#1D1D1D]'
                      }`}
                    >
                      {FORMAT_LABELS[fmt]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Título Interno */}
            <div>
              <label className="block text-xs font-bold text-[#1D1D1D] mb-1.5">
                Título Interno / Tema da Peça <span className="text-[#F15A3C]">*</span>
              </label>
              <input
                type="text"
                value={internalTitle}
                onChange={(e) => setInternalTitle(e.target.value)}
                placeholder="Ex: 5 erros comuns no tráfego pago para e-commerce"
                required
                className="w-full px-3.5 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
              />
            </div>
          </div>

          {/* Section 2: Estratégia Editorial */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#F2F3F3]">
              <Sparkles className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span>Estratégia & Objetivo</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Pilar Editorial */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Pilar Editorial
                </label>
                <input
                  type="text"
                  value={pillar}
                  onChange={(e) => setPillar(e.target.value)}
                  placeholder="Ex: Autoridade, Educacional, Vendas"
                  className="w-full px-3.5 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
                />
              </div>

              {/* Etapa do Funil */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Etapa do Funil
                </label>
                <select
                  value={funnelStage}
                  onChange={(e) => setFunnelStage(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer"
                >
                  <option value="">Selecione a etapa...</option>
                  {FUNNEL_STAGES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Canal Principal */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Canal Principal
                </label>
                <select
                  value={primaryChannel}
                  onChange={(e) => setPrimaryChannel(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer"
                >
                  {PRIMARY_CHANNELS.map((ch) => (
                    <option key={ch.value} value={ch.value}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Objetivo da Peça */}
            <div>
              <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                Objetivo Estratégico da Peça
              </label>
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Ex: Gerar salvamentos e atrair novos seguidores qualificados no segmento B2B"
                className="w-full px-3.5 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
              />
            </div>
          </div>

          {/* Section 3: Redação & Criação (Contextual ao Formato) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#F2F3F3]">
              <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#F15A3C]" />
                <span>Conteúdo & Redação ({FORMAT_LABELS[format]})</span>
              </h3>
              <span className="text-[11px] text-[#8C8D8F]">
                Campos adaptados ao formato {FORMAT_LABELS[format]}
              </span>
            </div>

            {/* Se Reels: Destaque para Roteiro */}
            {format === 'reels' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1D1D1D] mb-1 flex items-center justify-between">
                    <span>Roteiro / Script (Cenas, Falas & Instruções)</span>
                    <span className="text-[10px] text-rose-600 font-semibold uppercase">
                      Destaque para Reels
                    </span>
                  </label>
                  <textarea
                    rows={5}
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="[CENA 1 - GANCHO 0-3s]: Olhe para a câmera e diga: 'Você ainda comete esse erro?'&#10;[CENA 2 - DESENVOLVIMENTO]: Mostre a tela do gerenciador...&#10;[CENA 3 - CTA]: Comente X para receber o template."
                    className="w-full p-3 text-xs font-mono text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] leading-relaxed placeholder:text-[#8C8D8F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#666668] mb-1">
                    Legenda Final (Caption)
                  </label>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Texto final para publicação com hashtags e chamada para ação..."
                    className="w-full p-3 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
                  />
                </div>
              </div>
            )}

            {/* Se Post Estático ou Carrossel: Destaque para Legenda */}
            {(format === 'feed_single' || format === 'carousel') && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1D1D1D] mb-1 flex items-center justify-between">
                    <span>Legenda da Publicação (Caption)</span>
                    <span className="text-[10px] text-blue-600 font-semibold uppercase">
                      Feed
                    </span>
                  </label>
                  <textarea
                    rows={5}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Texto completo da legenda do post, estruturado com espaçamentos, copy persuasiva e CTA..."
                    className="w-full p-3 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Se Story: Roteiro / Ideia dos Stories */}
            {format === 'story' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1D1D1D] mb-1 flex items-center justify-between">
                    <span>Roteiro / Sequência de Stories (Script)</span>
                    <span className="text-[10px] text-purple-600 font-semibold uppercase">
                      Destaque para Stories
                    </span>
                  </label>
                  <textarea
                    rows={5}
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="[STORY 1]: Enquete: 'Você prefere tráfego pago ou orgânico?'&#10;[STORY 2]: Vídeo de bastidores comentando o resultado...&#10;[STORY 3]: Link direto com sticker para a oferta."
                    className="w-full p-3 text-xs font-mono text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] leading-relaxed placeholder:text-[#8C8D8F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#666668] mb-1">
                    Legenda / Texto Complementar
                  </label>
                  <textarea
                    rows={2}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Texto de apoio para os stories ou links..."
                    className="w-full p-3 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
                  />
                </div>
              </div>
            )}

            {/* Copy Geral / Conceito (Opcional para todos) */}
            <div>
              <label className="block text-xs font-semibold text-[#666668] mb-1">
                Conceito Geral / Copy de Apoio
              </label>
              <textarea
                rows={2}
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                placeholder="Rascunho de ideias conceituais, referências e orientações de redação..."
                className="w-full p-2.5 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
              />
            </div>
          </div>

          {/* Section 4: Operação & Planejamento */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#1D1D1D] uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#F2F3F3]">
              <Calendar className="w-3.5 h-3.5 text-[#F15A3C]" />
              <span>Planejamento & Operação</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status Editorial Inicial */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Status Editorial
                </label>
                <select
                  value={editorialStatus}
                  onChange={(e) => setEditorialStatus(e.target.value as EditorialStatus)}
                  className="w-full px-3 py-2 text-xs font-semibold text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer"
                >
                  <option value="draft">Rascunho</option>
                  <option value="in_production">Em Produção</option>
                  <option value="review">Revisão Interna</option>
                  <option value="client_review">Revisão do Cliente</option>
                  <option value="approved">Aprovado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              {/* Data Planejada */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Data Planejada
                </label>
                <input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D]"
                />
              </div>

              {/* Responsável */}
              <div>
                <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                  Responsável
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8D8F] pointer-events-none" />
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full pl-8.5 pr-8 py-2 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] cursor-pointer"
                  >
                    <option value="">Não atribuído</option>
                    {teamProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name || p.full_name} ({p.role || 'Equipe'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Observações Internas */}
            <div>
              <label className="block text-xs font-semibold text-[#666668] mb-1.5">
                Notas & Observações Internas
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Diretrizes da equipe, prazos internos, links de referência..."
                className="w-full p-2.5 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] border border-[#E8E9EA] rounded-lg focus:outline-none focus:bg-white focus:border-[#1D1D1D] placeholder:text-[#8C8D8F]"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E8E9EA] bg-[#FAFAFA] shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-[#666668] hover:text-[#1D1D1D] bg-[#F2F3F3] hover:bg-[#EDEEEE] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#F15A3C] hover:bg-[#d94a2e] rounded-lg transition-all cursor-pointer shadow-2xs active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Cadastrar Conteúdo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
