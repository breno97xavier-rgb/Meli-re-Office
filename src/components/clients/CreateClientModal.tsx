import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { Client } from '../../types/clients';
import { createManualClient, parseOptionalClientAmount } from '../../services/clientsService';

interface Props { onClose: () => void; onCreated: (client: Client) => void }

export function CreateClientModal({ onClose, onCreated }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); };
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    const values = new FormData(event.currentTarget);
    savingRef.current = true; setSaving(true); setError(null);
    try {
      const client = await createManualClient({
        name: String(values.get('name') || ''),
        commercial_name: String(values.get('commercial_name') || ''),
        segment: String(values.get('segment') || ''),
        phone: String(values.get('phone') || ''),
        email: String(values.get('email') || ''),
        notes: String(values.get('notes') || ''),
        monthly_amount: parseOptionalClientAmount(String(values.get('monthly_amount') || '')),
        one_time_amount: parseOptionalClientAmount(String(values.get('one_time_amount') || '')),
      });
      onCreated(client);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível cadastrar o cliente.');
    } finally { savingRef.current = false; setSaving(false); }
  }
  const fieldClass = 'mt-1 w-full rounded-lg border border-[#E8E9EA] px-3 py-2 text-sm focus:outline-none focus:border-[#F15A3C]';
  return <dialog ref={dialog} aria-labelledby="new-client-title"
    onCancel={event => { event.preventDefault(); if (!savingRef.current) onClose(); }}
    className="m-auto w-[calc(100%_-_2rem)] max-w-xl max-h-[90vh] rounded-2xl border border-[#E8E9EA] bg-white p-0 text-[#1D1D1D] shadow-2xl backdrop:bg-[#1D1D1D]/50">
    <div className="flex items-center justify-between border-b border-[#E8E9EA] px-6 py-5">
      <h2 id="new-client-title" className="font-semibold">Novo cliente</h2>
      <button type="button" onClick={onClose} disabled={saving} aria-label="Fechar cadastro" className="p-1 disabled:opacity-40"><X className="h-5 w-5" /></button>
    </div>
    <form onSubmit={submit} className="space-y-4 p-6">
      <p className="text-sm text-[#666668]">Cadastre diretamente na sua agência, sem depender de contrato ou oportunidade comercial.</p>
      <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2 disabled:opacity-60">
        <label className="text-xs font-medium sm:col-span-2">Nome ou razão social *<input autoFocus name="name" required maxLength={200} className={fieldClass} /></label>
        <label className="text-xs font-medium">Nome comercial<input name="commercial_name" maxLength={200} className={fieldClass} /></label>
        <label className="text-xs font-medium">Segmento<input name="segment" maxLength={200} className={fieldClass} /></label>
        <label className="text-xs font-medium">Telefone / WhatsApp<input name="phone" type="tel" maxLength={50} className={fieldClass} /></label>
        <label className="text-xs font-medium">E-mail<input name="email" type="email" maxLength={254} className={fieldClass} /></label>
        <label className="text-xs font-medium">Mensalidade (R$)<input name="monthly_amount" inputMode="decimal" placeholder="Ex.: 1600,00" maxLength={20} className={fieldClass} /></label>
        <label className="text-xs font-medium">Setup / Pontual (R$)<input name="one_time_amount" inputMode="decimal" placeholder="Ex.: 500,00" maxLength={20} className={fieldClass} /></label>
        <label className="text-xs font-medium sm:col-span-2">Observações<textarea name="notes" rows={3} maxLength={5000} className={fieldClass} /></label>
      </fieldset>
      <p className="text-xs text-[#666668]">O cliente começa em Onboarding. Você poderá editar os dados e o status no perfil.</p>
      <p className="text-xs text-[#666668]">Valores opcionais, sem separador de milhar. Não geram cobranças ou pagamentos automaticamente.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} disabled={saving} className="rounded-lg border border-[#E8E9EA] px-4 py-2 text-sm disabled:opacity-40">Cancelar</button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#1D1D1D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {saving ? 'Salvando…' : 'Cadastrar cliente'}
        </button>
      </div>
    </form>
  </dialog>;
}
