import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Eraser, ImagePlus, PenLine, ScanSearch, Send, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { ImportedCropFile } from '../types';

const MEMBERS = ['rm', 'jin', 'suga', 'jhope', 'jimin', 'v', 'jungkook', 'group'] as const;

type Rect = { x: number; y: number; w: number; h: number };
type DetectedRect = Rect & { dx: number; dy: number; dw: number; dh: number };
type CropItem = {
  index: number;
  member: string;
  filename: string;
  url: string;
};

type Props = {
  onSendToBulk: (files: ImportedCropFile[]) => void;
};

export function CropperPanel({ onSendToBulk }: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageUrlRef = useRef<string | null>(null);

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<Rect | null>(null);
  const [manualDraft, setManualDraft] = useState<Rect | null>(null);
  const [detectedBoxes, setDetectedBoxes] = useState<DetectedRect[]>([]);
  const [crops, setCrops] = useState<CropItem[]>([]);
  const [padding, setPadding] = useState(2);
  const [minArea, setMinArea] = useState(20000);
  const [whiteThreshold, setWhiteThreshold] = useState(245);
  const [status, setStatus] = useState('Esperando imagen.');
  const [zoom, setZoom] = useState(1);
  const [renderedSize, setRenderedSize] = useState<{ w: number; h: number } | null>(null);

  const canDetect = mode === 'auto' && imageReady && selection && selection.w > 10 && selection.h > 10;
  const canSend = crops.length > 0;

  useEffect(() => {
    return () => {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!imageReady) return;
    syncOverlaySize();
    const onResize = () => syncOverlaySize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [imageReady, selection, detectedBoxes, zoom]);

  const cropFiles = useMemo(() => crops.map((crop) => dataUrlToFile(crop.url, crop.filename)), [crops]);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
    const url = URL.createObjectURL(file);
    imageUrlRef.current = url;
    setImageSrc(url);
    setImageReady(false);
    setSelection(null);
    setManualDraft(null);
    setDetectedBoxes([]);
    setCrops([]);
    setZoom(1);
    setRenderedSize(null);
    setStatus('Cargando imagen...');
  }

  function onImageLoad() {
    setImageReady(true);
    requestAnimationFrame(() => {
      const img = imageRef.current;
      if (img) setRenderedSize({ w: img.offsetWidth, h: img.offsetHeight });
      syncOverlaySize();
      setStatus(
        mode === 'manual'
          ? 'Imagen cargada. Arrastra sobre cada photocard para marcarla.'
          : 'Imagen cargada. Arrastra un rectángulo sobre el bloque de photocards.',
      );
    });
  }

  function syncOverlaySize() {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;

    canvas.width = Math.max(1, Math.round(image.offsetWidth));
    canvas.height = Math.max(1, Math.round(image.offsetHeight));
    canvas.style.width = `${image.offsetWidth}px`;
    canvas.style.height = `${image.offsetHeight}px`;
    redraw();
  }

  function redraw(nextSelection = selection, nextBoxes = detectedBoxes, nextDraft: Rect | null = null) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (nextSelection) {
      roundedPath(ctx, nextSelection.x, nextSelection.y, nextSelection.w, nextSelection.h, 12);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.14)';
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    for (const b of nextBoxes) {
      roundedPath(ctx, b.dx, b.dy, b.dw, b.dh, 12);
      ctx.strokeStyle = '#c4b5fd';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (nextDraft && nextDraft.w > 2 && nextDraft.h > 2) {
      roundedPath(ctx, nextDraft.x, nextDraft.y, nextDraft.w, nextDraft.h, 8);
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function getPosition(evt: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp(evt.clientX - rect.left, 0, rect.width),
      y: clamp(evt.clientY - rect.top, 0, rect.height),
    };
  }

  function onPointerDown(evt: PointerEvent<HTMLCanvasElement>) {
    if (!imageReady) return;
    const p = getPosition(evt);
    setDragging(true);
    setStart(p);
    if (mode === 'auto') {
      const next = { x: p.x, y: p.y, w: 0, h: 0 };
      setSelection(next);
      redraw(next);
    } else {
      setManualDraft({ x: p.x, y: p.y, w: 0, h: 0 });
    }
  }

  function onPointerMove(evt: PointerEvent<HTMLCanvasElement>) {
    if (!dragging || !start) return;
    const p = getPosition(evt);
    const next = {
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    };
    if (mode === 'auto') {
      setSelection(next);
      redraw(next);
    } else {
      setManualDraft(next);
      redraw(selection, detectedBoxes, next);
    }
  }

  function finishSelection() {
    if (!dragging) return;
    setDragging(false);
    if (mode === 'manual') {
      finishManualCrop();
      return;
    }
    if (!selection || selection.w < 10 || selection.h < 10) {
      setSelection(null);
      redraw(null);
      return;
    }
    setStatus('Selección lista. Ahora haz clic en Detectar photocards.');
  }

  function finishManualCrop() {
    const draft = manualDraft;
    setManualDraft(null);
    if (!draft || draft.w < 10 || draft.h < 10) {
      redraw(selection, detectedBoxes, null);
      return;
    }

    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;

    const scaleX = image.naturalWidth / canvas.width;
    const scaleY = image.naturalHeight / canvas.height;

    const naturalX = Math.round(draft.x * scaleX);
    const naturalY = Math.round(draft.y * scaleY);
    const naturalW = Math.round(draft.w * scaleX);
    const naturalH = Math.round(draft.h * scaleY);

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = naturalW;
    cropCanvas.height = naturalH;
    cropCanvas.getContext('2d')?.drawImage(image, naturalX, naturalY, naturalW, naturalH, 0, 0, naturalW, naturalH);

    const newIndex = crops.length;
    const member = MEMBERS[newIndex] || 'rm';
    const newCrop: CropItem = {
      index: newIndex,
      member,
      filename: `${member}.png`,
      url: cropCanvas.toDataURL('image/png'),
    };
    const newBox: DetectedRect = {
      x: naturalX,
      y: naturalY,
      w: naturalW,
      h: naturalH,
      dx: draft.x,
      dy: draft.y,
      dw: draft.w,
      dh: draft.h,
    };

    const nextCrops = recomputeFilenames([...crops, newCrop]);
    const nextBoxes = [...detectedBoxes, newBox];
    setCrops(nextCrops);
    setDetectedBoxes(nextBoxes);
    redraw(selection, nextBoxes, null);
    setStatus(`Photocard marcada manualmente (${nextCrops.length} total). Sigue arrastrando para añadir más.`);
  }

  function clearAll() {
    setSelection(null);
    setManualDraft(null);
    setDetectedBoxes([]);
    setCrops([]);
    redraw(null, []);
    setStatus(imageReady ? 'Selección limpiada.' : 'Esperando imagen.');
  }

  function deleteCrop(cropIndex: number) {
    const nextCrops = recomputeFilenames(
      crops.filter((_, i) => i !== cropIndex).map((c, i) => ({ ...c, index: i })),
    );
    const nextBoxes = detectedBoxes.filter((_, i) => i !== cropIndex);
    setCrops(nextCrops);
    setDetectedBoxes(nextBoxes);
    redraw(selection, nextBoxes);
    setStatus(`Recorte eliminado. Quedan ${nextCrops.length} photocards.`);
  }

  function detectCards() {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas || !selection) {
      setStatus('Primero sube una imagen y haz una selección.');
      return;
    }

    const displayW = canvas.width;
    const displayH = canvas.height;
    const scaleX = image.naturalWidth / displayW;
    const scaleY = image.naturalHeight / displayH;

    const roi = {
      x: Math.round(selection.x * scaleX),
      y: Math.round(selection.y * scaleY),
      w: Math.round(selection.w * scaleX),
      h: Math.round(selection.h * scaleY),
    };

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = roi.w;
    tempCanvas.height = roi.h;
    const tctx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tctx) return;
    tctx.drawImage(image, roi.x, roi.y, roi.w, roi.h, 0, 0, roi.w, roi.h);

    const imgData = tctx.getImageData(0, 0, roi.w, roi.h);
    const data = imgData.data;
    const visited = new Uint8Array(roi.w * roi.h);
    const candidates: Rect[] = [];
    const stack: Array<[number, number]> = [];
    const areaMin = Math.max(1000, minArea);
    const threshold = clamp(whiteThreshold, 180, 254);

    const isCardPixel = (pos4: number) => data[pos4] <= threshold || data[pos4 + 1] <= threshold || data[pos4 + 2] <= threshold;

    for (let y = 0; y < roi.h; y += 1) {
      for (let x = 0; x < roi.w; x += 1) {
        const pos = y * roi.w + x;
        if (visited[pos]) continue;
        visited[pos] = 1;
        const idx = pos * 4;
        if (!isCardPixel(idx)) continue;

        let minX = x;
        let minY = y;
        let maxX = x;
        let maxY = y;
        stack.push([x, y]);

        while (stack.length) {
          const [cx, cy] = stack.pop()!;
          const p = cy * roi.w + cx;
          const i = p * 4;
          if (!isCardPixel(i)) continue;

          minX = Math.min(minX, cx);
          minY = Math.min(minY, cy);
          maxX = Math.max(maxX, cx);
          maxY = Math.max(maxY, cy);

          const neighbors: Array<[number, number]> = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
          for (const [nx, ny] of neighbors) {
            if (nx < 0 || ny < 0 || nx >= roi.w || ny >= roi.h) continue;
            const np = ny * roi.w + nx;
            if (visited[np]) continue;
            visited[np] = 1;
            stack.push([nx, ny]);
          }
        }

        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const aspect = w / h;
        const area = w * h;

        if (area >= areaMin && w >= 80 && h >= 140 && aspect >= 0.45 && aspect <= 1.05 && w <= roi.w * 0.72 && h <= roi.h * 0.98) {
          candidates.push({ x: minX, y: minY, w, h });
        }
      }
    }

    const ordered = orderBoxes(dedupeBoxes(candidates));
    const nextCrops: CropItem[] = [];
    const nextBoxes: DetectedRect[] = [];

    for (let i = 0; i < ordered.length; i += 1) {
      const b = ordered[i];
      const px = Math.max(0, b.x - padding);
      const py = Math.max(0, b.y - padding);
      const pw = Math.min(roi.w - px, b.w + padding * 2);
      const ph = Math.min(roi.h - py, b.h + padding * 2);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = pw;
      cropCanvas.height = ph;
      cropCanvas.getContext('2d')?.drawImage(tempCanvas, px, py, pw, ph, 0, 0, pw, ph);

      const member = MEMBERS[i] || 'rm';
      nextCrops.push({
        index: i,
        member,
        filename: `${member}.png`,
        url: cropCanvas.toDataURL('image/png'),
      });

      nextBoxes.push({
        x: px,
        y: py,
        w: pw,
        h: ph,
        dx: (roi.x + px) / scaleX,
        dy: (roi.y + py) / scaleY,
        dw: pw / scaleX,
        dh: ph / scaleY,
      });
    }

    setCrops(recomputeFilenames(nextCrops));
    setDetectedBoxes(nextBoxes);
    redraw(selection, nextBoxes);
    setStatus(nextCrops.length ? `Listo. Detecté ${nextCrops.length} photocards. Revisa el miembro de cada recorte antes de descargar o enviar.` : 'No detecté photocards. Prueba una selección más ajustada o baja el Min area.');
  }

  function updateCropMember(index: number, member: string) {
    setCrops((current) => recomputeFilenames(current.map((crop) => crop.index === index ? { ...crop, member } : crop)));
  }

  function downloadOne(crop: CropItem) {
    const a = document.createElement('a');
    a.href = crop.url;
    a.download = crop.filename;
    a.click();
  }

  async function downloadAll() {
    for (const crop of crops) {
      downloadOne(crop);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  function sendToBulk() {
    onSendToBulk(cropFiles);
  }

  function zoomIn() { setZoom((z) => Math.min(4, parseFloat((z + 0.25).toFixed(2)))); }
  function zoomOut() { setZoom((z) => Math.max(0.5, parseFloat((z - 0.25).toFixed(2)))); }
  function resetZoom() { setZoom(1); }

  // Tamaño físico del wrapper de imagen: base × zoom (genera scroll real en el contenedor)
  const wrapperStyle = renderedSize && zoom !== 1
    ? { width: renderedSize.w * zoom, height: renderedSize.h * zoom, flexShrink: 0 as const }
    : { display: 'inline-block' as const };

  // La imagen llena el wrapper cuando tiene dimensiones explícitas
  const imageExplicit = renderedSize && zoom !== 1
    ? { width: '100%', height: '100%', maxHeight: 'none' as const, maxWidth: 'none' as const }
    : undefined;

  const instructionText = mode === 'manual'
    ? 'Modo manual: arrastra sobre cada photocard individualmente para marcarla.'
    : 'Flujo: subir imagen → arrastrar selección sobre las PCs → detectar → revisar nombres → enviar a carga masiva.';

  return (
    <section className="grid xl:grid-cols-[1.35fr_0.8fr] gap-6">
      <div className="rounded-[2rem] border border-violet-300/20 bg-[#210c36]/85 shadow-2xl shadow-black/20 backdrop-blur p-6 text-violet-50">
        <div>
          <h2 className="text-2xl font-black">Photocard Cropper Web</h2>
          <p className="mt-2 text-sm text-violet-100/90 leading-6">
            Recorta templates completos, asigna nombres como <b>rm.png</b>, <b>jin.png</b>, <b>jhope.png</b> y envía los archivos directo a la carga masiva del mantenedor.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-2xl border border-violet-200/20">
            <button
              type="button"
              onClick={() => setMode('auto')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold transition ${mode === 'auto' ? 'bg-fuchsia-700 text-white' : 'bg-violet-950/70 text-violet-300 hover:bg-violet-900/50'}`}
            >
              <ScanSearch size={15} /> Auto
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold transition ${mode === 'manual' ? 'bg-emerald-600 text-white' : 'bg-violet-950/70 text-violet-300 hover:bg-violet-900/50'}`}
            >
              <PenLine size={15} /> Manual
            </button>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-violet-200/20 bg-violet-900/70 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-800">
            <ImagePlus size={18} /> Subir template
            <input className="hidden" type="file" accept="image/*" onChange={handleFile} />
          </label>
          {mode === 'auto' && (
            <button type="button" disabled={!canDetect} onClick={detectCards} className="inline-flex items-center gap-2 rounded-2xl border border-violet-200/20 bg-fuchsia-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-45">
              <ScanSearch size={18} /> Detectar photocards
            </button>
          )}
          <button type="button" onClick={clearAll} className="inline-flex items-center gap-2 rounded-2xl border border-violet-200/20 bg-violet-950/70 px-4 py-3 text-sm font-bold text-white">
            <Eraser size={18} /> Limpiar
          </button>
          <button type="button" disabled={!canSend} onClick={downloadAll} className="inline-flex items-center gap-2 rounded-2xl border border-violet-200/20 bg-violet-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-45">
            <Download size={18} /> Descargar todas
          </button>
          <button type="button" disabled={!canSend} onClick={sendToBulk} className="inline-flex items-center gap-2 rounded-2xl border border-pink-200/30 bg-pink-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-45">
            <Send size={18} /> Enviar a carga masiva
          </button>
          {imageReady && (
            <div className="flex items-center overflow-hidden rounded-2xl border border-violet-200/20 bg-violet-950/70">
              <button type="button" onClick={zoomOut} disabled={zoom <= 0.5} title="Alejar" className="px-3 py-2.5 text-violet-300 transition hover:bg-violet-900/50 disabled:opacity-40">
                <ZoomOut size={16} />
              </button>
              <button type="button" onClick={resetZoom} title="Restablecer zoom" className="min-w-[3.5rem] text-center text-xs font-bold text-violet-200 hover:text-white transition">
                {Math.round(zoom * 100)}%
              </button>
              <button type="button" onClick={zoomIn} disabled={zoom >= 4} title="Acercar" className="px-3 py-2.5 text-violet-300 transition hover:bg-violet-900/50 disabled:opacity-40">
                <ZoomIn size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 rounded-3xl border border-violet-200/15 bg-black/35 p-4">
          {/* Stage: tamaño fijo capturado al cargar (zoom=1). NUNCA crece. */}
          <div
            ref={stageRef}
            className="relative rounded-2xl bg-black/75"
            style={{ minHeight: 430, height: renderedSize?.h, maxHeight: '72vh' }}
          >
            {/* Viewport de scroll: absolutamente posicionado → mismo tamaño que stage siempre,
                el scrollbar no afecta el tamaño del stage padre */}
            <div className="absolute inset-0 overflow-auto">
              {/* Capa de centrado: min-h/w 100% para centrar cuando la imagen es pequeña */}
              <div className="flex min-h-full min-w-full items-center justify-center">
                {!imageSrc && <div className="px-6 text-center text-sm text-violet-100/75">Sube una imagen para empezar.</div>}
                {imageSrc && (
                  <div style={{ ...wrapperStyle, position: 'relative' }}>
                    <img
                      ref={imageRef}
                      src={imageSrc}
                      onLoad={onImageLoad}
                      alt="Template para recortar"
                      className="block max-h-[72vh] max-w-full select-none"
                      style={imageExplicit}
                      draggable={false}
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute inset-0 cursor-crosshair"
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={finishSelection}
                      onPointerLeave={finishSelection}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-violet-100/80">{instructionText}</p>
          <p className="mt-2 text-sm font-semibold text-white">{status}</p>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-[2rem] border border-violet-300/20 bg-[#31124f]/90 p-6 text-violet-50 shadow-xl shadow-black/10">
          <h3 className="text-xl font-black">Ajustes</h3>
          <Range label="Padding" value={padding} min={0} max={30} onChange={setPadding} suffix="px" />
          {mode === 'auto' && (
            <>
              <NumberField label="Min area" value={minArea} onChange={setMinArea} min={1000} step={1000} />
              <NumberField label="White threshold" value={whiteThreshold} onChange={setWhiteThreshold} min={180} max={254} />
            </>
          )}
          <div className="mt-4 rounded-2xl border border-violet-200/15 bg-violet-900/35 px-4 py-3 text-xs leading-5 text-violet-100">
            Opciones de nombre: rm, jin, suga, jhope, jimin, v, jungkook, group.
          </div>
        </div>

        <div className="rounded-[2rem] border border-violet-300/20 bg-[#31124f]/90 p-6 text-violet-50 shadow-xl shadow-black/10">
          <h3 className="text-xl font-black">Recortes</h3>
          {crops.length === 0 ? (
            <p className="mt-3 text-sm text-violet-100/75">Aquí aparecerán las photocards detectadas.</p>
          ) : (
            <div className="mt-4 grid max-h-[70vh] grid-cols-2 gap-3 overflow-auto pr-1 max-sm:grid-cols-1">
              {crops.map((crop, i) => (
                <article key={crop.index} className="rounded-3xl border border-violet-200/15 bg-violet-950/45 p-3">
                  <div className="relative">
                    <img src={crop.url} alt={crop.filename} className="aspect-[2.8/4] w-full rounded-2xl object-cover" />
                    <button
                      type="button"
                      onClick={() => deleteCrop(i)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white/80 hover:bg-red-600/80 hover:text-white transition"
                      title="Eliminar recorte"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <label className="mt-3 block text-xs font-bold text-violet-100">
                    Miembro
                    <select className="mt-1 w-full rounded-xl border border-violet-200/15 bg-[#230c38] px-3 py-2 text-sm text-white outline-none" value={crop.member} onChange={(e) => updateCropMember(crop.index, e.target.value)}>
                      {MEMBERS.map((member) => <option key={member} value={member}>{member}</option>)}
                    </select>
                  </label>
                  <div className="mt-2 break-all text-xs text-violet-100/80">{crop.filename}</div>
                  <button type="button" onClick={() => downloadOne(crop)} className="mt-3 w-full rounded-xl bg-violet-700 px-3 py-2 text-xs font-bold text-white">Descargar</button>
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>
    </section>
  );
}

function Range({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label className="mt-4 block text-sm font-bold text-violet-100">
      {label}: {value}{suffix || ''}
      <input className="mt-2 w-full accent-fuchsia-400" type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number; min?: number; max?: number; step?: number; onChange: (value: number) => void }) {
  return (
    <label className="mt-4 block text-sm font-bold text-violet-100">
      {label}
      <input className="mt-2 w-full rounded-xl border border-violet-200/15 bg-[#230c38] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-violet-400/40" type="number" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function intersectionOverUnion(a: Rect, b: Rect) {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(ax2, bx2);
  const y2 = Math.min(ay2, by2);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union ? inter / union : 0;
}

function dedupeBoxes(boxes: Rect[]) {
  const sorted = [...boxes].sort((a, b) => (b.w * b.h) - (a.w * a.h));
  const kept: Rect[] = [];
  for (const box of sorted) {
    if (kept.every((k) => intersectionOverUnion(box, k) < 0.3)) kept.push(box);
  }
  return kept;
}

function orderBoxes(boxes: Rect[]) {
  const sorted = [...boxes].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: Array<{ y: number; items: Rect[] }> = [];
  for (const box of sorted) {
    let row = rows.find((r) => Math.abs(r.y - box.y) < Math.max(30, box.h * 0.35));
    if (!row) {
      row = { y: box.y, items: [] };
      rows.push(row);
    }
    row.items.push(box);
    row.y = (row.y + box.y) / 2;
  }
  return rows.flatMap((row) => row.items.sort((a, b) => a.x - b.x));
}

function recomputeFilenames(items: CropItem[]): CropItem[] {
  const seen: Record<string, number> = {};
  return items.map((item) => {
    seen[item.member] = (seen[item.member] || 0) + 1;
    const n = seen[item.member];
    const filename = n === 1 ? `${item.member}.png` : `${item.member}_${n}.png`;
    return { ...item, filename };
  });
}

function dataUrlToFile(dataUrl: string, filename: string) {
  const [meta, data] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] || 'image/png';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { fileName: filename, file: new File([bytes], filename, { type: mime }) };
}
