import { test, expect } from '@playwright/test';

test('T007 : voix, interruption vers le texte et refus micro conservent le même entretien', async ({
  page,
  request,
}) => {
  const model = await request
    .get('/api/dossiers/demo-kosmio/models/process-diagnostic')
    .then((response) => response.json());
  const target = model.tasks.find((task: { id: string }) => task.id === 'task-restitution');
  await page.addInitScript(() => {
    let permission: 'granted' | 'denied' = 'granted';
    let calls = 0;
    Object.defineProperty(window, '__voiceTest', {
      value: {
        deny() {
          permission = 'denied';
        },
        calls() {
          return calls;
        },
      },
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        async getUserMedia() {
          calls += 1;
          if (permission === 'denied')
            throw new DOMException('Permission denied', 'NotAllowedError');
          return { getTracks: () => [{ stop() {} }] };
        },
      },
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: '☷ Liste', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(target.label) }).click();
  await page.getByRole('button', { name: 'Activer le micro' }).click();
  await expect(page.getByTestId('voice-state')).toContainText('Écoute active');
  await expect(page.getByText('Audio non conservé', { exact: true })).toBeVisible();

  await page.getByLabel('Votre demande').fill('Ici nous utilisons un modèle de restitution');
  await page.getByRole('button', { name: 'Interpréter la transcription' }).click();
  await expect(page.getByRole('button', { name: 'Appliquer à la carte' })).toBeVisible();
  const interviewId = await page.getByTestId('interview-id').getAttribute('data-interview-id');
  expect(interviewId).toBeTruthy();

  await page.getByRole('button', { name: 'Corriger la transcription' }).click();
  await page
    .getByLabel('Correction de la transcription')
    .fill('Ici nous utilisons un modèle final de restitution');
  await page.getByRole('button', { name: 'Enregistrer et réinterpréter' }).click();
  await expect(page.getByText('Transcription corrigée et proposition recalculée.')).toBeVisible();
  await expect(page.getByText(/original conservé/)).toBeVisible();
  await expect(page.getByTestId('proposal-context')).toContainText(target.label);

  await page.getByRole('button', { name: 'Passer au texte' }).click();
  await expect(page.getByRole('heading', { name: target.label })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Appliquer à la carte' })).toBeVisible();
  await page.getByRole('button', { name: 'Écarter', exact: true }).click();

  await page.evaluate(() =>
    (window as unknown as { __voiceTest: { deny: () => void } }).__voiceTest.deny(),
  );
  await page.getByRole('button', { name: 'Activer le micro' }).click();
  await expect(page.getByTestId('voice-state')).toContainText('Micro refusé');
  await expect(page.getByLabel('Votre demande')).toBeEnabled();
  await page.getByLabel('Votre demande').fill('Ajoute une validation avant la restitution');
  await page.getByRole('button', { name: 'Proposer la modification' }).click();
  await expect(page.getByRole('button', { name: 'Appliquer à la carte' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).__voiceTest.calls())).toBe(2);

  const interview = await request
    .get(`/api/interviews/${interviewId}`)
    .then((response) => response.json());
  expect(interview.audio_persisted).toBe(false);
  expect(interview.messages.slice(-2).map((message: { mode: string }) => message.mode)).toEqual([
    'voice',
    'text',
  ]);
  expect(
    interview.messages.slice(-2).map((message: { sequence: number }) => message.sequence),
  ).toEqual([interview.messages.length - 1, interview.messages.length]);
  expect(interview.messages.at(-2).corrections[0]).toMatchObject({
    previous_text: 'Ici nous utilisons un modèle de restitution',
    corrected_text: 'Ici nous utilisons un modèle final de restitution',
    corrected_by: 'local-consultant',
  });
});
