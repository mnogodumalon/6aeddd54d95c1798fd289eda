// layout: Hub (Veranstaltung) → Interaktionen in fester Reihenfolge. Rejected widget: KanbanWidget —
// die Interaktionen sind eine nummerierte Abfolge (keine Status-Spalten), jede Zeile braucht eigene Aktionen.
import { useMemo, useState } from 'react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { flowActionFor, countOf } from '@/config/plan';
import { extractRecordId } from '@/services/livingAppsService';
import { formatDate, lookupKey } from '@/lib/formatters';
import { tx, appLabel } from '@/i18n';
import { useClock, gruss, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';
import { IconPlus, IconQrcode, IconSparkles, IconPlayerPlay, IconAlertTriangle, IconStarFilled, IconPencil, IconCircleCheck } from '@tabler/icons-react';
import type { EnrichedInteraktionen } from '@/types/enriched';

const starsOf = (v: unknown): number => {
  const k = lookupKey(v as never) ?? '';
  const n = parseInt(String(k).split('_')[1] ?? '', 10);
  return Number.isFinite(n) ? n : 0;
};

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { veranstaltungen } = data;
  const clock = useClock();
  const crud = useEntityCrud(data);
  const enrichedInteraktionen = crud.enriched.interaktionen;
  const enrichedFeedbacks = crud.enriched.feedbacks;
  const enrichedBewertungen = crud.enriched.abschlussbewertungen;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const events = useMemo(
    () => [...veranstaltungen].sort((a, b) => String(b.fields.datum ?? '').localeCompare(String(a.fields.datum ?? ''))),
    [veranstaltungen],
  );
  const event = events.find(v => v.record_id === selectedId) ?? events[0] ?? null;

  const feedbackCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of enrichedFeedbacks) {
      const id = extractRecordId(f.fields.interaktion);
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [enrichedFeedbacks]);

  const steps: EnrichedInteraktionen[] = useMemo(
    () => event
      ? enrichedInteraktionen
          .filter(i => extractRecordId(i.fields.veranstaltung) === event.record_id)
          .sort((a, b) => (a.fields.reihenfolge ?? 0) - (b.fields.reihenfolge ?? 0))
      : [],
    [enrichedInteraktionen, event],
  );
  const activeId = event ? extractRecordId(event.fields.aktive_interaktion) : null;
  const active = steps.find(s => s.record_id === activeId) ?? null;
  const bewertungen = useMemo(
    () => event ? enrichedBewertungen.filter(b => extractRecordId(b.fields.veranstaltung) === event.record_id) : [],
    [enrichedBewertungen, event],
  );
  const avg = bewertungen.length ? bewertungen.reduce((s, b) => s + starsOf(b.fields.sterne), 0) / bewertungen.length : 0;
  const totalFeedbacks = steps.reduce((s, i) => s + (feedbackCount.get(i.record_id) ?? 0), 0);

  const qrUrl = event ? `#/ansicht/qr-code?record=${event.record_id}` : '';
  const openQr = () => { if (event) window.open(qrUrl, '_blank', 'noopener'); };

  // ONE write path: the flow owns aktive_interaktion; the click opens the QR tab first (popup rule)
  const activateFor = (ia: EnrichedInteraktionen) => {
    if (!event) return null;
    const go = flowActionFor('veranstaltungen', 'aktive_interaktion', event.record_id, ia.record_id);
    if (!go) return null;
    return () => {
      openQr();
      go();
      undoToast(tx`„${ia.fields.frage ?? ''}“ ist jetzt aktiv`);
    };
  };

  const firstStep = steps[0] ?? null;
  const heroGo = !active && firstStep ? activateFor(firstStep) : null;

  const context = !event
    ? tx('Lege deine erste Veranstaltung an, dann kann es losgehen.')
    : active
      ? tx`„${event.fields.titel ?? ''}“: Gerade läuft „${active.fields.frage ?? ''}“ — ${countOf('feedbacks', feedbackCount.get(active.record_id) ?? 0, appLabel('feedbacks'))} bisher.`
      : tx`„${event.fields.titel ?? ''}“ wartet auf die erste aktive Interaktion.`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{context}</p>
        </div>
        {crud.veranstaltungen.canWrite && (
          <Button onClick={() => crud.veranstaltungen.openCreate({})}>
            <IconPlus size={16} className="shrink-0" /> {tx('Neue Veranstaltung')}
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-10 text-center">
          <IconSparkles size={48} className="text-muted-foreground" />
          <p className="max-w-md text-muted-foreground">{tx('Noch keine Veranstaltung. Lege eine an und bereite danach die Fragen für deine Teilnehmenden vor.')}</p>
          {crud.veranstaltungen.canWrite && (
            <Button onClick={() => crud.veranstaltungen.openCreate({})}>{tx('Erste Veranstaltung anlegen')}</Button>
          )}
        </div>
      ) : (
        <DashboardGrid
          variant="split"
          hero={heroGo ? (
            <HeroBanner icon={<IconAlertTriangle size={18} />} action={{ label: tx('Erste Interaktion aktivieren'), onClick: heroGo }}>
              {tx`Bei „${event?.fields.titel ?? ''}“ ist noch keine Interaktion aktiv — Teilnehmende sehen derzeit keine Frage.`}
            </HeroBanner>
          ) : undefined}
          kpis={event ? (
            <StatStrip>
              <StatStripItem title={tx('Aktive Interaktion')} value={active ? `${active.fields.reihenfolge ?? '–'} / ${steps.length}` : tx('keine')} tone={active ? 'success' : 'default'} icon={<IconPlayerPlay size={16} />} />
              <StatStripItem title={appLabel('feedbacks')} value={totalFeedbacks} icon={<IconSparkles size={16} />} />
              <StatStripItem title={tx('Ø Bewertung')} value={bewertungen.length ? avg.toFixed(1).replace('.', ',') : tx('offen')} icon={<IconStarFilled size={16} />} />
            </StatStrip>
          ) : undefined}
          aside={
            <WorkList
              title={tx('Abschlussbewertungen')}
              items={bewertungen.map(b => ({
                id: b.record_id,
                title: b.fields.kuerzel ?? tx('Ohne Kürzel'),
                secondLine: (
                  <>
                    <span className="font-medium text-amber-600">{'★'.repeat(starsOf(b.fields.sterne))}{'☆'.repeat(5 - starsOf(b.fields.sterne))}</span>
                    {b.fields.kommentar && <span className="text-muted-foreground"> · {b.fields.kommentar}</span>}
                  </>
                ),
              }))}
              max={6}
              onItemClick={id => { const r = bewertungen.find(b => b.record_id === id); if (r) crud.abschlussbewertungen.openDetail(r); }}
              empty={{ text: tx('Noch keine Abschlussbewertung — sie kommt, wenn die Teilnehmenden am Ende bewerten.') }}
            />
          }
          primary={
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap gap-2 border-b p-3">
                {events.map(v => (
                  <Button key={v.record_id} size="sm" variant={event?.record_id === v.record_id ? 'default' : 'outline'} className="max-w-full" onClick={() => setSelectedId(v.record_id)}>
                    <span className="truncate">{v.fields.titel}</span>
                  </Button>
                ))}
              </div>
              {event && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{event.fields.titel}</h2>
                    <p className="text-sm text-muted-foreground">{event.fields.datum ? formatDate(event.fields.datum) : tx('Ohne Datum')}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => crud.veranstaltungen.openDetail(event)}>{tx('Details')}</Button>
                    {crud.interaktionen.canWrite && (
                      <Button size="sm" onClick={() => crud.interaktionen.openCreate({ veranstaltung: event.record_id, reihenfolge: steps.length ? Math.max(...steps.map(s => s.fields.reihenfolge ?? 0)) + 1 : 1 })}>
                        <IconPlus size={14} className="shrink-0" /> {tx('Interaktion')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {steps.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">{tx('Diese Veranstaltung hat noch keine Interaktionen — füge die erste Frage hinzu.')}</p>
              ) : (
                <ol className="divide-y">
                  {steps.map(s => {
                    const isActive = s.record_id === activeId;
                    const n = feedbackCount.get(s.record_id) ?? 0;
                    const go = isActive ? null : activateFor(s);
                    return (
                      <li key={s.record_id} className={isActive ? 'bg-primary/5' : ''}>
                        <div className="flex flex-wrap items-center gap-3 p-4">
                          <button type="button" onClick={() => crud.interaktionen.openDetail(s)} className="flex min-w-0 flex-1 basis-56 items-start gap-3 text-left">
                            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{s.fields.reihenfolge ?? '–'}</span>
                            <span className="min-w-0">
                              <span className="line-clamp-2 font-medium">{s.fields.frage}</span>
                              <span className="mt-0.5 block text-sm text-muted-foreground">
                                {isActive && <span className="font-medium text-emerald-600">{tx('Aktiv')} · </span>}
                                {countOf('feedbacks', n, appLabel('feedbacks'))}
                                {s.fields.ki_antwort ? <> · <span className="text-foreground">{tx('KI-Antwort gespeichert')}</span></> : null}
                              </span>
                            </span>
                          </button>
                          <div className="flex flex-wrap gap-2">
                            {isActive ? (
                              <Button size="sm" variant="outline" onClick={openQr}><IconQrcode size={14} className="shrink-0" /> {tx('QR-Code')}</Button>
                            ) : go ? (
                              <Button size="sm" onClick={go}><IconPlayerPlay size={14} className="shrink-0" /> {tx('Aktiv setzen')}</Button>
                            ) : null}
                            <Button size="sm" variant="outline" asChild>
                              <a href={`#/ansicht/zusammenfassung?record=${s.record_id}`} target="_blank" rel="noopener">
                                {s.fields.zusammenfassung ? <IconCircleCheck size={14} className="shrink-0" /> : <IconSparkles size={14} className="shrink-0" />} {tx('Zusammenfassen')}
                              </a>
                            </Button>
                            {crud.interaktionen.canWrite && (
                              <Button size="sm" variant="ghost" aria-label={tx('Bearbeiten')} onClick={() => crud.interaktionen.openEdit(s)}><IconPencil size={14} /></Button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          }
        />
      )}
      {crud.surfaces}
    </div>
  );
}
