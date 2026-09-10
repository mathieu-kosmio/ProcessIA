import { test, expect } from '@playwright/test';

test('T003 : documenter rôle, outil, entrée et sortie puis les retrouver après rechargement', async ({
  page,
  request,
}) => {
  const model = await request
    .get('/api/dossiers/demo-kosmio/models/process-diagnostic')
    .then((response) => response.json());
  const task = model.tasks.find((item: { id: string }) => item.id === 'task-restitution');

  await page.goto('/');
  await page.getByRole('button', { name: '☷ Liste', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(task.label) }).click();
  await page.getByLabel('Rôle responsable').fill('Équipe de direction');
  await page.getByLabel('Outil utilisé').fill('Tableur partagé');
  await page.getByLabel('Information en entrée').fill('Analyse validée');
  await page.getByLabel('Résultat en sortie').fill('Diagnostic présenté');
  await page.getByRole('button', { name: 'Enregistrer la fiche' }).click();
  await expect(page.getByText('Modification enregistrée.', { exact: true })).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: '☷ Liste', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(task.label) }).click();
  await expect(page.getByLabel('Rôle responsable')).toHaveValue('Équipe de direction');
  await expect(page.getByLabel('Outil utilisé')).toHaveValue('Tableur partagé');
  await expect(page.getByLabel('Information en entrée')).toHaveValue('Analyse validée');
  await expect(page.getByLabel('Résultat en sortie')).toHaveValue('Diagnostic présenté');
  await expect(page.getByText('À confirmer', { exact: true })).toHaveCount(4);
});
