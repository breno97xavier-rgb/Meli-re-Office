import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Content,
  ContentFormatFilter,
  EditorialStatus,
  EditorialStatusFilter,
  CreateContentInput,
  UpdateContentInput,
  ContentProfileRelation,
} from '../types/contents';
import { Client } from '../types/clients';
import {
  fetchContents,
  createContent,
  updateContent,
  updateContentPlannedDate,
  fetchTeamProfiles,
  formatContentError,
} from '../services/contentsService';
import { fetchClients } from '../services/clientsService';
import {
  parseCivilDate,
  generateMonthGrid,
  getAdjacentMonth,
  getSystemTodayCivilDate,
  checkPlanningDateWarnings,
  CalendarGridDay,
  PlanningDateWarning,
} from '../utils/civilDate';

export interface CalendarMetrics {
  totalPlannedInMonth: number;
  approvedInMonth: number;
  inProductionInMonth: number;
  inReviewInMonth: number;
  draftInMonth: number;
  cancelledInMonth: number;
  totalUndated: number;
}

export interface UseCalendarContentsOptions {
  initialClientId?: string;
  initialYear?: number;
  initialMonth?: number; // 1 - 12
}

export function useCalendarContents(options?: UseCalendarContentsOptions) {
  const initialClientId = options?.initialClientId;

  // Estado temporal do calendário
  const systemToday = useMemo(() => getSystemTodayCivilDate(), []);
  const [visibleYear, setVisibleYear] = useState<number>(
    options?.initialYear || systemToday.year
  );
  const [visibleMonth, setVisibleMonth] = useState<number>(
    options?.initialMonth || systemToday.month
  );

  // Dados brutos
  const [allContents, setAllContents] = useState<Content[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [teamProfiles, setTeamProfiles] = useState<ContentProfileRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Conteúdo selecionado para Drawer
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  // Filtros
  const [clientIdFilter, setClientIdFilter] = useState<string | 'all'>(
    initialClientId || 'all'
  );
  const [formatFilter, setFormatFilter] = useState<ContentFormatFilter>('all');
  const [statusFilter, setStatusFilter] = useState<EditorialStatusFilter>('all');
  const [channelFilter, setChannelFilter] = useState<string | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de mutação
  const [isMoving, setIsMoving] = useState(false);
  const [movingContentIds, setMovingContentIds] = useState<string[]>([]);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Sincronizar initialClientId quando mudar
  useEffect(() => {
    if (initialClientId) {
      setClientIdFilter(initialClientId);
    }
  }, [initialClientId]);

  // Carga inicial de dados
  const loadContents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contentsData, clientsData, profilesData] = await Promise.all([
        fetchContents(initialClientId),
        fetchClients(),
        fetchTeamProfiles(),
      ]);
      setAllContents(contentsData);
      setClients(clientsData);
      setTeamProfiles(profilesData);
    } catch (err) {
      const formatted = formatContentError(err);
      setError(formatted);
      console.error('Error in useCalendarContents loadContents:', err);
    } finally {
      setLoading(false);
    }
  }, [initialClientId]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  // Navegação de Mês
  const previousMonth = useCallback(() => {
    const prev = getAdjacentMonth(visibleYear, visibleMonth, -1);
    setVisibleYear(prev.year);
    setVisibleMonth(prev.month);
  }, [visibleYear, visibleMonth]);

  const nextMonth = useCallback(() => {
    const next = getAdjacentMonth(visibleYear, visibleMonth, 1);
    setVisibleYear(next.year);
    setVisibleMonth(next.month);
  }, [visibleYear, visibleMonth]);

  const goToToday = useCallback(() => {
    const today = getSystemTodayCivilDate();
    setVisibleYear(today.year);
    setVisibleMonth(today.month);
  }, []);

  const setMonthAndYear = useCallback((year: number, month: number) => {
    if (month >= 1 && month <= 12 && year >= 1000 && year <= 9999) {
      setVisibleYear(year);
      setVisibleMonth(month);
    }
  }, []);

  // Filtragem unificada de conteúdos
  const filteredContents = useMemo(() => {
    return allContents.filter((content) => {
      // Filtro de Cliente
      if (clientIdFilter !== 'all' && content.client_id !== clientIdFilter) {
        return false;
      }

      // Filtro de Formato
      if (formatFilter !== 'all' && content.format !== formatFilter) {
        return false;
      }

      // Filtro de Status Editorial
      if (statusFilter !== 'all' && content.editorial_status !== statusFilter) {
        return false;
      }

      // Filtro de Canal
      if (channelFilter !== 'all' && content.primary_channel !== channelFilter) {
        return false;
      }

      // Filtro de Busca Textual
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const titleMatch = content.internal_title?.toLowerCase().includes(query);
        const goalMatch = content.goal?.toLowerCase().includes(query);
        const pillarMatch = content.pillar?.toLowerCase().includes(query);
        const structuredPillarMatch = content.client_pillar?.name?.toLowerCase().includes(query);
        const copyMatch = content.copy?.toLowerCase().includes(query);
        const captionMatch = content.caption?.toLowerCase().includes(query);
        const notesMatch = content.notes?.toLowerCase().includes(query);
        const clientNameMatch =
          content.client?.commercial_name?.toLowerCase().includes(query) ||
          content.client?.name?.toLowerCase().includes(query);
        const planMatch = content.editorial_plan?.title?.toLowerCase().includes(query);
        const campaignMatch = content.campaign?.name?.toLowerCase().includes(query);

        if (
          !titleMatch &&
          !goalMatch &&
          !pillarMatch &&
          !structuredPillarMatch &&
          !copyMatch &&
          !captionMatch &&
          !notesMatch &&
          !clientNameMatch &&
          !planMatch &&
          !campaignMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allContents, clientIdFilter, formatFilter, statusFilter, channelFilter, searchTerm]);

  // Conteúdos do mês visível
  const monthContents = useMemo(() => {
    return filteredContents.filter((content) => {
      if (!content.planned_date) return false;
      const parsed = parseCivilDate(content.planned_date);
      if (!parsed) return false;
      return parsed.year === visibleYear && parsed.month === visibleMonth;
    });
  }, [filteredContents, visibleYear, visibleMonth]);

  // Conteúdos sem data (Backlog)
  const undatedContents = useMemo(() => {
    return filteredContents
      .filter((content) => !content.planned_date)
      .sort((a, b) => {
        const dateA = a.created_at || '';
        const dateB = b.created_at || '';
        return dateB.localeCompare(dateA);
      });
  }, [filteredContents]);

  // Agrupamento de conteúdos por data civil ("YYYY-MM-DD")
  const contentsByDate = useMemo(() => {
    const map: Record<string, Content[]> = {};

    filteredContents.forEach((content) => {
      if (!content.planned_date) return;
      const parsed = parseCivilDate(content.planned_date);
      if (!parsed) return;

      const key = content.planned_date.split('T')[0];
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(content);
    });

    // Ordenação determinística estável dentro de cada dia:
    // Critério: status editorial canônico prioritário e created_at
    Object.keys(map).forEach((dateKey) => {
      map[dateKey].sort((a, b) => {
        const orderA = a.created_at || '';
        const orderB = b.created_at || '';
        return orderA.localeCompare(orderB) || a.id.localeCompare(b.id);
      });
    });

    return map;
  }, [filteredContents]);

  // Geração da grade de dias (35 ou 42 células)
  const gridDays: CalendarGridDay[] = useMemo(() => {
    return generateMonthGrid(visibleYear, visibleMonth);
  }, [visibleYear, visibleMonth]);

  // Métricas do mês visível e backlog
  const metrics: CalendarMetrics = useMemo(() => {
    return {
      totalPlannedInMonth: monthContents.length,
      approvedInMonth: monthContents.filter((c) => c.editorial_status === 'approved').length,
      inProductionInMonth: monthContents.filter((c) => c.editorial_status === 'in_production').length,
      inReviewInMonth: monthContents.filter(
        (c) => c.editorial_status === 'review' || c.editorial_status === 'client_review'
      ).length,
      draftInMonth: monthContents.filter((c) => c.editorial_status === 'draft').length,
      cancelledInMonth: monthContents.filter((c) => c.editorial_status === 'cancelled').length,
      totalUndated: undatedContents.length,
    };
  }, [monthContents, undatedContents]);

  // Detector de advertências para um conteúdo e data pretendida
  const checkWarnings = useCallback(
    (content: Content, targetDate: string | null): PlanningDateWarning[] => {
      return checkPlanningDateWarnings(content, targetDate);
    },
    []
  );

  // Mutações
  const handleMoveContentDate = useCallback(
    async (contentId: string, newDate: string | null): Promise<Content> => {
      const originalContent = allContents.find((item) => item.id === contentId);
      const originalDate = originalContent ? originalContent.planned_date : null;

      // Se a data já for a mesma, no-op imediato
      if (originalContent && originalDate === newDate) {
        return originalContent;
      }

      // Adiciona o contentId ao tracking de mutações ativas para evitar drags concorrentes
      setMovingContentIds((prev) => (prev.includes(contentId) ? prev : [...prev, contentId]));
      setIsMoving(true);
      setMoveError(null);

      // 1. Atualização Otimista Imediata no Estado Local
      setAllContents((prev) =>
        prev.map((item) =>
          item.id === contentId ? { ...item, planned_date: newDate } : item
        )
      );
      if (selectedContent?.id === contentId) {
        setSelectedContent((prev) => (prev ? { ...prev, planned_date: newDate } : null));
      }

      try {
        // 2. Persistência Cirúrgica no Supabase (apenas planned_date, sem updated_at)
        const updated = await updateContentPlannedDate(contentId, newDate);

        // 3. Sucesso: consolida o registro atualizado
        setAllContents((prev) =>
          prev.map((item) => (item.id === contentId ? updated : item))
        );
        if (selectedContent?.id === contentId) {
          setSelectedContent(updated);
        }
        return updated;
      } catch (err) {
        // 4. Erro: Rollback imediato para a data original
        setAllContents((prev) =>
          prev.map((item) =>
            item.id === contentId ? { ...item, planned_date: originalDate } : item
          )
        );
        if (selectedContent?.id === contentId) {
          setSelectedContent((prev) => (prev ? { ...prev, planned_date: originalDate } : null));
        }

        const formatted = formatContentError(err);
        setMoveError(formatted);
        throw new Error(formatted);
      } finally {
        setMovingContentIds((prev) => prev.filter((id) => id !== contentId));
        setIsMoving(false);
      }
    },
    [allContents, selectedContent]
  );

  const handleCreateContent = useCallback(
    async (input: CreateContentInput): Promise<Content> => {
      setIsCreating(true);
      setCreateError(null);
      try {
        const created = await createContent(input);
        setAllContents((prev) => [created, ...prev]);
        return created;
      } catch (err) {
        const formatted = formatContentError(err);
        setCreateError(formatted);
        throw new Error(formatted);
      } finally {
        setIsCreating(false);
      }
    },
    []
  );

  const handleUpdateContent = useCallback(
    async (contentId: string, input: UpdateContentInput): Promise<Content> => {
      setIsUpdating(true);
      setUpdateError(null);
      try {
        const updated = await updateContent(contentId, input);
        setAllContents((prev) =>
          prev.map((item) => (item.id === contentId ? updated : item))
        );
        if (selectedContent?.id === contentId) {
          setSelectedContent(updated);
        }
        return updated;
      } catch (err) {
        const formatted = formatContentError(err);
        setUpdateError(formatted);
        throw new Error(formatted);
      } finally {
        setIsUpdating(false);
      }
    },
    [selectedContent]
  );

  const handleUpdateStatus = useCallback(
    async (contentId: string, status: EditorialStatus): Promise<Content> => {
      return handleUpdateContent(contentId, { editorial_status: status });
    },
    [handleUpdateContent]
  );

  const handleSelectContent = useCallback((content: Content | null) => {
    setSelectedContent(content);
    setUpdateError(null);
    setMoveError(null);
  }, []);

  const resetFilters = useCallback(() => {
    setClientIdFilter(initialClientId || 'all');
    setFormatFilter('all');
    setStatusFilter('all');
    setChannelFilter('all');
    setSearchTerm('');
  }, [initialClientId]);

  const isFilterActive = useMemo(() => {
    return (
      (clientIdFilter !== 'all' && clientIdFilter !== initialClientId) ||
      formatFilter !== 'all' ||
      statusFilter !== 'all' ||
      channelFilter !== 'all' ||
      searchTerm.trim() !== ''
    );
  }, [clientIdFilter, initialClientId, formatFilter, statusFilter, channelFilter, searchTerm]);

  return {
    // Dados temporais e grade
    visibleYear,
    visibleMonth,
    previousMonth,
    nextMonth,
    goToToday,
    setMonthAndYear,
    gridDays,
    contentsByDate,
    monthContents,
    undatedContents,
    metrics,
    // Dados gerais e seleções
    contents: filteredContents,
    allContents,
    clients,
    teamProfiles,
    selectedContent,
    loading,
    error,
    // Filtros
    clientIdFilter,
    setClientIdFilter,
    formatFilter,
    setFormatFilter,
    statusFilter,
    setStatusFilter,
    channelFilter,
    setChannelFilter,
    searchTerm,
    setSearchTerm,
    isFilterActive,
    resetFilters,
    // Validações e Mutações
    checkWarnings,
    handleMoveContentDate,
    handleCreateContent,
    handleUpdateContent,
    handleUpdateStatus,
    handleSelectContent,
    loadContents,
    // Estados de carregamento de mutação
    isMoving,
    movingContentIds,
    moveError,
    setMoveError,
    isCreating,
    createError,
    setCreateError,
    isUpdating,
    updateError,
    setUpdateError,
  };
}
