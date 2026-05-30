import { useEffect, useRef } from 'react';
import { CheckCircle } from 'lucide-react';

type Status = 'saving' | 'success' | null;

type Props = {
  status: Status;
  message?: string;
  onClose: () => void;
};

export function SaveToast({ status, message = '¡Cambio guardado exitosamente!', onClose }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === 'success') {
      timerRef.current = setTimeout(() => onClose(), 2000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, onClose]);

  if (!status) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-[2rem] bg-[#210c36] border border-violet-300/20 px-10 py-8 shadow-2xl shadow-black/40">
        {status === 'saving' ? (
          <>
            <div className="h-12 w-12 rounded-full border-4 border-violet-300/30 border-t-fuchsia-500 animate-spin" />
            <p className="text-lg font-bold text-white">Guardando...</p>
          </>
        ) : (
          <>
            <CheckCircle size={48} className="text-fuchsia-400" />
            <p className="text-lg font-bold text-white">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}
