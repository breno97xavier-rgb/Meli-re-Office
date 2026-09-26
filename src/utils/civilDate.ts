/**
 * Utilitários puros para manipulação e validação de Datas Civis (PostgreSQL DATE / "YYYY-MM-DD").
 *
 * Princípio Arquitetural Crítico:
 * PostgreSQL DATE representa exclusivamente um DIA CIVIL, sem horas, minutos ou fuso horário.
 * Nunca utilizar `new Date("YYYY-MM-DD")` para parsing de data de calendário, pois fusos UTC
 * negativos (como Brasília UTC-3) convertem a string para o dia anterior.
 *
 * Convenção de Mês:
 * 1 = Janeiro, 2 = Fevereiro, ..., 12 = Dezembro.
 */

export interface CivilDate {
  year: number;
  month: number; // 1 - 12
  day: number; // 1 - 31
}

export interface CalendarGridDay {
  date: string; // "YYYY-MM-DD"
  year: number;
  month: number; // 1 - 12
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: number; // 0 = Segunda-feira, 1 = Terça, ..., 6 = Domingo
}

export interface PlanningDateWarning {
  type: 'editorial_plan' | 'campaign';
  entityName: string;
  startDate?: string | null;
  endDate?: string | null;
  targetDate: string;
  message: string;
}

const MONTH_NAMES_LONG = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const MONTH_NAMES_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const WEEKDAY_NAMES_LONG = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
];

const WEEKDAY_NAMES_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const WEEKDAY_NAMES_NARROW = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

/**
 * Determina se um ano é bissexto.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Retorna a quantidade de dias de um mês em determinado ano.
 * @param year Ano (ex: 2026)
 * @param month Mês (1-12)
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

/**
 * Converte string no formato "YYYY-MM-DD" para estrutura CivilDate.
 * Retorna null para strings mal formatadas ou datas inexistentes (ex: 2026-02-31).
 */
export function parseCivilDate(dateStr?: string | null): CivilDate | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  // Aceita "YYYY-MM-DD" ou prefixo "YYYY-MM-DD" antes de "T"
  const clean = trimmed.split('T')[0];
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1000 || year > 9999) return null;
  if (month < 1 || month > 12) return null;

  const maxDays = getDaysInMonth(year, month);
  if (day < 1 || day > maxDays) return null;

  return { year, month, day };
}

/**
 * Formata ano, mês (1-12) e dia em string "YYYY-MM-DD".
 */
export function formatCivilDate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Converte um CivilDate para string "YYYY-MM-DD".
 */
export function formatCivilDateObject(civil: CivilDate): string {
  return formatCivilDate(civil.year, civil.month, civil.day);
}

/**
 * Formata uma data civil ("YYYY-MM-DD" ou CivilDate) para o padrão brasileiro "DD/MM/YYYY" de forma pura,
 * sem conversão implícita de fuso horário / timezone.
 * Retorna o fallback especificado (padrão '—') se a data for nula, vazia ou inválida.
 */
export function formatCivilDateBR(
  dateInput?: string | CivilDate | null,
  fallback: string = '—'
): string {
  if (!dateInput) return fallback;
  const parsed = typeof dateInput === 'string' ? parseCivilDate(dateInput) : dateInput;
  if (!parsed) return fallback;
  const d = String(parsed.day).padStart(2, '0');
  const m = String(parsed.month).padStart(2, '0');
  const y = String(parsed.year).padStart(4, '0');
  return `${d}/${m}/${y}`;
}

/**
 * Retorna a data civil atual do dispositivo/sistema como CivilDate.
 */
export function getSystemTodayCivilDate(): CivilDate {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

/**
 * Retorna a data civil atual do sistema como string "YYYY-MM-DD".
 */
export function getSystemTodayString(): string {
  const today = getSystemTodayCivilDate();
  return formatCivilDateObject(today);
}

/**
 * Compara se duas datas civis representam exatamente o mesmo dia.
 */
export function isSameCivilDay(
  dateA?: string | CivilDate | null,
  dateB?: string | CivilDate | null
): boolean {
  if (!dateA || !dateB) return false;
  const a = typeof dateA === 'string' ? parseCivilDate(dateA) : dateA;
  const b = typeof dateB === 'string' ? parseCivilDate(dateB) : dateB;
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * Compara duas datas civis:
 * Retorna < 0 se A < B, 0 se A === B, > 0 se A > B.
 */
export function compareCivilDates(
  dateA: string | CivilDate,
  dateB: string | CivilDate
): number {
  const a = typeof dateA === 'string' ? parseCivilDate(dateA) : dateA;
  const b = typeof dateB === 'string' ? parseCivilDate(dateB) : dateB;
  if (!a || !b) return 0;

  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

/**
 * Verifica se uma data alvo está compreendida no intervalo [startDate, endDate] (inclusivo).
 * Se startDate ou endDate forem nulos/indefinidos, o limite correspondente é considerado aberto.
 */
export function isCivilDateInRange(
  targetDate: string | CivilDate,
  startDate?: string | CivilDate | null,
  endDate?: string | CivilDate | null
): boolean {
  const target = typeof targetDate === 'string' ? parseCivilDate(targetDate) : targetDate;
  if (!target) return false;

  if (startDate) {
    const start = typeof startDate === 'string' ? parseCivilDate(startDate) : startDate;
    if (start && compareCivilDates(target, start) < 0) {
      return false;
    }
  }

  if (endDate) {
    const end = typeof endDate === 'string' ? parseCivilDate(endDate) : endDate;
    if (end && compareCivilDates(target, end) > 0) {
      return false;
    }
  }

  return true;
}

/**
 * Retorna o dia da semana do primeiro dia do mês especificado.
 * Convenção ISO 8601:
 * 0 = Segunda-feira, 1 = Terça, 2 = Quarta, 3 = Quinta, 4 = Sexta, 5 = Sábado, 6 = Domingo.
 */
export function getFirstDayOfWeek(year: number, month: number): number {
  // Date.UTC(year, month - 1, 1) garante 0h UTC do 1º dia sem deslocamento de fuso local
  const jsDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  // Mapear para Segunda-feira = 0 ... Domingo = 6
  return (jsDay + 6) % 7;
}

/**
 * Retorna o dia da semana para um dia civil específico.
 * Convenção ISO 8601:
 * 0 = Segunda-feira, 1 = Terça, 2 = Quarta, 3 = Quinta, 4 = Sexta, 5 = Sábado, 6 = Domingo.
 */
export function getDayOfWeek(year: number, month: number, day: number): number {
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (jsDay + 6) % 7;
}

/**
 * Retorna o mês adjacente com ajuste de virada de ano.
 * Ex: getAdjacentMonth(2026, 12, 1) => { year: 2027, month: 1 }
 * Ex: getAdjacentMonth(2026, 1, -1) => { year: 2025, month: 12 }
 */
export function getAdjacentMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  let newMonth = month + delta;
  let newYear = year;

  while (newMonth > 12) {
    newMonth -= 12;
    newYear += 1;
  }
  while (newMonth < 1) {
    newMonth += 12;
    newYear -= 1;
  }

  return { year: newYear, month: newMonth };
}

/**
 * Gera a matriz completa de dias para a grade mensal (Segunda a Domingo).
 * Inclui os dias de borda dos meses anterior e posterior necessários para fechar semanas completas (35 ou 42 células).
 *
 * @param year Ano visível (ex: 2026)
 * @param month Mês visível (1-12)
 * @param todayInput Data de referência para "isToday" (opcional, default: sistema)
 */
export function generateMonthGrid(
  year: number,
  month: number,
  todayInput?: string | CivilDate | null
): CalendarGridDay[] {
  const daysInCurrentMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month); // 0 = Segunda ... 6 = Domingo

  const prevMonthInfo = getAdjacentMonth(year, month, -1);
  const daysInPrevMonth = getDaysInMonth(prevMonthInfo.year, prevMonthInfo.month);

  const nextMonthInfo = getAdjacentMonth(year, month, 1);

  const todayCivil = todayInput
    ? typeof todayInput === 'string'
      ? parseCivilDate(todayInput)
      : todayInput
    : getSystemTodayCivilDate();

  const grid: CalendarGridDay[] = [];

  // 1. Preencher dias do mês anterior
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const date = formatCivilDate(prevMonthInfo.year, prevMonthInfo.month, day);
    const dayOfWeek = (grid.length) % 7;
    grid.push({
      date,
      year: prevMonthInfo.year,
      month: prevMonthInfo.month,
      day,
      isCurrentMonth: false,
      isToday: Boolean(todayCivil && isSameCivilDay({ year: prevMonthInfo.year, month: prevMonthInfo.month, day }, todayCivil)),
      dayOfWeek,
    });
  }

  // 2. Preencher dias do mês atual
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const date = formatCivilDate(year, month, day);
    const dayOfWeek = (grid.length) % 7;
    grid.push({
      date,
      year,
      month,
      day,
      isCurrentMonth: true,
      isToday: Boolean(todayCivil && isSameCivilDay({ year, month, day }, todayCivil)),
      dayOfWeek,
    });
  }

  // 3. Preencher dias do mês posterior para fechar semanas completas de 7 dias
  const totalCellsSoFar = grid.length;
  const remainder = totalCellsSoFar % 7;
  const trailingCount = remainder === 0 ? 0 : 7 - remainder;

  for (let day = 1; day <= trailingCount; day++) {
    const date = formatCivilDate(nextMonthInfo.year, nextMonthInfo.month, day);
    const dayOfWeek = (grid.length) % 7;
    grid.push({
      date,
      year: nextMonthInfo.year,
      month: nextMonthInfo.month,
      day,
      isCurrentMonth: false,
      isToday: Boolean(todayCivil && isSameCivilDay({ year: nextMonthInfo.year, month: nextMonthInfo.month, day }, todayCivil)),
      dayOfWeek,
    });
  }

  return grid;
}

/**
 * Retorna o nome do mês em português.
 * @param month Mês (1-12)
 * @param format 'long' (ex: "Setembro") ou 'short' (ex: "Set")
 */
export function getMonthName(month: number, format: 'long' | 'short' = 'long'): string {
  if (month < 1 || month > 12) return '';
  return format === 'long' ? MONTH_NAMES_LONG[month - 1] : MONTH_NAMES_SHORT[month - 1];
}

/**
 * Retorna a lista de nomes dos dias da semana em português (iniciando em Segunda-feira).
 */
export function getWeekdayNames(format: 'long' | 'short' | 'narrow' = 'short'): string[] {
  if (format === 'long') return [...WEEKDAY_NAMES_LONG];
  if (format === 'narrow') return [...WEEKDAY_NAMES_NARROW];
  return [...WEEKDAY_NAMES_SHORT];
}

/**
 * Avalia se o reposicionamento de um conteúdo para uma nova data pretendida
 * gera avisos de inconsistência temporal com o Ciclo Editorial ou Campanha vinculados.
 *
 * Função puramente detectora: não bloqueia, não altera vínculos e não abre modais.
 */
export function checkPlanningDateWarnings(
  content: {
    editorial_plan?: {
      title?: string;
      start_date?: string | null;
      end_date?: string | null;
    } | null;
    campaign?: {
      name?: string;
      start_date?: string | null;
      end_date?: string | null;
    } | null;
  },
  newPlannedDate: string | null
): PlanningDateWarning[] {
  // Mover para "sem data" (null) nunca gera aviso de período
  if (!newPlannedDate) return [];

  const warnings: PlanningDateWarning[] = [];

  // 1. Avaliar ciclo editorial (editorial_plan)
  if (content.editorial_plan?.start_date && content.editorial_plan?.end_date) {
    const isWithinPlan = isCivilDateInRange(
      newPlannedDate,
      content.editorial_plan.start_date,
      content.editorial_plan.end_date
    );
    if (!isWithinPlan) {
      warnings.push({
        type: 'editorial_plan',
        entityName: content.editorial_plan.title || 'Ciclo de Planejamento',
        startDate: content.editorial_plan.start_date,
        endDate: content.editorial_plan.end_date,
        targetDate: newPlannedDate,
        message: `A nova data está fora do período do ciclo "${content.editorial_plan.title}".`,
      });
    }
  }

  // 2. Avaliar campanha (campaign)
  if (content.campaign?.start_date && content.campaign?.end_date) {
    const isWithinCampaign = isCivilDateInRange(
      newPlannedDate,
      content.campaign.start_date,
      content.campaign.end_date
    );
    if (!isWithinCampaign) {
      warnings.push({
        type: 'campaign',
        entityName: content.campaign.name || 'Campanha',
        startDate: content.campaign.start_date,
        endDate: content.campaign.end_date,
        targetDate: newPlannedDate,
        message: `A nova data está fora do período da campanha "${content.campaign.name}".`,
      });
    }
  }

  return warnings;
}
