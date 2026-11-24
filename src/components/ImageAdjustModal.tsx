import { PointerEvent, WheelEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ADJUST_JPEG_QUALITY, ADJUST_MAX_WIDTH, REVIEW_BUCKET } from '../lib/cardImages';

/**
 * Re-encuadre de un aporte pendiente, con las mismas reglas que el
 * ImageCropper de la app: marco 2:3, la imagen siempre cubre el marco
 * (baseScale = max), zoom 1×–5× partiendo en 1.03× y sin poder arrastrarla
 * fuera del marco.
 */

const FRAME_W = 280;
const FRAME_H = 420; // 2:3
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const START_ZOOM = 1.03;

export type AdjustResult = { blob: Blob; width: number; height: number };

type Props = {
  title: string;
  subtitle?: string;
  storagePath: string;
  currentUrl: string | null;
  currentLabel: string;
  /** Texto del botón que guarda y aprueba. */
  approveLabel?: string;
  /** Formato de salida (por defecto JPEG al 75 %, como la app). */
  outputType?: 'image/jpeg' | 'image/png' | 'image/webp';
  onClose: () => void;
  onSave: (result: AdjustResult, approve: boolean) => Promise<void>;
};

export function ImageAdjustModal({
  title, subtitle, storagePath, currentUrl, currentLabel, approveLabel = 'Guardar y aprobar', outputType = 'image/jpeg', onClose, onSave,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(START_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState<'save' | 'approve' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null);

  // Se descarga el blob (y no la URL firmada) para que el canvas no quede "tainted".
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      const { data, error: dlError } = await supabase.storage.from(REVIEW_BUCKET).download(storagePath);
      if (cancelled) return;
      if (dlError || !data) {
        setError(`No pude descargar la imagen: ${dlError?.message ?? 'vacía'}`);
        return;
      }
      url = URL.createObjectURL(data);
      setSrc(url);
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [storagePath]);

  const baseScale = natural ? Math.max(FRAME_W / natural.w, FRAME_H / natural.h) : 1;
  const scale = baseScale * zoom;
  const dw = natural ? natural.w * scale : 0;
  const dh = natural ? natural.h * scale : 0;

  function clamp(o: { x: number; y: number }, z = zoom) {
    if (!natural) return o;
    const s = baseScale * z;
    const maxX = Math.max(0, (natural.w * s - FRAME_W) / 2);
    const maxY = Math.max(0, (natural.h * s - FRAME_H) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  }

  function applyZoom(next: number) {
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    setZoom(z);
    setOffset((o) => clamp(o, z));
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setOffset(clamp({ x: d.ox + e.clientX - d.x, y: d.oy + e.clientY - d.y }));
  }
  function onPointerUp() {
    drag.current = null;
  }
  function onWheel(e: WheelEvent<HTMLDivElement>) {
    applyZoom(zoom * (e.deltaY < 0 ? 1.06 : 1 / 1.06));
  }

  function reset() {
    setZoom(START_ZOOM);
    setOffset({ x: 0, y: 0 });
  }

  /** Igual que confirm() + normalizeToPhotocard() de la app. */
  async function render(): Promise<AdjustResult> {
    const img = imgRef.current;
    if (!img || !natural) throw new Error('La imagen aún no carga.');
    let cropW = FRAME_W / scale;
    let cropH = FRAME_H / scale;
    let originX = (dw / 2 - offset.x - FRAME_W / 2) / scale;
    let originY = (dh / 2 - offset.y - FRAME_H / 2) / scale;
    // Limitar al tamaño real (el redondeo puede sacar un píxel fuera).
    cropW = Math.min(cropW, natural.w);
    cropH = Math.min(cropH, natural.h);
    originX = Math.min(Math.max(0, originX), natural.w - cropW);
    originY = Math.min(Math.max(0, originY), natural.h - cropH);

    const width = Math.max(1, Math.round(Math.min(ADJUST_MAX_WIDTH, cropW)));
    const height = Math.max(1, Math.round(width * (cropH / cropW)));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('El navegador no permite generar la imagen.');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, originX, originY, cropW, cropH, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, ADJUST_JPEG_QUALITY));
    if (!blob) throw new Error('No se pudo generar la imagen.');
    return { blob, width, height };
  }

  async function save(approve: boolean) {
    setBusy(approve ? 'approve' : 'save');
    setError(null);
    try {
      await onSave(await render(), approve);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando el ajuste');
    } finally {
      setBusy(null);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 overflow-y-auto" onClick={() => !busy && onClose()}>
      <div className="admin-card p-6 w-full max-w-3xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Ajustar encuadre · {title}</h3>
            {subtitle && <p className="text-xs text-violet-100/70 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} disabled={Boolean(busy)} className="text-violet-100/70 hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-violet-100/80">{currentLabel}</div>
            <div className="rounded-xl bg-black/25 flex items-center justify-center overflow-hidden" style={{ width: FRAME_W, height: FRAME_H }}>
              {currentUrl ? (
                <img src={currentUrl} alt="Actual" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-violet-100/40">Sin imagen</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs font-bold text-violet-100/80">Nueva (arrastra para mover, rueda para zoom)</div>
            <div
              className="relative rounded-xl bg-black/40 overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none ring-2 ring-fuchsia-400/70"
              style={{ width: FRAME_W, height: FRAME_H }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onWheel={onWheel}
            >
              {src ? (
                <img
                  ref={imgRef}
                  src={src}
                  alt="Aporte"
                  draggable={false}
                  onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                  className="absolute max-w-none pointer-events-none"
                  style={natural ? { width: dw, height: dh, left: FRAME_W / 2 - dw / 2 + offset.x, top: FRAME_H / 2 - dh / 2 + offset.y } : { opacity: 0 }}
                />
              ) : (
                !error && <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-violet-100/60" /></div>
              )}
            </div>
            <div className="flex items-center gap-2" style={{ width: FRAME_W }}>
              <button type="button" className="icon-btn !p-1.5" onClick={() => applyZoom(zoom - 0.1)} disabled={!natural}><Minus size={14} /></button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => applyZoom(Number(e.target.value))}
                className="flex-1 accent-fuchsia-500"
                disabled={!natural}
              />
              <button type="button" className="icon-btn !p-1.5" onClick={() => applyZoom(zoom + 0.1)} disabled={!natural}><Plus size={14} /></button>
              <button type="button" className="icon-btn !p-1.5" onClick={reset} disabled={!natural} title="Restablecer"><RotateCcw size={14} /></button>
            </div>
            <div className="text-[11px] text-violet-100/60">
              {zoom.toFixed(2)}× · se guarda en {outputType === 'image/jpeg' ? 'JPEG' : outputType === 'image/png' ? 'PNG' : 'WebP'} de máx. {ADJUST_MAX_WIDTH}×{ADJUST_MAX_WIDTH * 1.5}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button type="button" className="flex-1 btn-secondary" onClick={onClose} disabled={Boolean(busy)}>Cancelar</button>
          <button type="button" className="flex-1 btn-secondary disabled:opacity-60" onClick={() => save(false)} disabled={Boolean(busy) || !natural}>
            {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : null} Guardar ajuste
          </button>
          <button type="button" className="flex-1 btn-primary disabled:opacity-60" onClick={() => save(true)} disabled={Boolean(busy) || !natural}>
            {busy === 'approve' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {approveLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
