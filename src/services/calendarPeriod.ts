export type CalendarView = 'day' | 'week' | 'month';
const civil = (date: Date) => date.toISOString().slice(0, 10);
// UTC is used only for civil-date arithmetic, never for local event hours.
export function shiftCalendarDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return civil(value);
}
export function calendarWeek(date: string) {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  const monday = shiftCalendarDate(date, -((day + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => shiftCalendarDate(monday, index));
}
export function shiftCalendarPeriod(date: string, view: CalendarView, direction: number) {
  if (view !== 'month') return shiftCalendarDate(date, direction * (view === 'week' ? 7 : 1));
  const value = new Date(`${date}T12:00:00Z`), day = value.getUTCDate();
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + direction);
  const last = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
  value.setUTCDate(Math.min(day, last));
  return civil(value);
}
export function calendarDateLabel(date: string, full = false) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: full ? 'long' : 'short', day: 'numeric', month: full ? 'long' : 'short', year: full ? 'numeric' : undefined }).format(new Date(`${date}T12:00:00Z`));
}
