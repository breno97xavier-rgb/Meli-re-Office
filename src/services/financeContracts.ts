import { parseCivilDate } from '../utils/civilDate';
import type { FinanceInput, FinanceEntry } from '../types/finance';
export const MAX_FINANCE_CENTS = 9999999999;

export function parseFinanceAmount(value: string): number {
  const text = value.trim();
  // Brazilian thousands require a comma decimal separator, avoiding ambiguous 1.234.
  const normalized = /^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(text) ? text.replace(/\./g,'').replace(',','.') : text.replace(',','.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Informe um valor válido com até duas casas decimais.');
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2,'0'));
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > MAX_FINANCE_CENTS) throw new Error('O valor deve ser positivo e de até R$ 99.999.999,99.');
  return cents;
}

export function validateFinanceInput(input: FinanceInput): FinanceInput {
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.trim().length > 200) throw new Error('Informe um título de até 200 caracteres.');
  if (typeof input.category !== 'string' || !input.category.trim() || input.category.trim().length > 80) throw new Error('Informe uma categoria de até 80 caracteres.');
  if (!['income','expense'].includes(input.entry_type)) throw new Error('Tipo de lançamento inválido.');
  if (!['pending','settled','cancelled'].includes(input.status)) throw new Error('Status inválido.');
  if (!Number.isSafeInteger(input.amount_cents) || input.amount_cents < 1 || input.amount_cents > MAX_FINANCE_CENTS) throw new Error('Valor inválido.');
  if (typeof input.due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.due_date) || !parseCivilDate(input.due_date)) throw new Error('Informe um vencimento válido.');
  if (input.status === 'settled') {
    if (typeof input.settlement_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.settlement_date) || !parseCivilDate(input.settlement_date)) throw new Error('Informe a data efetiva do pagamento ou recebimento.');
  } else if (input.settlement_date !== null) throw new Error('Lançamentos pendentes ou cancelados não podem ter data de pagamento.');
  if (input.client_id !== null && (typeof input.client_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.client_id))) throw new Error('Cliente inválido.');
  if (input.description !== null && typeof input.description !== 'string') throw new Error('Descrição inválida.');
  return { title: input.title.trim(), description: input.description?.trim() || null, category: input.category.trim(), entry_type: input.entry_type, amount_cents: input.amount_cents, due_date: input.due_date, status: input.status, settlement_date: input.settlement_date, client_id: input.client_id };
}

export function summarizeFinance(entries: FinanceEntry[], month: string) {
  const result = { receivable: 0, payable: 0, received: 0, paid: 0, balance: 0 };
  const add = (key: 'receivable' | 'payable' | 'received' | 'paid', amount: number) => {
    if (!Number.isSafeInteger(amount) || !Number.isSafeInteger(result[key] + amount)) throw new Error('O total ultrapassa o limite de cálculo seguro.');
    result[key] += amount;
  };
  for (const entry of entries) {
    if (entry.status === 'pending' && entry.due_date.startsWith(month+'-')) add(entry.entry_type === 'income' ? 'receivable' : 'payable', entry.amount_cents);
    if (entry.status === 'settled' && entry.settlement_date?.startsWith(month+'-')) add(entry.entry_type === 'income' ? 'received' : 'paid', entry.amount_cents);
  }
  result.balance = result.received - result.paid;
  return result;
}
