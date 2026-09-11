import { test, expect } from '@playwright/test';

test('T010 : relier un constat, une opportunité et un essai sans valeur inventée', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le diagnostic et la feuille de route' }).click();

  await expect(page.getByRole('heading', { name: 'Diagnostic et feuille de route' })).toBeVisible();
  await expect(
    page.getByText('Deux tâches proposées sur six sont étudiées', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('La règle de validation de la restitution reste divergente.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Préparer une restitution assistée et sourcée' }),
  ).toBeVisible();
  await expect(page.getByTestId('diagnostic-expected-value')).toHaveText('4 / 5');
  await expect(page.getByTestId('diagnostic-feasibility')).toHaveText('Inconnue');
  await expect(
    page.getByText('Score indisponible : faisabilité inconnue.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Formaliser la règle de validation', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Essayer : Préparer une restitution assistée et sourcée'),
  ).toBeVisible();
  await expect(page.getByText('Responsable : Direction', { exact: true })).toBeVisible();
  await expect(page.getByText('À estimer', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Aucun agent démarré', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Scénario cible : Restitution assistée' }),
  ).toBeVisible();
  const targetResponse = await page.request.get(
    '/api/dossiers/demo-kosmio/models/process-diagnostic/targets',
  );
  expect(targetResponse.ok()).toBe(true);
  const targetState = (await targetResponse.json()) as {
    items: Array<{ reference_status: 'current' | 'outdated' }>;
  };
  expect(targetState.items).toHaveLength(1);
  const expectedStatus =
    targetState.items[0]?.reference_status === 'outdated'
      ? 'Réconciliation requise'
      : 'Référence à jour';
  await expect(page.getByText(expectedStatus, { exact: true })).toBeVisible();
  await expect(page.getByText('Restituer le diagnostic', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Préparer et valider la restitution assistée', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Préparée par IA', { exact: true })).toBeVisible();
  await expect(page.getByText('Validée par local-consultant', { exact: true })).toBeVisible();
  await expect(
    page.getByText('La cible ne modifie pas le fonctionnement actuel.', { exact: true }),
  ).toBeVisible();
});
