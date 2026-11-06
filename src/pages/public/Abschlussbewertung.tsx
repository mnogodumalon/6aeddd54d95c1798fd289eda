import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicShell } from '@/components/PublicShell';
import { Button } from '@/components/ui/button';
import { Bound } from '@/components/blocks/Bound';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import { LoadProblem } from '@/components/blocks/LoadProblem';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import {
  loadPublicPagesConfig,
  prepareChallenge,
  type PublicPagesConfig,
  type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  fieldText,
  useJourneySubmit,
  useLiveList,
  useStepForm,
  useVisitorKey,
} from '@/lib/journey';
import { tx } from '@/i18n';

const SLUG = 'abschlussbewertung';

function RatingForm({ cfg, page }: { cfg: PublicPagesConfig; page: PublicPageConfig }) {
  const [params] = useSearchParams();
  const veranstaltungId = params.get('veranstaltung') ?? '';
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);
  const kuerzel = useVisitorKey();
  const live = useLiveList(port, 'veranstaltungen', { intervalMs: 0, enabled: !!veranstaltungId });
  const [consentError, setConsentError] = useState<string | null>(null);

  const f = useStepForm('abschlussbewertungen', {
    fields: ['sterne', 'kommentar', 'email', 'einwilligung'],
    required: { sterne: true, kommentar: false, email: false, einwilligung: false },
    autoComplete: true,
    messages: { sterne: tx('Bitte wähle eine Sternebewertung.') },
  });

  const email = String(f.get('email') ?? '').trim();
  const consent = f.get('einwilligung') === true;

  const submit = useJourneySubmit(
    port,
    [
      {
        key: 'bewertung',
        entity: 'abschlussbewertungen',
        form: f,
        primary: true,
        values: () => ({ veranstaltung: veranstaltungId, kuerzel }),
      },
    ],
    { draftKey: `abschlussbewertung-${veranstaltungId}` },
  );

  useEffect(() => {
    if (consentError && ((email && consent) || (!email && !consent))) setConsentError(null);
  }, [consentError, email, consent]);

  if (!veranstaltungId) {
    return (
      <p className="text-sm text-muted-foreground">
        {tx('Dieser Link ist unvollständig. Scanne bitte den QR-Code der Veranstaltung noch einmal.')}
      </p>
    );
  }
  if (!live.loaded && live.error) return <LoadProblem onRetry={live.reload} />;
  if (!live.loaded) {
    return <p className="text-sm text-muted-foreground">{tx('Wird geladen …')}</p>;
  }
  const record = live.records.find(r => r.id === veranstaltungId);
  if (!record) {
    return (
      <p className="text-sm text-muted-foreground">
        {tx('Dieser Link passt zu keiner Veranstaltung. Scanne bitte den QR-Code noch einmal.')}
      </p>
    );
  }

  if (submit.result) {
    return (
      <SuccessStep
        result={submit.result}
        title={tx('Danke für deine Bewertung!')}
        actions={{ copy: false, print: false }}
        whatHappensNext={
          email && consent
            ? tx('Deine persönliche Auswertung schicken wir dir an deine E-Mail-Adresse.')
            : undefined
        }
        next={[
          {
            label: tx('Zum Feedback geben'),
            href: `#/public/feedback-geben?veranstaltung=${veranstaltungId}`,
          },
        ]}
      />
    );
  }

  const send = async () => {
    const okStars = f.validate(['sterne']);
    let problem: string | null = null;
    if (email && !consent) problem = tx('Bitte stimme zu, damit wir deine E-Mail-Adresse speichern dürfen.');
    else if (consent && !email) problem = tx('Bitte trage deine E-Mail-Adresse ein oder nimm den Haken wieder heraus.');
    setConsentError(problem);
    if (!okStars || problem) return;
    await submit.run();
  };

  return (
    <form
      className="space-y-5"
      onSubmit={e => {
        e.preventDefault();
        void send();
      }}
      onFocusCapture={() => prepareChallenge(cfg, page, 'POST', `/apps/${page.endpoints?.[0]?.app_id ?? ''}/records`)}
    >
      <p className="text-sm text-muted-foreground">
        {fieldText(record, 'titel')}
        {fieldText(record, 'datum') ? ` · ${fieldText(record, 'datum')}` : ''}
      </p>

      <Bound form={f} name="sterne" label={tx('Wie fandest du die Veranstaltung?')} />
      <Bound form={f} name="kommentar" label={tx('Kommentar (optional)')} rows={4} />

      <div className="space-y-3 rounded-xl border p-4">
        <p className="text-sm font-medium">{tx('Persönliche Auswertung (freiwillig)')}</p>
        <p className="text-sm text-muted-foreground">
          {tx('Hinterlege deine E-Mail-Adresse, wenn du später eine persönliche Auswertung bekommen möchtest. Ohne E-Mail bleibt deine Bewertung anonym.')}
        </p>
        <Bound form={f} name="email" />
        <Bound form={f} name="einwilligung" />
        {consentError && <p className="text-sm text-destructive">{consentError}</p>}
      </div>

      <FieldErrorSummary forms={[f]} />
      {submit.offline && (
        <p className="text-sm text-muted-foreground">
          {tx('Keine Verbindung — deine Eingaben sind gesichert.')}
        </p>
      )}
      {submit.error && !submit.offline && (
        <p className="text-sm text-destructive">
          {tx('Das Senden hat nicht geklappt. Bitte versuche es noch einmal.')}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={submit.submitting}>
        {tx('Bewertung abschicken')}
      </Button>
    </form>
  );
}

export default function Abschlussbewertung() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicPagesConfig(SLUG).then(c => {
      setCfg(c);
      setPage(c?.pages[SLUG] ?? null);
      setLoading(false);
    });
  }, []);

  if (loading || !cfg || !page) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  return (
    <PublicShell title={page.title} description={page.description}>
      <RatingForm cfg={cfg} page={page} />
    </PublicShell>
  );
}
