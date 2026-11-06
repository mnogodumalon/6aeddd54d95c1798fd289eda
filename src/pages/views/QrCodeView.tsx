/**
 * src/pages/views/QrCodeView.tsx — the view „QR-Code Feedback“ (beamer surface).
 *
 * ROUTE   #/ansicht/qr-code — outside the dashboard chrome.
 * LIVE    refreshes every 10 s through useLiveRecords.
 * SHOWS   the interaktionen record that veranstaltungen.aktive_interaktion points at,
 *         with the QR code of the public feedback page for that Veranstaltung.
 * CONTRACT
 *   - Zeigt den QR-Code der aktiven Interaktion der Veranstaltung.
 *   - Frage und Erläuterung stehen über dem QR-Code.
 *   - Ohne aktive Interaktion erscheint „Gerade ist keine Frage aktiv“.
 */
import { useLiveRecords } from '@/hooks/useLiveRecords';
import { tx } from '@/i18n';
import { countOf } from '@/config/plan';
import { extractRecordId } from '@/services/livingAppsService';
import { PublicPageQr } from '@/components/widgets/PublicPageQr';

export default function QrCodeView() {
  // opened for ONE record (`#/ansicht/qr-code?record=<id>`), else the control record set LAST
  const pinned = (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') ?? '').replace(/["\\]/g, '');
  const veranstaltungenControl = useLiveRecords('veranstaltungen', { intervalMs: 10000, query: pinned
    ? { filter: `r.id == "${pinned}"`, limit: 1 }
    : { filter: "r.v_aktive_interaktion is not None", orderby: ['r.updatedat desc', 'r.id desc'], limit: 1 } });
  const interaktionen = useLiveRecords('interaktionen', { intervalMs: 10000 });
  const feedbacks = useLiveRecords('feedbacks', { intervalMs: 10000 });

  const control = veranstaltungenControl.records[0] ?? null;
  const activeId = control ? extractRecordId(control.fields.aktive_interaktion) : null;
  const active = activeId ? interaktionen.records.find(r => r.record_id === activeId) ?? null : null;
  const count = active ? feedbacks.records.filter(f => extractRecordId(f.fields.interaktion) === active.record_id).length : 0;
  const loading = veranstaltungenControl.loading || interaktionen.loading;
  const live = !veranstaltungenControl.stale && !interaktionen.stale;

  const big = { fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' } as const;
  const mid = { fontSize: 'clamp(1.25rem, 2.2vh, 2.25rem)' } as const;

  return (
    <main className="flex min-h-dvh flex-col bg-background p-6 text-foreground sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-semibold" style={{ fontSize: 'clamp(2rem, 4.5vh, 4.5rem)' }}>
          {control ? control.fields.titel : tx('QR-Code Feedback')}
        </h1>
        <div className="flex items-center gap-4" style={mid}>
          <span className="inline-flex items-center gap-2" data-live-mark={live ? 'live' : 'stale'}>
            <span className={`inline-block size-3 rounded-full ${live ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {live ? tx('Live') : tx('Verbindung unterbrochen')}
          </span>
          {active && <span className="font-medium">{countOf('feedbacks', count, tx('Feedbacks'))}</span>}
        </div>
      </div>

      {active && control ? (
        <div className="mt-6 flex flex-1 flex-col items-center gap-6 text-center">
          <div className="max-w-4xl space-y-3">
            <p className="font-semibold" style={{ fontSize: 'clamp(2rem, 4.5vh, 4.5rem)' }}>{active.fields.frage}</p>
            {active.fields.erlaeuterung && (
              <p className="whitespace-pre-line text-muted-foreground" style={big}>{active.fields.erlaeuterung}</p>
            )}
          </div>
          <PublicPageQr entity="veranstaltungen" recordId={control.record_id} page="feedback-geben" size="50vh" linkClassName="text-muted-foreground" />
        </div>
      ) : (
        !loading && !veranstaltungenControl.error && !interaktionen.error && (
          <p className="mt-10" data-nothing-marked style={big}>
            {control ? tx('Gerade ist keine Frage aktiv') : tx('Nichts ausgewählt.')}
          </p>
        )
      )}

      {veranstaltungenControl.error && veranstaltungenControl.records.length === 0 && (
        <p role="alert" data-live-error className="mt-4 text-destructive" style={big}>
          {veranstaltungenControl.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
      {interaktionen.error && interaktionen.records.length === 0 && (
        <p role="alert" data-live-error className="mt-4 text-destructive" style={big}>
          {interaktionen.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      )}
    </main>
  );
}
