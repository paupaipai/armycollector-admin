import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle2, Loader2, Send, XCircle } from 'lucide-react';
import { sendPushNotification } from '../lib/notifications';
import type { NotificationData } from '../lib/notifications';

type Props = {
  title: string;
  body: string;
  data: NotificationData;
  disabled?: boolean;
  label?: string;
};

type Phase = 'idle' | 'confirm' | 'sending' | 'success' | 'error';

export function SendNotificationButton({ title, body, data, disabled, label = 'Enviar notificación' }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [resultMessage, setResultMessage] = useState('');
  const [editTitle, setEditTitle] = useState(title);
  const [editBody, setEditBody] = useState(body);

  function openConfirm() {
    setEditTitle(title);
    setEditBody(body);
    setPhase('confirm');
  }

  async function confirmSend() {
    setPhase('sending');
    try {
      const result = await sendPushNotification({ title: editTitle.trim(), body: editBody.trim(), data });
      const sent = result?.sent ?? 0;
      setResultMessage(`Notificación enviada a ${sent} usuario${sent === 1 ? '' : 's'}.`);
      setPhase('success');
    } catch (err) {
      setResultMessage(err instanceof Error ? err.message : 'No se pudo enviar la notificación.');
      setPhase('error');
    }
  }

  function close() {
    setPhase('idle');
  }

  const canSend = editTitle.trim().length > 0 && editBody.trim().length > 0;

  return (
    <>
      <button type="button" className="btn-secondary" disabled={disabled} onClick={openConfirm}>
        <Bell size={16} /> {label}
      </button>

      {phase !== 'idle' && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="flex flex-col items-center gap-4 rounded-[2rem] bg-[#210c36] border border-violet-300/20 px-10 py-8 shadow-2xl shadow-black/40 max-w-sm w-full text-center">
            {phase === 'confirm' && (
              <>
                <Bell size={40} className="text-fuchsia-400" />
                <p className="text-lg font-bold text-white">¿Enviar notificación a todos los usuarios?</p>
                <div className="w-full space-y-3 text-left">
                  <label className="block">
                    <span className="label">Título</span>
                    <input
                      className="input"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      maxLength={100}
                    />
                  </label>
                  <label className="block">
                    <span className="label">Mensaje</span>
                    <textarea
                      className="input resize-none"
                      rows={3}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      maxLength={200}
                    />
                  </label>
                </div>
                <div className="flex gap-3 w-full">
                  <button type="button" className="btn-secondary flex-1" onClick={close}>Cancelar</button>
                  <button type="button" className="btn-primary flex-1" onClick={confirmSend} disabled={!canSend}>
                    <Send size={16} /> Enviar
                  </button>
                </div>
              </>
            )}

            {phase === 'sending' && (
              <>
                <Loader2 size={40} className="text-fuchsia-400 animate-spin" />
                <p className="text-lg font-bold text-white">Enviando notificación...</p>
              </>
            )}

            {phase === 'success' && (
              <>
                <CheckCircle2 size={48} className="text-fuchsia-400" />
                <p className="text-lg font-bold text-white">{resultMessage}</p>
                <button type="button" className="btn-secondary" onClick={close}>Cerrar</button>
              </>
            )}

            {phase === 'error' && (
              <>
                <XCircle size={48} className="text-red-400" />
                <p className="text-lg font-bold text-white">No se pudo enviar</p>
                <p className="text-sm text-red-200/90">{resultMessage}</p>
                <button type="button" className="btn-secondary" onClick={close}>Cerrar</button>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
