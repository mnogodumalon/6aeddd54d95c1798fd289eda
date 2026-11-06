/**
 * Feedbacks zusammenfassen — 4-Schritt-Wizard.
 * Steps: 1) Interaktion wählen → 2) Vorprompt, Feedbacks mit Kürzel und Endprompt zusammenführen
 *        → 3) Text bearbeiten und kopieren → 4) Zusammenfassung bei der Interaktion speichern.
 * Reads: interaktionen, feedbacks. Writes: interaktionen.zusammenfassung (update via useFeedbacksZusammenfassenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useRef, useState } from 'react';
import { IconCheck, IconCopy } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, refFilter, useLiveList } from '@/lib/journey';
import { useFeedbacksZusammenfassenFlow } from '@/lib/journey/flows/FeedbacksZusammenfassen';
import { tx } from '@/i18n';

export default function FeedbacksZusammenfassenPage() {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const composedKey = useRef<string | null>(null);

  const flow = useFeedbacksZusammenfassenFlow({
    steps: { interaktionen: 1, zusammenfassung: 3 },
    items: {
      interaktionen: r => ({
        id: r.id,
        title: fieldText(r, 'frage'),
        subtitle: fieldText(r, 'erlaeuterung') || undefined,
      }),
    },
  });

  const form = flow.forms.interaktionen;
  const record = flow.targets.interaktionen.record;
  const interaktionId = record?.id ?? null;

  const feedbacks = useLiveList(flow.port, 'feedbacks', {
    intervalMs: 0,
    enabled: Boolean(interaktionId),
    list: interaktionId ? { filter: refFilter('interaktion', interaktionId) } : undefined,
  });
  const withKuerzel = feedbacks.records.filter(r => fieldText(r, 'kuerzel').trim() && fieldText(r, 'feedback_text').trim());

  const compose = () => {
    if (!record) return '';
    const parts = [
      fieldText(record, 'vorprompt').trim(),
      withKuerzel.map(r => `${fieldText(r, 'kuerzel').trim()}: ${fieldText(r, 'feedback_text').trim()}`).join('\n'),
      fieldText(record, 'endprompt').trim(),
    ];
    return parts.filter(Boolean).join('\n\n');
  };

  const composeOnNext = () => {
    if (feedbacks.loading && !feedbacks.loaded) return tx('Die Feedbacks werden noch geladen.');
    const key = `${interaktionId}:${withKuerzel.map(r => r.id).join(',')}`;
    if (composedKey.current !== key) {
      form.set('zusammenfassung', compose());
      composedKey.current = key;
    }
    return true;
  };

  const text = String(form.get('zusammenfassung') ?? '');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <IntentWizardShell
      title={tx('Feedbacks zusammenfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{ description: tx('Feedbacks einer Interaktion zu einem Text für die KI zusammenführen.'), needs: [tx('Eine Interaktion mit Feedbacks')] }}
    >
      <WizardStep label={tx('Interaktion')} description={tx('Zu welcher Interaktion sollen die Feedbacks zusammengefasst werden?')}>
        <EntitySelectStep {...flow.picks.interaktionen.select} {...flow.pick('interaktionen')} searchPlaceholder={tx('Frage suchen …')} />
      </WizardStep>

      <WizardStep label={tx('Zusammenführen')} description={tx('Vorprompt, Feedbacks mit Kürzel und Endprompt werden zu einem Text.')} needs={['interaktionen']}>
        <div className="space-y-3">
          <div className="rounded-2xl bg-secondary p-4 text-sm space-y-1">
            <p className="font-medium">{record ? fieldText(record, 'frage') : ''}</p>
            <p className="text-muted-foreground">
              {feedbacks.loading && !feedbacks.loaded
                ? tx('Feedbacks werden geladen …')
                : tx`${withKuerzel.length} Feedbacks mit Kürzel gefunden`}
            </p>
          </div>
          <ul className="max-h-64 overflow-auto space-y-1 text-sm">
            {withKuerzel.map(r => (
              <li key={r.id} className="rounded-xl border p-2 break-words">
                <span className="font-semibold">{fieldText(r, 'kuerzel')}</span>: {fieldText(r, 'feedback_text')}
              </li>
            ))}
          </ul>
          <StepNav onBack={() => setStep(1)} onNext={composeOnNext} nextStepLabel={tx('Text bearbeiten')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Bearbeiten')} description={tx('Text anpassen und kopieren.')} needs={['interaktionen']}>
        <div className="space-y-3">
          <Bound form={form} name="zusammenfassung" rows={16} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={copy} disabled={!text}>
              {copied ? <IconCheck size={16} className="shrink-0" /> : <IconCopy size={16} className="shrink-0" />}
              <span className="ml-2">{copied ? tx('Kopiert') : tx('Text kopieren')}</span>
            </Button>
          </div>
          <StepNav onBack={() => setStep(2)} onNext={() => flow.validateStep(3)} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Text wird bei der Interaktion als Zusammenfassung gespeichert.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          next={[
            { label: tx('Antwort der KI speichern'), href: '#/intents/ki-antwort-speichern' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
