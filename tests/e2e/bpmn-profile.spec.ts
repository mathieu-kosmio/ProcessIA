import { test, expect } from '@playwright/test';

test('T008 : naviguer dans un sous-processus BPMN conserve la sélection et le zoom', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le profil BPMN' }).click();
  await expect(page.getByRole('heading', { name: 'Profil BPMN V1' })).toBeVisible();
  await expect(page.getByText('Cabinet conseil', { exact: true })).toBeVisible();
  await expect(page.getByText('Entreprise cliente', { exact: true })).toBeVisible();
  await expect(page.getByText('Exécution désactivée', { exact: true })).toBeVisible();

  await page
    .getByRole('button', { name: 'Ouvrir le sous-processus Préparer la restitution' })
    .click();
  await expect(page.getByText('Rédiger la synthèse', { exact: true })).toBeVisible();
  await expect(page.getByText('Relire les constats', { exact: true })).toBeVisible();
  await expect(page.getByTestId('bpmn-breadcrumb')).toContainText('Préparer la restitution');
  await page.getByRole('button', { name: 'Agrandir le diagramme' }).click();
  await page.getByRole('button', { name: 'Sélectionner Relire les constats' }).click();
  await expect(page.getByTestId('bpmn-selection')).toHaveText('Sélection : Relire les constats');

  await page.reload();
  await page.getByRole('button', { name: 'Ouvrir le profil BPMN' }).click();
  await expect(page.getByTestId('bpmn-breadcrumb')).toContainText('Préparer la restitution');
  await expect(page.getByTestId('bpmn-selection')).toHaveText('Sélection : Relire les constats');
  await expect(page.getByTestId('bpmn-zoom')).toHaveText('110 %');
});

test('T008 : le brouillon affiche ses anomalies sans perdre le diagramme', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le profil BPMN' }).click();
  await expect(page.getByRole('status', { name: 'Validation BPMN' })).toContainText('2 anomalies');
  await expect(page.getByText('Brouillon conservé', { exact: true })).toBeVisible();
  await expect(page.getByText('Valider les constats', { exact: true })).toBeVisible();
});
