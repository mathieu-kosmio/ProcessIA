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
});
