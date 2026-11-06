import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { IconSend } from '@tabler/icons-react';
import { PublicShell } from '@/components/PublicShell';
import { Bound } from '@/components/blocks/Bound';
import { FieldErrorSummary } from '@/components/blocks/FieldErrorSummary';
import { LoadProblem } from '@/components/blocks/LoadProblem';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { Button } from '@/components/ui/button';
import { tx } from '@/i18n';
import {
  loadPublicPagesConfig, prepareChallenge,
  type PublicPagesConfig, type PublicPageConfig,
} from '@/lib/publicClient';
import { createPublicPort } from '@/lib/journey/publicPort';
import {
  useLiveList, useStepForm, useJourneySubmit, useVisitorKey, fieldRef, fieldText, freshRef,
  type JourneyRecord,
} from '@/lib/journey';

const SLUG = 'feedback-geben';

function newKennung(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function FeedbackGeben() {
  const [params] = useSearchParams();
  const veranstaltungId = params.get('veranstaltung');
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
  if (!veranstaltungId) {
    return (
      <PublicShell title={page.title} description={page.description}>
        <p className="text-sm text-muted-foreground">
          {tx('Dieser Link ist unvollständig. Scanne bitte den QR-Code der Veranstaltung noch einmal.')}
        </p>
      </PublicShell>
    );
  }
  return <FeedbackForm cfg={cfg} page={page} veranstaltungId={veranstaltungId} />;
}

function FeedbackForm({ cfg, page, veranstaltungId }: { cfg: PublicPagesConfig; page: PublicPageConfig; veranstaltungId: string }) {
  const port = useMemo(() => createPublicPort(cfg, page), [cfg, page]);
  const kuerzel = useVisitorKey({ length: 5 });
  const live = useLiveList(port, 'veranstaltungen', { intervalMs: 20000 });
  const event = live.records.find(r => r.id === veranstaltungId) ?? null;
  const pointer = event ? fieldRef(event, 'aktive_interaktion') : null;

  const [question, setQuestion] = useState<JourneyRecord | null>(null);
  const [round, setRound] = useState(0);
  const shownId = question?.id ?? null;
  const shownRef = useRef<string | null>(null);
  shownRef.current = shownId;
  const kennung = useMemo(() => newKennung(), [round]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the live pointer: read the pointed-at question when the pointer changes.
  useEffect(() => {
    if (!pointer) { setQuestion(null); return; }
    let cancelled = false;
    port.get('interaktionen', pointer).then(rec => {
      if (cancelled) return;
      setQuestion(rec && fieldRef(rec, 'veranstaltung') === veranstaltungId ? rec : null);
    }).catch(() => { /* keep the question on screen; the next poll retries */ });
    return () => { cancelled = true; };
  }, [port, pointer, veranstaltungId]);

  const f = useStepForm('feedbacks', {
    fields: ['feedback_text'],
    required: { feedback_text: true },
    autoComplete: true,
  });
  const submit = useJourneySubmit(
    port,
    [{
      key: 'feedback',
      entity: 'feedbacks',
      form: f,
      primary: true,
      values: () => ({ interaktion: shownRef.current ?? '', kuerzel, absende_kennung: kennung }),
    }],
    {
      draftKey: `feedback-${veranstaltungId}`,
      check: async () => {
        const fresh = await freshRef(port, 'veranstaltungen', veranstaltungId, 'aktive_interaktion');
        return fresh !== null && fresh === shownRef.current ? null : tx('Inzwischen ist eine andere Frage dran.');
      },
    },
  );

  // A new send gets a new identifier; a resend of the same send keeps its own.
  useEffect(() => { if (submit.done) setRound(r => r + 1); }, [submit.done]);

  const warm = () => {
    const ep = page.endpoints?.find(e => e.op === 'create');
    if (ep) prepareChallenge(cfg, page, 'POST', `/apps/${ep.app_id}/records`);
  };

  if (!live.loaded && live.error) {
    return <PublicShell title={page.title} description={page.description}><LoadProblem onRetry={live.reload} /></PublicShell>;
  }
  if (!live.loaded) return <PublicShell loading />;
  if (!event) {
    return (
      <PublicShell title={page.title}>
        <p className="text-sm text-muted-foreground">
          {tx('Dieser Link passt zu keiner Veranstaltung. Scanne bitte den QR-Code noch einmal.')}
        </p>
      </PublicShell>
    );
  }

  const title = fieldText(event, 'titel');
  const abschluss = `/public/abschlussbewertung?veranstaltung=${veranstaltungId}`;

  if (submit.result) {
    return (
      <PublicShell title={page.title} description={title}>
        <SuccessStep
          result={submit.result}
          forms={[f]}
          submit={submit}
          title={tx('Danke für dein Feedback!')}
          restartLabel={tx('Weiteres Feedback abgeben')}
          actions={{ copy: false, print: false }}
        >
          <p className="text-sm text-muted-foreground">
            {tx('Dein Kürzel für diese Veranstaltung:')}{' '}
            <span className="font-mono font-semibold tracking-widest text-foreground">{kuerzel}</span>
          </p>
          <Link to={abschluss} className="inline-block text-sm font-medium text-primary underline">
            {tx('Zur Abschlussbewertung')}
          </Link>
        </SuccessStep>
      </PublicShell>
    );
  }

  return (
    <PublicShell title={page.title} description={title}>
      {question ? (
        <form
          className="space-y-5"
          onFocus={warm}
          onSubmit={e => {
            e.preventDefault();
            if (f.validate()) void submit.run();
          }}
        >
          <div className="space-y-1">
            <p className="text-lg font-semibold whitespace-pre-line">{fieldText(question, 'frage')}</p>
            {fieldText(question, 'erlaeuterung') && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{fieldText(question, 'erlaeuterung')}</p>
            )}
          </div>
          <Bound form={f} name="feedback_text" rows={5} />
          <FieldErrorSummary forms={[f]} />
          {submit.offline && (
            <p className="text-sm text-muted-foreground">{tx('Keine Verbindung — deine Eingaben sind gesichert.')}</p>
          )}
          {submit.error && !submit.offline && (
            <p role="alert" className="text-sm text-destructive">{submit.error.message}</p>
          )}
          <Button type="submit" className="w-full sm:w-auto" disabled={submit.submitting}>
            <IconSend size={16} className="shrink-0" />
            {tx('Absenden')}
          </Button>
          <p className="text-xs text-muted-foreground">
            {tx('Dein Kürzel:')} <span className="font-mono font-semibold tracking-widest">{kuerzel}</span>
          </p>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          {tx('Gerade ist keine Frage geöffnet. Diese Seite aktualisiert sich von selbst.')}
        </p>
      )}
    </PublicShell>
  );
}
