import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, Flag, Loader2, Play, Plus, RefreshCw, RotateCcw, Square, Trophy, Undo2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type {
  Album, Card, Challenge, ChallengeContribution, ChallengeOverview, ChallengePointVoid, ChallengeStanding,
} from '../types';

type Props = {
  cards: Card[];
  albums: Album[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  active: 'Activo',
  reviewing: 'En revisión',
  finished: 'Finalizado',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-white/10',
  active: 'bg-emerald-500/25 text-emerald-100',
  reviewing: 'bg-amber-500/25 text-amber-100',
  finished: 'bg-violet-400/25 text-violet-50',
};

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' });
}

/** ISO → valor de <input type="datetime-local"> en hora local. */
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Award = { id: number; user_id: string; position: number; premium_months: number; status: string; awarded_at: string };
type Result = { position: number; user_id: string; username: string | null; points: number; reached_at: string };

export function ChallengePanel({ cards, albums }: Props) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [overview, setOverview] = useState<ChallengeOverview | null>(null);
  const [standings, setStandings] = useState<ChallengeStanding[]>([]);
  const [voids, setVoids] = useState<ChallengePointVoid[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [endsAt, setEndsAt] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [userDetail, setUserDetail] = useState<ChallengeStanding | null>(null);

  const cardsById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const albumsById = useMemo(() => new Map(albums.map((a) => [a.id, a])), [albums]);
  const cardLabel = useCallback((id: number) => {
    const c = cardsById.get(id);
    if (!c) return `Card #${id}`;
    const a = albumsById.get(c.album_id);
    return `${c.card_name} · ${a?.short_name || a?.name || ''}`;
  }, [cardsById, albumsById]);

  const selected = challenges.find((c) => c.id === selectedId) ?? null;

  const loadChallenges = useCallback(async () => {
    const { data, error } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
    if (error) { setNotice({ kind: 'error', text: error.message }); return; }
    const list = (data || []) as Challenge[];
    setChallenges(list);
    setSelectedId((prev) => prev ?? list.find((c) => c.status === 'active')?.id ?? list[0]?.id ?? null);
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const [ov, st, vo, re, aw] = await Promise.all([
        supabase.rpc('challenge_admin_overview', { p_challenge_id: id }),
        supabase.rpc('challenge_admin_standings', { p_challenge_id: id }),
        supabase.from('challenge_point_voids').select('*').eq('challenge_id', id).order('voided_at', { ascending: false }),
        supabase.from('challenge_results').select('*').eq('challenge_id', id).order('position'),
        supabase.from('challenge_awards').select('*').eq('challenge_id', id).order('position'),
      ]);
      const err = ov.error || st.error || vo.error || re.error || aw.error;
      if (err) throw err;
      setOverview(((ov.data as ChallengeOverview[]) || [])[0] ?? null);
      setStandings((st.data as ChallengeStanding[]) || []);
      setVoids((vo.data as ChallengePointVoid[]) || []);
      setResults((re.data as Result[]) || []);
      setAwards((aw.data as Award[]) || []);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Error cargando el concurso' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadChallenges(); }, [loadChallenges]);
  useEffect(() => {
    if (selectedId != null) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);
  useEffect(() => {
    setEndsAt(toLocalInput(selected?.ends_at));
    setStartsAt('');
  }, [selected?.id, selected?.ends_at]);

  async function run(label: string, fn: () => PromiseLike<{ error: { message: string } | null; data?: unknown }>, okText: (data: unknown) => string) {
    if (!selected) return;
    if (!window.confirm(`${label}: "${selected.title}". ¿Continuar?`)) return;
    setBusy(true);
    setNotice(null);
    try {
      const { data, error } = await fn();
      if (error) throw new Error(error.message);
      setNotice({ kind: 'ok', text: okText(data) });
      await loadChallenges();
      await loadDetail(selected.id);
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Error' });
    } finally {
      setBusy(false);
    }
  }

  const hasOtherActive = challenges.some((c) => c.status === 'active' && c.id !== selectedId);

  return (
    <div className="admin-card p-6 min-w-0 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-black text-white flex items-center gap-2"><Trophy size={20} /> Community Challenge</h2>
        <select className="input max-w-sm !mt-0" value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : null)}>
          {challenges.length === 0 && <option value="">Sin concursos</option>}
          {challenges.map((c) => <option key={c.id} value={c.id}>{c.title} · {STATUS_LABEL[c.status]}</option>)}
        </select>
        <button className="btn-secondary" onClick={() => { void loadChallenges(); if (selectedId) void loadDetail(selectedId); }} disabled={loading}>
          <RefreshCw size={14} /> Recargar
        </button>
        <button className="btn-secondary" onClick={() => setShowCreate(true)}><Plus size={14} /> Nuevo concurso</button>
      </div>

      {notice && (
        <div className={`rounded-2xl px-4 py-3 text-sm flex items-start justify-between gap-3 ${notice.kind === 'ok' ? 'bg-emerald-500/15 text-emerald-100' : 'bg-red-500/15 text-red-100'}`}>
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)}><X size={14} /></button>
        </div>
      )}

      {selected && (
        <>
          <div className="rounded-3xl border border-violet-200/15 bg-white/5 p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${STATUS_COLOR[selected.status]}`}>{STATUS_LABEL[selected.status]}</span>
              <span className="font-mono text-xs text-violet-100/60">{selected.slug}</span>
              <span className="text-xs text-violet-100/70">Inicio: {fmtDate(selected.starts_at)}</span>
              <span className="text-xs text-violet-100/70">Fin: {fmtDate(selected.ends_at)}</span>
              {selected.closed_at && <span className="text-xs text-violet-100/70">Cerrado: {fmtDate(selected.closed_at)}</span>}
              {selected.finalized_at && <span className="text-xs text-violet-100/70">Finalizado: {fmtDate(selected.finalized_at)}</span>}
            </div>
            <div className="text-xs text-violet-100/70">
              Premios: {(selected.prizes || []).map((p) => `${p.place}° → ${p.months} meses Premium`).join(' · ')}
            </div>

            {overview && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                <Stat label="Cards elegibles" value={overview.eligible_cards} />
                <Stat label="Cards completadas" value={overview.completed_cards} />
                <Stat label="Imágenes aprobadas" value={overview.approved_images} />
                <Stat label="Pendientes" value={overview.pending_images} highlight={overview.pending_images > 0} />
                <Stat label="Rechazadas" value={overview.rejected_images} />
                <Stat label="Participantes" value={overview.participants} />
                <Stat label="Puntos anulados" value={overview.active_voids} />
              </div>
            )}

            <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-violet-200/10">
              {selected.status === 'draft' && (
                <>
                  <label className="block">
                    <span className="label">Inicio (vacío = ahora)</span>
                    <input type="datetime-local" className="input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                  </label>
                  <button
                    className="btn-primary disabled:opacity-60"
                    disabled={busy || hasOtherActive}
                    title={hasOtherActive ? 'Solo puede haber un concurso activo a la vez' : ''}
                    onClick={() => run('Activar concurso', () => supabase.rpc('challenge_admin_activate', {
                      p_challenge_id: selected.id,
                      p_starts_at: startsAt ? new Date(startsAt).toISOString() : null,
                    }), (n) => `Concurso activado. ${n} cards visibles quedaron elegibles.`)}
                  >
                    <Play size={15} /> Activar
                  </button>
                </>
              )}
              {(selected.status === 'draft' || selected.status === 'active') && (
                <>
                  <label className="block">
                    <span className="label">Fecha de término</span>
                    <input type="datetime-local" className="input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                  </label>
                  <button
                    className="btn-secondary"
                    disabled={busy}
                    onClick={() => run('Cambiar fecha de término', () => supabase.rpc('challenge_admin_set_end', {
                      p_challenge_id: selected.id,
                      p_ends_at: endsAt ? new Date(endsAt).toISOString() : null,
                    }), () => 'Fecha de término actualizada.')}
                  >
                    Guardar término
                  </button>
                </>
              )}
              {selected.status === 'active' && (
                <button className="btn-secondary text-amber-200" disabled={busy}
                  onClick={() => run('Cerrar concurso (pasa a revisión)', () => supabase.rpc('challenge_admin_close', { p_challenge_id: selected.id }),
                    () => 'Concurso cerrado. Modera los aportes pendientes del periodo y luego finaliza.')}>
                  <Square size={15} /> Cerrar y revisar
                </button>
              )}
              {selected.status === 'reviewing' && (
                <>
                  <button className="btn-secondary" disabled={busy}
                    onClick={() => run('Reabrir concurso', () => supabase.rpc('challenge_admin_reopen', { p_challenge_id: selected.id }), () => 'Concurso reabierto.')}>
                    <RotateCcw size={15} /> Reabrir
                  </button>
                  <button className="btn-primary disabled:opacity-60" disabled={busy}
                    onClick={() => run('Finalizar concurso (congela ranking y crea premios; no se puede deshacer)',
                      () => supabase.rpc('challenge_admin_finalize', { p_challenge_id: selected.id }),
                      (n) => `Concurso finalizado. Ranking congelado con ${n} participantes.`)}>
                    <Flag size={15} /> Finalizar
                  </button>
                  {overview && overview.pending_images > 0 && (
                    <p className="text-xs text-amber-200">Hay {overview.pending_images} aportes pendientes: finalizar fallará hasta moderarlos en Moderación → Imágenes.</p>
                  )}
                </>
              )}
            </div>
          </div>

          {selected.status === 'finished' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Table title="Ranking final" empty="Sin resultados." headers={['#', 'Usuario', 'Puntos', 'Alcanzado']}
                rows={results.map((r) => [r.position, r.username ? `@${r.username}` : r.user_id.slice(0, 8), r.points, fmtDate(r.reached_at)])} />
              <Table title="Premios" empty="Sin premios." headers={['#', 'Usuario', 'Meses', 'Estado']}
                rows={awards.map((a) => {
                  const r = results.find((x) => x.user_id === a.user_id);
                  return [a.position, r?.username ? `@${r.username}` : a.user_id.slice(0, 8), a.premium_months,
                    a.status === 'pending_activation' ? 'En espera de Premium' : a.status];
                })} />
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="font-bold text-white">Ranking en vivo</h3>
              <div className="rounded-3xl border border-violet-200/10 overflow-x-auto">
                <table className="admin-table">
                  <thead><tr><th>#</th><th>Usuario</th><th>Puntos</th><th>Alcanzado</th><th></th></tr></thead>
                  <tbody>
                    {standings.map((s) => (
                      <tr key={s.user_id}>
                        <td>{s.rank}{s.tied && <span className="text-amber-200 text-xs ml-1">empate</span>}</td>
                        <td className="font-bold">{s.username ? `@${s.username}` : s.user_id.slice(0, 8)}</td>
                        <td>{s.points}</td>
                        <td className="text-xs">{fmtDate(s.reached_at)}</td>
                        <td><button className="icon-btn" onClick={() => setUserDetail(s)}>Ver aportes</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {standings.length === 0 && <p className="text-violet-100/60 p-4">Aún no hay puntos.</p>}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-bold text-white">Puntos anulados</h3>
            <div className="rounded-3xl border border-violet-200/10 overflow-x-auto">
              <table className="admin-table">
                <thead><tr><th>Card</th><th>Usuario</th><th>Motivo</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {voids.map((v) => {
                    const st = standings.find((s) => s.user_id === v.user_id);
                    return (
                      <tr key={v.id}>
                        <td>{cardLabel(v.card_id)}</td>
                        <td>{st?.username ? `@${st.username}` : v.user_id.slice(0, 8)}</td>
                        <td className="max-w-xs break-words">{v.reason}</td>
                        <td className="text-xs">{fmtDate(v.voided_at)}</td>
                        <td className="text-xs">{v.restored_at ? `Restaurado (${v.restore_reason || ''})` : 'Anulado'}</td>
                        <td>
                          {!v.restored_at && selected.status !== 'finished' && (
                            <button className="icon-btn" disabled={busy} onClick={async () => {
                              const reason = window.prompt('Motivo de la restauración');
                              if (!reason?.trim()) return;
                              setBusy(true);
                              const { error } = await supabase.rpc('challenge_admin_restore_point', { p_void_id: v.id, p_reason: reason.trim() });
                              setBusy(false);
                              if (error) setNotice({ kind: 'error', text: error.message });
                              else { setNotice({ kind: 'ok', text: 'Punto restaurado.' }); await loadDetail(selected.id); }
                            }}>
                              <Undo2 size={14} /> Restaurar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {voids.length === 0 && <p className="text-violet-100/60 p-4">No hay puntos anulados.</p>}
            </div>
          </div>
        </>
      )}

      {loading && <p className="text-violet-100/60 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Cargando…</p>}

      {showCreate && (
        <CreateChallengeModal
          onClose={() => setShowCreate(false)}
          onCreated={async (id) => {
            setShowCreate(false);
            setNotice({ kind: 'ok', text: 'Concurso creado como borrador.' });
            await loadChallenges();
            setSelectedId(id);
          }}
        />
      )}

      {userDetail && selected && (
        <UserContributionsModal
          challenge={selected}
          standing={userDetail}
          cardLabel={cardLabel}
          voidedCardIds={new Set(voids.filter((v) => v.user_id === userDetail.user_id && !v.restored_at).map((v) => v.card_id))}
          onClose={() => setUserDetail(null)}
          onVoided={async () => { setNotice({ kind: 'ok', text: 'Punto anulado.' }); await loadDetail(selected.id); }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl px-3 py-2 ${highlight ? 'bg-amber-500/15' : 'bg-black/20'}`}>
      <div className="text-xl font-black text-white">{value}</div>
      <div className="text-[11px] text-violet-100/60">{label}</div>
    </div>
  );
}

function Table({ title, headers, rows, empty }: { title: string; headers: string[]; rows: (string | number)[][]; empty: string }) {
  return (
    <div className="space-y-2">
      <h3 className="font-bold text-white">{title}</h3>
      <div className="rounded-3xl border border-violet-200/10 overflow-x-auto">
        <table className="admin-table">
          <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
        </table>
        {rows.length === 0 && <p className="text-violet-100/60 p-4">{empty}</p>}
      </div>
    </div>
  );
}

function CreateChallengeModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('challenge_admin_create', {
      p_slug: slug.trim(),
      p_title: title.trim(),
      p_kind: 'catalog_images',
    });
    setBusy(false);
    if (rpcError) { setError(rpcError.message); return; }
    await onCreated(data as number);
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <form className="admin-card p-6 max-w-md w-full space-y-4" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3 className="text-lg font-bold text-white">Nuevo concurso</h3>
        <p className="text-sm text-violet-100/70">Se crea como borrador (los usuarios no lo ven). Al activarlo, todas las cards visibles quedan elegibles.</p>
        <label className="block">
          <span className="label">Título</span>
          <input className="input" value={title} onChange={(e) => {
            setTitle(e.target.value);
            setSlug(e.target.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
          }} required />
        </label>
        <label className="block">
          <span className="label">Slug</span>
          <input className="input font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} required />
        </label>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex gap-3">
          <button type="button" className="flex-1 btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button type="submit" className="flex-1 btn-primary disabled:opacity-60" disabled={busy || !title.trim() || !slug.trim()}>Crear</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}

function UserContributionsModal({ challenge, standing, cardLabel, voidedCardIds, onClose, onVoided }: {
  challenge: Challenge;
  standing: ChallengeStanding;
  cardLabel: (id: number) => string;
  voidedCardIds: Set<number>;
  onClose: () => void;
  onVoided: () => Promise<void>;
}) {
  const [rows, setRows] = useState<ChallengeContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error: rpcError } = await supabase.rpc('challenge_admin_contributions', {
        p_challenge_id: challenge.id,
        p_user_id: standing.user_id,
        p_status: null,
        p_limit: 500,
        p_offset: 0,
      });
      if (rpcError) setError(rpcError.message);
      else setRows((data as ChallengeContribution[]) || []);
      setLoading(false);
    })();
  }, [challenge.id, standing.user_id]);

  const canVoid = challenge.status === 'active' || challenge.status === 'reviewing';

  async function voidPoint(cardId: number) {
    const reason = window.prompt(`Motivo para anular el punto de ${cardLabel(cardId)}`);
    if (!reason?.trim()) return;
    const { error: rpcError } = await supabase.rpc('challenge_admin_void_point', {
      p_challenge_id: challenge.id,
      p_card_id: cardId,
      p_user_id: standing.user_id,
      p_reason: reason.trim(),
    });
    if (rpcError) { setError(rpcError.message); return; }
    await onVoided();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="admin-card p-6 max-w-3xl w-full space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Aportes de {standing.username ? `@${standing.username}` : standing.user_id.slice(0, 8)} · {standing.points} pts</h3>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {loading ? <p className="text-violet-100/60">Cargando…</p> : (
          <table className="admin-table">
            <thead><tr><th>Card</th><th>Lado</th><th>Estado</th><th>Subida</th><th>Suma</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.card_image_id}>
                  <td>{cardLabel(r.card_id)}</td>
                  <td>{r.side === 'back' ? 'Reverso' : 'Frente'}</td>
                  <td className="text-xs">{r.taken_down_at ? 'Retirada' : r.status}{r.rejection_reason ? ` (${r.rejection_reason})` : ''}</td>
                  <td className="text-xs">{fmtDate(r.created_at)}</td>
                  <td>{r.scores ? 'Sí' : 'No'}</td>
                  <td>
                    {canVoid && r.scores && !voidedCardIds.has(r.card_id) && (
                      <button className="icon-btn text-red-300" onClick={() => voidPoint(r.card_id)}><Ban size={14} /> Anular punto</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && rows.length === 0 && <p className="text-violet-100/60">Sin aportes en este concurso.</p>}
      </div>
    </div>,
    document.body,
  );
}
