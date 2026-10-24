// QA visual isolado: componentes reais, dados fictícios, sem rede/banco.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PresentationItemDecisionPanel } from '../../src/components/presentations/renderer/panels/PresentationItemDecisionPanel';
import type { PresentationItem } from '../../src/types/presentations';
import '../../src/index.css';

function Preview() {
  const [round, setRound] = useState(1);
  const [caption, setCaption] = useState('Texto fictício original');
  const [item, setItem] = useState<PresentationItem>({ id: 'fake-item-1', content_id: 'fake-content', presentation_id: 'fake-round-1',
    client_approval_status: 'pending', client_feedback: null, reviewed_at: null, presentation_notes: null, display_order: 0, created_at: '2026-10-23' });
  const [savedCaption, setSavedCaption] = useState('');
  return <main className="mx-auto max-w-4xl space-y-5 p-6">
    <p className="rounded-xl bg-amber-50 p-3">TESTE LOCAL · Dados fictícios · Sem conexão com banco ou contas reais</p>
    <h1 className="text-2xl font-bold">Rodada {round} — avaliação por versão</h1>
    <p>Texto atual da peça: {caption}</p>
    <div className="flex flex-wrap gap-3">
      <button className="rounded border p-3 disabled:opacity-50" disabled={Boolean(item.review_id) || item.client_approval_status !== 'pending'} onClick={() => {
        setSavedCaption(caption); setItem({ ...item, review_id: `fake-review-${round}`, review_prepared_at: new Date().toISOString() });
      }}>Preparar versão para avaliação</button>
      <button className="rounded border p-3" onClick={() => setCaption('Texto fictício alterado — versão nova')}>Simular alteração da peça</button>
      <button className="rounded border p-3" onClick={() => { setRound(round+1); setSavedCaption(''); setItem({ ...item,
        id: `fake-item-${round+1}`, review_id: null, client_approval_status: 'pending', client_feedback: null, reviewed_at: null }); }}>Nova rodada</button>
      <button className="rounded border p-3" onClick={() => setItem({ ...item, review_id: null, client_approval_status: 'approved', client_feedback: 'Parecer antigo preservado' })}>Simular parecer legado</button>
    </div>
    {item.review_id && <div className="rounded-xl border p-5"><p className="text-xs">Texto preservado para esta rodada</p><p>{savedCaption}</p></div>}
    <PresentationItemDecisionPanel item={item} mode="public" onSubmitDecision={async (status, feedback) => {
      setItem({ ...item, client_approval_status: status, client_feedback: feedback || null, reviewed_at: new Date().toISOString() });
    }}/>
  </main>;
}
const root = createRoot(document.getElementById('root')!);
root.render(<Preview/>);
import.meta.hot?.dispose(() => root.unmount());
