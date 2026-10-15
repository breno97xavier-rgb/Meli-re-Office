import { parseCivilDate } from '../utils/civilDate';
import type { FinanceInput, FinanceEntry, FinanceBaseline, FinanceRecurrence, FinanceRecurrenceInput } from '../types/finance';
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

function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Boolean(parseCivilDate(value)); }
function safeSum(a: number, b: number) {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !Number.isSafeInteger(a+b)) throw new Error('O total ultrapassa o limite de cálculo seguro.');
  return a+b;
}
export function validateFinanceBaseline(opening_cents: number, start_date: string, today: string) {
  if (!Number.isSafeInteger(opening_cents) || Math.abs(opening_cents)>MAX_FINANCE_CENTS) throw new Error('Saldo inicial inválido.');
  if (!validDate(start_date) || start_date>today) throw new Error('A data inicial deve ser válida e não pode estar no futuro.');
  return {opening_cents,start_date};
}
export function validateFinanceRecurrence(input: FinanceRecurrenceInput): FinanceRecurrenceInput {
  const common=validateFinanceInput({...input,due_date:input.start_date,status:'pending',settlement_date:null});
  if (!Number.isInteger(input.due_day) || input.due_day<1 || input.due_day>31) throw new Error('Escolha um dia de vencimento entre 1 e 31.');
  if (input.end_date!==null && (!validDate(input.end_date) || input.end_date<input.start_date)) throw new Error('O término deve ser igual ou posterior ao início.');
  if (input.entry_type==='income' && !input.end_date) throw new Error('Receitas recorrentes precisam de término confirmado para não presumir renovação.');
  return {title:common.title,description:common.description,category:common.category,entry_type:common.entry_type,amount_cents:common.amount_cents,client_id:common.client_id,start_date:input.start_date,end_date:input.end_date,due_day:input.due_day};
}
export function recurrenceDate(rule: FinanceRecurrenceInput, month: string) {
  const [year,m]=month.split('-').map(Number);
  const last=new Date(Date.UTC(year,m,0)).getUTCDate();
  return `${month}-${String(Math.min(last,rule.due_day)).padStart(2,'0')}`;
}
export function currentFinanceCash(entries: FinanceEntry[], baseline: FinanceBaseline | null, today: string): number | null {
  if (!baseline) return null;
  let balance=baseline.opening_cents;
  for (const entry of entries) if (entry.status==='settled' && entry.settlement_date && entry.settlement_date>=baseline.start_date && entry.settlement_date<=today)
    balance=safeSum(balance,entry.entry_type==='income'?entry.amount_cents:-entry.amount_cents);
  return balance;
}
// Virtual occurrences never write to the database. Existing occurrences, including
// cancelled ones, reserve their month and cannot reappear in forecasts.
export function projectFinance(entries: FinanceEntry[], rules: FinanceRecurrence[], today: string, until: string) {
  if (!validDate(today) || !validDate(until) || until<today) throw new Error('Escolha um término válido para a previsão.');
  const first=Number(today.slice(0,4))*12+Number(today.slice(5,7))-1;
  const last=Number(until.slice(0,4))*12+Number(until.slice(5,7))-1;
  if(last-first>23) throw new Error('A previsão aceita até 24 meses por consulta.');
  let income=0,expense=0,overdueIncome=0,overdueExpense=0;
  const add=(type:string,amount:number,overdue=false)=>{if(type==='income'){income=safeSum(income,amount);if(overdue)overdueIncome=safeSum(overdueIncome,amount);}else{expense=safeSum(expense,amount);if(overdue)overdueExpense=safeSum(overdueExpense,amount);}};
  const occupied=new Set(entries.filter(e=>e.recurrence_id&&e.competence_month).map(e=>`${e.recurrence_id}:${e.competence_month!.slice(0,7)}`));
  const clientMonths=new Set(entries.filter(e=>e.recurrence_id&&e.competence_month&&e.client_id&&e.entry_type==='income').map(e=>`${e.client_id}:${e.competence_month!.slice(0,7)}`));
  for(const entry of entries) if(entry.status==='pending'&&entry.due_date<=until) add(entry.entry_type,entry.amount_cents,entry.due_date<today);
  // A future effective date does not affect today's cash; keep it visible in
  // the forecast rather than silently losing a scheduled movement.
  for(const entry of entries) if(entry.status==='settled'&&entry.settlement_date&&entry.settlement_date>today&&entry.settlement_date<=until) add(entry.entry_type,entry.amount_cents);
  for(const rule of rules) if(rule.active) for(let index=first;index<=last;index++) {
    const month=`${Math.floor(index/12)}-${String(index%12+1).padStart(2,'0')}`;
    const due=recurrenceDate(rule,month);
    if(due<today||due<rule.start_date||due>until||(rule.end_date&&due>rule.end_date)||occupied.has(`${rule.id}:${month}`)||(rule.entry_type==='income'&&rule.client_id&&clientMonths.has(`${rule.client_id}:${month}`)))continue;
    add(rule.entry_type,rule.amount_cents);
  }
  return {income,expense,net:safeSum(income,-expense),overdueIncome,overdueExpense};
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
