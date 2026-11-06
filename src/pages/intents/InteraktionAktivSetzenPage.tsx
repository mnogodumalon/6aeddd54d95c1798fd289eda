/**
 * Interaktion aktiv setzen — 3-Schritt-Wizard, danach QR-Code im eigenen Tab.
 * Steps: 1) Veranstaltung wählen → 2) Interaktion der Veranstaltung wählen → 3) Prüfen & als aktive Interaktion eintragen
 *        (Erfolg: QR-Code der aktiven Interaktion in eigenem Tab öffnen).
 * Reads: veranstaltungen, interaktionen. Writes: veranstaltungen.aktive_interaktion (update via useInteraktionAktivSetzenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IconQrcode } from '@tabler/icons-react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldDate, fieldNumber, fieldRef } from '@/lib/journey';
import { useInteraktionAktivSetzenFlow } from '@/lib/journey/flows/InteraktionAktivSetzen';
import { tx } from '@/i18n';

export default function InteraktionAktivSetzenPage() {
  const [step, setStep] = useState(1);
  const [veranstaltungId, setVeranstaltungId] = useState<string | null>(null);

  const flow = useInteraktionAktivSetzenFlow({
    steps: { veranstaltungen: 1, aktive_interaktion: 2 },
    items: {
      veranstaltungen: v => ({ id: v.id, title: fieldText(v, 'titel'), subtitle: fieldDate(v, 'datum') ?? undefined }),
      aktive_interaktion: (r, ctx) => {
        const nr = fieldNumber(r, 'reihenfolge');
        return {
          id: r.id,
          title: fieldText(r, 'frage'),
          subtitle: [nr != null ? `${nr}.` : '', fieldText(r, 'erlaeuterung'), ctx.ref('veranstaltung') ?? ''].filter(Boolean).join(' · ') || undefined,
        };
      },
    },
    where: {
      aktive_interaktion: r => !veranstaltungId || fieldRef(r, 'veranstaltung') === veranstaltungId,
    },
  });

  const pickVeranstaltung = flow.pick('veranstaltungen');

  const openQr = (id: string) => {
    window.open(`${window.location.origin}${window.location.pathname}#/ansicht/qr-code?record=${id}`, '_blank', 'noopener');
  };

  return (
    <IntentWizardShell
      title={tx('Interaktion aktiv setzen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{ description: tx('Eine Interaktion deiner Veranstaltung aktiv setzen und den QR-Code zeigen.'), needs: [tx('Deine Veranstaltung'), tx('Die Frage, die jetzt gestellt wird')] }}
    >
      <WizardStep label={tx('Veranstaltung')} description={tx('Für welche Veranstaltung möchtest du eine Interaktion aktivieren?')}>
        <EntitySelectStep
          {...flow.picks.veranstaltungen.select}
          {...pickVeranstaltung}
          onSelect={id => { setVeranstaltungId(id); pickVeranstaltung.onSelect(id); }}
          searchPlaceholder={tx('Titel der Veranstaltung …')}
        />
      </WizardStep>
      <WizardStep label={tx('Interaktion')} description={tx('Welche Frage soll jetzt aktiv sein?')} needs={['veranstaltungen']}>
        <EntitySelectStep
          {...flow.picks.aktive_interaktion.select}
          {...flow.pick('aktive_interaktion')}
          searchPlaceholder={tx('Frage suchen …')}
          emptyText={tx('Zu dieser Veranstaltung gibt es noch keine Interaktion.')}
        />
      </WizardStep>
      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Die gewählte Interaktion wird aktiv, bei der Veranstaltung ist immer genau eine aktiv. Danach kannst du den QR-Code öffnen.')}
          />
        )}
      </WizardStep>
      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          undo={flow.undo}
          whatHappensNext={tx('Der QR-Code führt zum Feedback-Formular der aktiven Interaktion.')}
          next={[
            {
              label: tx('QR-Code in eigenem Tab öffnen'),
              icon: <IconQrcode size={16} />,
              onClick: () => openQr(flow.submit.result?.primary.id ?? veranstaltungId ?? ''),
            },
            { label: tx('Feedbacks zusammenfassen'), href: '#/intents/feedbacks-zusammenfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
