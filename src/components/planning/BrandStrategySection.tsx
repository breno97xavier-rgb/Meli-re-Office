import React, { useState, useEffect } from 'react';
import {
  Compass,
  Edit3,
  Check,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Target,
  MessageSquare,
  Share2,
  Sparkles,
} from 'lucide-react';
import { ClientStrategy, UpdateClientStrategyInput } from '../../types/planning';
import { PrimaryChannel } from '../../types/contents';

interface BrandStrategySectionProps {
  strategy: ClientStrategy | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  saveError: string | null;
  onSave: (input: UpdateClientStrategyInput) => Promise<ClientStrategy | null>;
  onRefresh: () => Promise<void>;
}

interface ChannelOption {
  id: PrimaryChannel;
  label: string;
}

const AVAILABLE_CHANNELS: ChannelOption[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'blog', label: 'Blog' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'other', label: 'Outro' },
];

export const BrandStrategySection: React.FC<BrandStrategySectionProps> = ({
  strategy,
  loading,
  error,
  saving,
  saveError,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [positioning, setPositioning] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [brandVoiceTone, setBrandVoiceTone] = useState('');
  const [communicationGuidelines, setCommunicationGuidelines] = useState('');
  const [doDonts, setDoDonts] = useState('');
  const [businessGoals, setBusinessGoals] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  // Sync form with strategy when entering edit mode or when strategy changes
  const populateForm = () => {
    setPositioning(strategy?.positioning || '');
    setValueProposition(strategy?.value_proposition || '');
    setTargetAudience(strategy?.target_audience || '');
    setBrandVoiceTone(strategy?.brand_voice_tone || '');
    setCommunicationGuidelines(strategy?.communication_guidelines || '');
    setDoDonts(strategy?.do_donts || '');
    setBusinessGoals(strategy?.business_goals || '');
    setSelectedChannels(strategy?.priority_channels || []);
  };

  useEffect(() => {
    populateForm();
  }, [strategy]);

  const handleStartEdit = () => {
    populateForm();
    setIsEditing(true);
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    populateForm();
    setIsEditing(false);
    setSuccessMessage(null);
  };

  const toggleChannel = (channelId: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((id) => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);

    const input: UpdateClientStrategyInput = {
      positioning,
      value_proposition: valueProposition,
      target_audience: targetAudience,
      brand_voice_tone: brandVoiceTone,
      communication_guidelines: communicationGuidelines,
      do_donts: doDonts,
      business_goals: businessGoals,
      priority_channels: selectedChannels,
    };

    const result = await onSave(input);
    if (result) {
      setIsEditing(false);
      setSuccessMessage('Estratégia atualizada com sucesso.');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const hasStrategyContent = Boolean(
    strategy &&
      (strategy.positioning ||
        strategy.value_proposition ||
        strategy.target_audience ||
        strategy.brand_voice_tone ||
        strategy.communication_guidelines ||
        strategy.do_donts ||
        strategy.business_goals ||
        (strategy.priority_channels && strategy.priority_channels.length > 0))
  );

  return (
    <div
      id="brand-strategy-section"
      className="bg-white border border-[#E8E9EA] rounded-xl p-5 md:p-6 shadow-2xs space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F2F3F3]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#F7F7F8] border border-[#E8E9EA]">
            <Compass className="w-4 h-4 text-[#1D1D1D]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#1D1D1D]">
              Estratégia da Marca
            </h2>
            <p className="text-xs text-[#666668]">
              Pilares fundamentais de posicionamento, audiência e tom de comunicação.
            </p>
          </div>
        </div>

        {!isEditing && (
          <button
            id="edit-strategy-btn"
            onClick={handleStartEdit}
            disabled={loading || Boolean(error)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-[#1D1D1D] bg-[#F7F7F8] hover:bg-[#E8E9EA] border border-[#E8E9EA] rounded-lg transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#666668]" />
            <span>{hasStrategyContent ? 'Editar estratégia' : 'Definir estratégia'}</span>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notifications */}
      {(error || saveError) && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{saveError || error}</span>
        </div>
      )}

      {/* Loading & Content States */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-[#8C8D8F]">
          <Loader2 className="w-5 h-5 animate-spin text-[#1D1D1D]" />
          <p className="text-xs">Carregando diretrizes estratégicas...</p>
        </div>
      ) : error ? (
        /* Quando ocorre erro no carregamento da estratégia, não renderizar empty state simultâneo */
        null
      ) : isEditing ? (
        /* EDIT MODE FORM */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bloco 1 — Fundamentos */}
          <div className="space-y-3.5 p-4 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1D]">
              <Target className="w-3.5 h-3.5 text-[#F3705A]" />
              <span>Bloco 1 — Fundamentos da Marca</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4D4D4F] mb-1">
                  Posicionamento
                </label>
                <textarea
                  rows={4}
                  value={positioning}
                  onChange={(e) => setPositioning(e.target.value)}
                  placeholder="Como a marca se posiciona na mente do consumidor..."
                  className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4D4F] mb-1">
                  Proposta de Valor
                </label>
                <textarea
                  rows={4}
                  value={valueProposition}
                  onChange={(e) => setValueProposition(e.target.value)}
                  placeholder="Qual transformação ou benefício central é entregue..."
                  className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4D4F] mb-1">
                  Público-Alvo & ICP
                </label>
                <textarea
                  rows={4}
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Quem é o cliente ideal, dores, desejos e contexto..."
                  className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Bloco 2 — Comunicação */}
          <div className="space-y-3.5 p-4 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1D]">
              <MessageSquare className="w-3.5 h-3.5 text-[#F3705A]" />
              <span>Bloco 2 — Tom & Diretrizes de Comunicação</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#4D4D4F] mb-1">
                  Tom de Voz & Personalidade
                </label>
                <textarea
                  rows={4}
                  value={brandVoiceTone}
                  onChange={(e) => setBrandVoiceTone(e.target.value)}
                  placeholder="Ex: Sofisticado, direto, empático, autoridade técnica..."
                  className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4D4F] mb-1">
                  Diretrizes de Comunicação
                </label>
                <textarea
                  rows={4}
                  value={communicationGuidelines}
                  onChange={(e) => setCommunicationGuidelines(e.target.value)}
                  placeholder="Regras de estilo, terminologias-chave, estrutura de copy..."
                  className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4D4F] mb-1">
                  O que Fazer / Evitar (Do's & Don'ts)
                </label>
                <textarea
                  rows={4}
                  value={doDonts}
                  onChange={(e) => setDoDonts(e.target.value)}
                  placeholder="Do: focar em resultados. Don't: usar gírias ou clichês..."
                  className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Bloco 3 — Objetivos & Canais */}
          <div className="space-y-3.5 p-4 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1D]">
              <Share2 className="w-3.5 h-3.5 text-[#F3705A]" />
              <span>Bloco 3 — Objetivos & Canais Prioritários</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4D4D4F] mb-1">
                  Objetivos de Negócio & KPIs da Marca
                </label>
                <textarea
                  rows={3}
                  value={businessGoals}
                  onChange={(e) => setBusinessGoals(e.target.value)}
                  placeholder="Ex: Geração de leads qualificados, aumento de autoridade, expansão de share..."
                  className="w-full px-3 py-2 text-xs text-[#1D1D1D] bg-white border border-[#E8E9EA] rounded-lg focus:outline-none focus:border-[#1D1D1D] placeholder:text-[#8C8D8F] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4D4F] mb-2">
                  Canais Prioritários
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_CHANNELS.map((ch) => {
                    const isSelected = selectedChannels.includes(ch.id);
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => toggleChannel(ch.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1D1D1D] text-white border-[#1D1D1D] shadow-2xs'
                            : 'bg-white text-[#666668] border-[#E8E9EA] hover:border-[#1D1D1D] hover:text-[#1D1D1D]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-[#F3705A]" />}
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F2F3F3]">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-[#666668] hover:text-[#1D1D1D] hover:bg-[#F2F3F3] rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? 'Salvando...' : 'Salvar Estratégia'}</span>
            </button>
          </div>
        </form>
      ) : !hasStrategyContent ? (
        /* EMPTY STATE IN READING MODE */
        <div className="py-10 px-4 text-center rounded-xl bg-[#FBFBFC] border border-dashed border-[#E8E9EA] space-y-3">
          <div className="w-10 h-10 mx-auto rounded-full bg-[#F2F3F3] flex items-center justify-center text-[#8C8D8F]">
            <Sparkles className="w-5 h-5 text-[#8C8D8F]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#1D1D1D]">
              Nenhuma estratégia cadastrada para este cliente.
            </p>
            <p className="text-xs text-[#8C8D8F] max-w-sm mx-auto mt-0.5">
              Estruture o posicionamento, público e tom de voz para orientar a criação de conteúdo.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartEdit}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#1D1D1D] hover:bg-[#2E2E2E] rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-[#F3705A]" />
            <span>Definir estratégia</span>
          </button>
        </div>
      ) : (
        /* READ MODE DISPLAY */
        <div className="space-y-6">
          {/* Bloco 1 — Fundamentos */}
          <div className="space-y-3 p-4 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1D] border-b border-[#F0F0F1] pb-2">
              <Target className="w-3.5 h-3.5 text-[#F3705A]" />
              <span>Fundamentos da Marca</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-[#666668] block">Posicionamento</span>
                <p className="text-[#1D1D1D] whitespace-pre-line leading-relaxed">
                  {strategy?.positioning || (
                    <span className="text-[#8C8D8F] italic">Não informado</span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#666668] block">Proposta de Valor</span>
                <p className="text-[#1D1D1D] whitespace-pre-line leading-relaxed">
                  {strategy?.value_proposition || (
                    <span className="text-[#8C8D8F] italic">Não informado</span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#666668] block">Público-Alvo & ICP</span>
                <p className="text-[#1D1D1D] whitespace-pre-line leading-relaxed">
                  {strategy?.target_audience || (
                    <span className="text-[#8C8D8F] italic">Não informado</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Bloco 2 — Comunicação */}
          <div className="space-y-3 p-4 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1D] border-b border-[#F0F0F1] pb-2">
              <MessageSquare className="w-3.5 h-3.5 text-[#F3705A]" />
              <span>Tom & Diretrizes de Comunicação</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-[#666668] block">Tom de Voz</span>
                <p className="text-[#1D1D1D] whitespace-pre-line leading-relaxed">
                  {strategy?.brand_voice_tone || (
                    <span className="text-[#8C8D8F] italic">Não informado</span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#666668] block">Diretrizes de Estilo</span>
                <p className="text-[#1D1D1D] whitespace-pre-line leading-relaxed">
                  {strategy?.communication_guidelines || (
                    <span className="text-[#8C8D8F] italic">Não informado</span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#666668] block">Do's & Don'ts</span>
                <p className="text-[#1D1D1D] whitespace-pre-line leading-relaxed">
                  {strategy?.do_donts || (
                    <span className="text-[#8C8D8F] italic">Não informado</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Bloco 3 — Objetivos & Canais */}
          <div className="space-y-3 p-4 bg-[#FBFBFC] border border-[#E8E9EA] rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1D1D1D] border-b border-[#F0F0F1] pb-2">
              <Share2 className="w-3.5 h-3.5 text-[#F3705A]" />
              <span>Objetivos & Canais</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-[#666668] block">Objetivos de Negócio</span>
                <p className="text-[#1D1D1D] whitespace-pre-line leading-relaxed">
                  {strategy?.business_goals || (
                    <span className="text-[#8C8D8F] italic">Não informado</span>
                  )}
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#666668] block">Canais Prioritários</span>
                {strategy?.priority_channels && strategy.priority_channels.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {strategy.priority_channels.map((ch) => {
                      const channelMeta = AVAILABLE_CHANNELS.find((c) => c.id === ch);
                      return (
                        <span
                          key={ch}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white text-[#1D1D1D] border border-[#E8E9EA] shadow-2xs"
                        >
                          {channelMeta?.label || ch}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[#8C8D8F] italic">Nenhum canal selecionado</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
