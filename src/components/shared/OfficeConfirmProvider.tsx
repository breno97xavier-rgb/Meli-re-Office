import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Confirm = (message: string) => Promise<boolean>;
const ConfirmationContext = createContext<Confirm>(async () => false);

/** In-app confirmation; cancellation always keeps the unsaved form intact. */
export function OfficeConfirmProvider({ children, title = 'Confirmar alteração', cancelLabel = 'Continuar preenchendo', confirmLabel = 'Descartar e continuar' }: {
  children: ReactNode;
  title?: string;
  cancelLabel?: string;
  confirmLabel?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef<((answer: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const confirm = useCallback<Confirm>(text => {
    if (pending.current) return Promise.resolve(false);
    return new Promise(resolve => { pending.current = resolve; setMessage(text); });
  }, []);
  const answer = (value: boolean) => {
    const resolve = pending.current; pending.current = null;
    dialog.current?.close(); setMessage(null); resolve?.(value);
  };
  useEffect(() => { if (message !== null) dialog.current?.showModal(); }, [message]);
  useEffect(() => () => { pending.current?.(false); pending.current = null; }, []);
  return <ConfirmationContext.Provider value={confirm}>
    {children}
    {message !== null && createPortal(<dialog ref={dialog} aria-labelledby="office-confirm-title" aria-describedby="office-confirm-message"
      onCancel={event => { event.preventDefault(); answer(false); }}
      onClick={event => { if (event.target === event.currentTarget) answer(false); }}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-[#E8E9EA] bg-white p-6 text-[#1D1D1D] shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm">
      <h2 id="office-confirm-title" className="text-lg font-semibold">{title}</h2>
      <p id="office-confirm-message" className="mt-3 text-sm text-[#666668]">{message}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button autoFocus type="button" onClick={() => answer(false)} className="min-h-11 rounded-lg border px-4 py-2 text-sm cursor-pointer">{cancelLabel}</button>
        <button type="button" onClick={() => answer(true)} className="min-h-11 rounded-lg bg-[#1D1D1D] px-4 py-2 text-sm text-white cursor-pointer">{confirmLabel}</button>
      </div>
    </dialog>, document.body)}
  </ConfirmationContext.Provider>;
}

export function useOfficeConfirm(): Confirm { return useContext(ConfirmationContext); }
