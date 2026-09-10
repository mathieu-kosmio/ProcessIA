import { test, expect } from '@playwright/test';

test('T005 : prévisualiser, confirmer et retirer une formulation partagée', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Réaliser un diagnostic IA' })).toBeVisible();

  await page.getByRole('button', { name: 'Sources & partage' }).click();
  const panel = page.getByRole('complementary', { name: 'Sources et partage' });
  await expect(panel.getByRole('heading', { name: 'Partager une formulation' })).toBeVisible();
  await expect(panel.getByLabel('Source privée')).toHaveValue(/.+/);
  await expect(panel.getByTestId('private-passage')).toContainText('REPERE-PRIVE-DEMO');

  const sharedText = 'Une revue des recommandations précède la restitution.';
  await panel.getByLabel('Formulation partagée').fill(sharedText);
  await panel.getByRole('button', { name: 'Prévisualiser le partage' }).click();
  await expect(panel.getByText('APERÇU RESPONSABLE')).toBeVisible();
  await expect(panel.getByTestId('shared-projection')).not.toContainText(sharedText);

  await panel.getByRole('button', { name: 'Confirmer le partage' }).click();
  const projection = panel.getByTestId('shared-projection');
  await expect(projection).toContainText(sharedText);
  await expect(projection).not.toContainText('REPERE-PRIVE-DEMO');
  await expect(projection).not.toContainText('Note de cadrage synthétique');

  await panel.getByRole('button', { name: 'Retirer le partage' }).click();
  await expect(projection).not.toContainText(sharedText);
  await expect(projection).toContainText('Aucune formulation partagée.');
});
