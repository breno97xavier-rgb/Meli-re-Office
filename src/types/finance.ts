export type FinanceType = 'income' | 'expense';
export type FinanceStatus = 'pending' | 'settled' | 'cancelled';
export interface FinanceInput {
  title: string; description: string | null; category: string; entry_type: FinanceType;
  amount_cents: number; due_date: string; status: FinanceStatus; settlement_date: string | null; client_id: string | null;
}
export interface FinanceEntry extends FinanceInput { id: string; workspace_id: string; created_by: string; created_at: string; updated_at: string; recurrence_id?: string | null; competence_month?: string | null }
export interface FinanceEvent { id: string; event_type: string; old_values: FinanceEntry | null; new_values: FinanceEntry; occurred_at: string }
export interface FinanceClient { id: string; name: string; commercial_name: string | null; monthly_amount?: number | null; contract_start_date?: string | null; contract_end_date?: string | null }
export interface FinanceBaseline { workspace_id: string; opening_cents: number; start_date: string; updated_at: string }
export interface FinanceRecurrenceInput {
  title: string; description: string | null; category: string; entry_type: FinanceType;
  amount_cents: number; client_id: string | null; start_date: string; end_date: string | null; due_day: number;
}
export interface FinanceRecurrence extends FinanceRecurrenceInput { id: string; workspace_id: string; active: boolean; updated_at: string }
