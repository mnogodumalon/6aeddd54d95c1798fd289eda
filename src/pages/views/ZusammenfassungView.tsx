/**
 * src/pages/views/ZusammenfassungView.tsx — the view „Zusammenfassung“.
 *
 * ROUTE   #/ansicht/zusammenfassung?record=<interaktion id> — outside the dashboard chrome.
 * LIVE    static — loads once.
 * SHOWS   exactly the Interaktion the overview's „Zusammenfassen“ was pressed on.
 * COMPOSE Vorprompt, then every Feedback of the Interaktion with its Kürzel, then Endprompt —
 *         when the stored text is empty; „Neu zusammenführen“ rebuilds it after a second click.
 * EDITS   interaktionen.zusammenfassung and interaktionen.ki_antwort, saved by themselves.
 */
import { useLiveRecords } from '@/hooks/useLiveRecords';
import { tx } from '@/i18n';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { ViewTextEditor } from '@/components/blocks/ViewTextEditor';

export default function ZusammenfassungView() {
  const pinned = (new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('record') ?? '').replace(/["\\]/g, '');
  const interaktionen = useLiveRecords('interaktionen', { intervalMs: 0 });
  const feedbacks = useLiveRecords('feedbacks', { intervalMs: 0 });
  const ia = interaktionen.records.find(r => r.record_id === pinned) ?? null;
  const own = ia ? feedbacks.records.filter(f => extractRecordId(f.fields.interaktion) === ia.record_id) : [];
  const failed = [interaktionen, feedbacks].some(x => x.error);
  const big = { fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' } as const;

  const compose = (): string | null => {
    if (!ia || interaktionen.loading || feedbacks.loading) return null;
    const parts: string[] = [];
    if (ia.fields.vorprompt?.trim()) parts.push(ia.fields.vorprompt.trim());
    parts.push(own.map(f => `${f.fields.kuerzel ?? '–'}: ${(f.fields.feedback_text ?? '').trim()}`).join('\n\n'));
    if (ia.fields.endprompt?.trim()) parts.push(ia.fields.endprompt.trim());
    return parts.join('\n\n');
  };

  return (
    <main className="flex min-h-dvh flex-col gap-6 bg-background p-6 text-foreground sm:p-10">
      <h1 className="font-semibold" style={{ fontSize: 'clamp(2rem, 4.5vh, 4.5rem)' }}>{tx('Zusammenfassung')}</h1>
      {ia ? (
        <>
          <div className="space-y-2">
            <p className="font-semibold" style={big}>{ia.fields.frage}</p>
            {ia.fields.erlaeuterung && <p className="whitespace-pre-line text-muted-foreground" style={{ fontSize: 'clamp(1.25rem, 2.2vh, 2.25rem)' }}>{ia.fields.erlaeuterung}</p>}
          </div>
          <ViewTextEditor
            field="zusammenfassung"
            recordId={ia.record_id}
            value={ia.fields.zusammenfassung ?? ''}
            save={async text => {
              await LivingAppsService.updateInteraktionenEntry(ia.record_id, { zusammenfassung: text });
              interaktionen.apply(ia.record_id, { zusammenfassung: text });
            }}
            compose={compose}
            blocked={failed ? tx('Die Daten konnten nicht geladen werden — es wird nichts zusammengeführt oder gespeichert.') : null}
          />
          <h2 className="font-semibold" style={{ fontSize: 'clamp(1.5rem, 2.8vh, 3rem)' }}>{tx('Antwort der KI')}</h2>
          <ViewTextEditor
            field="ki_antwort"
            recordId={ia.record_id}
            value={ia.fields.ki_antwort ?? ''}
            save={async text => {
              await LivingAppsService.updateInteraktionenEntry(ia.record_id, { ki_antwort: text });
              interaktionen.apply(ia.record_id, { ki_antwort: text });
            }}
            blocked={failed ? tx('Die Daten konnten nicht geladen werden — es wird nichts zusammengeführt oder gespeichert.') : null}
          />
        </>
      ) : (
        !interaktionen.loading && !interaktionen.error && (
          <p style={big} data-nothing-marked>{tx('Nichts ausgewählt.')}</p>
        )
      )}
      {[interaktionen, feedbacks].map((x, i) => x.error && x.records.length === 0 && (
        <p key={i} role="alert" data-live-error className="text-destructive" style={big}>
          {x.unauthorized ? tx('Bitte melde dich an, um diese Ansicht zu sehen.') : tx('Die Daten konnten nicht geladen werden.')}
        </p>
      ))}
    </main>
  );
}
