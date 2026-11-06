/**
 * Antwort der KI speichern — 3-Schritt-Wizard.
 * Steps: 1) Interaktion wählen → 2) Antwort der KI einfügen → 3) Prüfen & speichern.
 * Reads: interaktionen (frage, zusammenfassung, ki_antwort, veranstaltung). Writes: interaktionen.ki_antwort (update).
 * Composes: IntentWizardShell, EntitySelectStep, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText } from '@/lib/journey';
import { useKiAntwortSpeichernFlow } from '@/lib/journey/flows/KiAntwortSpeichern';
import { tx } from '@/i18n';

export default function KiAntwortSpeichernPage() {
  const [step, setStep] = useState(1);
  const flow = useKiAntwortSpeichernFlow({
    steps: { interaktionen: 1, ki_antwort: 2 },
    items: {
      interaktionen: (r, ctx) => ({
        id: r.id,
        title: fieldText(r, 'frage'),
        subtitle: ctx.ref('veranstaltung'),
      }),
    },
  });

  const pick = flow.pick('interaktionen');
  const picked = pick.selectedId ? flow.picks.interaktionen.recordOf(pick.selectedId) : undefined;
  const zusammenfassung = picked ? fieldText(picked, 'zusammenfassung') : '';

  return (
    <IntentWizardShell
      title={tx('Antwort der KI speichern')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Die Antwort des Chatbots bei einer Interaktion ablegen.'),
        needs: [tx('Die Antwort der KI als Text')],
      }}
    >
      <WizardStep label={tx('Interaktion')} description={tx('Zu welcher Interaktion gehört die Antwort?')}>
        <EntitySelectStep
          {...flow.picks.interaktionen.select}
          {...pick}
          avatar="none"
          searchPlaceholder={tx('Frage suchen …')}
        />
      </WizardStep>
      <WizardStep label={tx('Antwort')} description={tx('Füge die Antwort des Chatbots hier ein.')}>
        {pick.selectedId ? (
          <div className="space-y-4">
            {picked && (
              <div className="rounded-2xl bg-secondary p-4 space-y-2 overflow-hidden">
                <p className="text-xs text-muted-foreground">{tx('Frage')}</p>
                <p className="text-sm whitespace-pre-wrap break-words">{fieldText(picked, 'frage')}</p>
                {zusammenfassung && (
                  <>
                    <p className="text-xs text-muted-foreground pt-2">{tx('Zusammenfassung')}</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{zusammenfassung}</p>
                  </>
                )}
              </div>
            )}
            <Bound form={flow.forms.interaktionen} name="ki_antwort" rows={10} />
            <StepNav
              onBack={() => setStep(1)}
              onNext={() => flow.validateStep(2)}
              nextStepLabel={tx('Prüfen')}
            />
          </div>
        ) : (
          <StepNav onBack={() => setStep(1)} nextDisabled>
            {tx('Dieser Schritt braucht die Auswahl aus Schritt 1.')}
          </StepNav>
        )}
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die Antwort wird bei der Interaktion gespeichert und ist sofort sichtbar.')}
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
            { label: tx('Interaktion aktiv setzen'), href: '#/intents/interaktion-aktiv-setzen' },
            { label: tx('Feedbacks zusammenfassen'), href: '#/intents/feedbacks-zusammenfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
