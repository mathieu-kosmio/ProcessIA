import { test, expect } from '@playwright/test';

test('T009 : comparer deux témoignages sans arbitrage inventé', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir la consolidation des entretiens' }).click();
  await expect(page.getByRole('heading', { name: 'Consolidation des entretiens' })).toBeVisible();
  await expect(page.getByText('Divergence à clarifier', { exact: true })).toBeVisible();
  await expect(
    page.getByText('La direction valide chaque restitution avant envoi.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('La direction intervient uniquement au-delà de 10 000 euros.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('review-assertion')).toHaveCount(2);
  await expect(page.getByText('Aucun arbitrage enregistré', { exact: true })).toBeVisible();
  await expect(page.getByTestId('review-target-role')).toHaveText('Rôle à interroger : Direction');
  await expect(page.getByText('Personne non renseignée', { exact: true })).toBeVisible();
});
