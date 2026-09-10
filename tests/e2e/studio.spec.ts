import { test, expect } from '@playwright/test';

test('T001 : demande écrite, validation et rechargement du canevas', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Réaliser un diagnostic IA', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Votre demande').fill('Ajoute une validation avant la restitution');
  await page.getByRole('button', { name: 'Proposer la modification' }).click();
  await expect(page.getByRole('button', { name: 'Appliquer à la carte' })).toBeVisible();
  await page.getByRole('button', { name: 'Appliquer à la carte' }).click();
  await expect(page.getByTestId('revision')).toHaveText('Révision 1');
  await page.reload();
  await expect(page.getByTestId('revision')).toHaveText('Révision 1');
  await expect(
    page.getByText('Valider les recommandations', { exact: true }).first(),
  ).toBeVisible();
});

test('T001 : annuler la dernière modification depuis le studio conserve une nouvelle révision', async ({
  page,
  request,
}) => {
  const model = await request
    .get('/api/dossiers/demo-kosmio/models/process-diagnostic')
    .then((response) => response.json());
  await request.post('/api/commands', {
    headers: { Origin: 'http://127.0.0.1:3101' },
    data: {
      schema_version: '1',
      command_id: 'undo-browser-setup',
      dossier_id: model.dossier_id,
      model_id: model.id,
      base_revision: model.revision,
      origin: 'manual',
      operations: [{ type: 'ADD_TASK', task_id: 'temporary-task', label: 'Tâche à annuler' }],
    },
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Annuler la dernière modification', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Annuler la dernière modification', exact: true }).click();
  await expect(page.getByTestId('revision')).toHaveText(`Révision ${model.revision + 2}`);
  await page.reload();
  await expect(page.getByText('Tâche à annuler', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('revision')).toHaveText(`Révision ${model.revision + 2}`);
});

test('T001 : modifier un libellé depuis la fiche conserve la correction après rechargement', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: '☷ Liste', exact: true }).click();
  await page.getByRole('button', { name: /Restituer le diagnostic/ }).click();
  await page.getByLabel('Nom de la tâche').fill('Présenter la feuille de route');
  await page.getByRole('button', { name: 'Enregistrer le libellé' }).click();
  await expect(page.getByText('Modification enregistrée.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByText('Présenter la feuille de route', { exact: true }).first(),
  ).toBeVisible();
});

test('T001 : déplacer une tâche sur la carte conserve ses liens et persiste sa position', async ({
  page,
  request,
}) => {
  const before = await request
    .get('/api/dossiers/demo-kosmio/models/process-diagnostic')
    .then((response) => response.json());
  await page.goto('/');
  const node = page.getByLabel('Préparer le dossier', { exact: true });
  await expect(node).toBeVisible();
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 80, box.y + 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 130, box.y + 95, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByTestId('revision')).toHaveText(`Révision ${before.revision + 1}`);
  await page.reload();
  await expect(page.getByTestId('revision')).toHaveText(`Révision ${before.revision + 1}`);
  const after = await request
    .get('/api/dossiers/demo-kosmio/models/process-diagnostic')
    .then((response) => response.json());
  expect(after.links).toEqual(before.links);
  expect(after.tasks[0].role).toEqual(before.tasks[0].role);
  expect(after.tasks[0].position).not.toEqual(before.tasks[0].position);
});

test('T001 : écarter une proposition conserve la révision de la carte', async ({
  page,
  request,
}) => {
  const before = await request
    .get('/api/dossiers/demo-kosmio/models/process-diagnostic')
    .then((response) => response.json());
  await page.goto('/');
  await page.getByLabel('Votre demande').fill('Ajoute une validation avant la restitution');
  await page.getByRole('button', { name: 'Proposer la modification' }).click();
  await page.getByRole('button', { name: 'Écarter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Appliquer à la carte' })).toHaveCount(0);
  await expect(page.getByTestId('revision')).toHaveText(`Révision ${before.revision}`);
});

test('T001 : une édition concurrente est conservée et le conflit est visible dans le studio', async ({
  page,
  request,
}) => {
  const before = await request
    .get('/api/dossiers/demo-kosmio/models/process-diagnostic')
    .then((response) => response.json());
  await page.goto('/');
  await page.getByLabel('Votre demande').fill('Ajoute une validation avant la restitution');
  await page.getByRole('button', { name: 'Proposer la modification' }).click();
  await expect(page.getByRole('button', { name: 'Appliquer à la carte' })).toBeVisible();
  await request.post('/api/commands', {
    headers: { Origin: 'http://127.0.0.1:3101' },
    data: {
      schema_version: '1',
      command_id: 'other-window',
      dossier_id: before.dossier_id,
      model_id: before.id,
      base_revision: before.revision,
      origin: 'manual',
      operations: [
        {
          type: 'UPDATE_LABEL',
          element_id: 'task-restitution',
          label: 'Correction dans un autre onglet',
        },
      ],
    },
  });
  await page.getByRole('button', { name: 'Appliquer à la carte' }).click();
  await expect(page.getByRole('alert')).toContainText('La carte a changé');
  await page.getByRole('button', { name: 'Recharger la carte' }).click();
  await expect(page.getByTestId('revision')).toHaveText(`Révision ${before.revision + 1}`);
  await expect(
    page.getByText('Correction dans un autre onglet', { exact: true }).first(),
  ).toBeVisible();
  const after = await request
    .get('/api/dossiers/demo-kosmio/models/process-diagnostic')
    .then((response) => response.json());
  expect(after.tasks.length).toBe(before.tasks.length);
});

test('T002 : créer deux dossiers homonymes puis les distinguer dans le studio', async ({
  page,
}) => {
  await page.goto('/');
  for (const activity of ['Conseil', 'Industrie']) {
    await page.getByRole('button', { name: 'Créer un dossier' }).click();
    await page.getByLabel('Nom du dossier').fill('Entreprise exemple');
    await page.getByRole('textbox', { name: 'Activité', exact: true }).fill(activity);
    await page.getByRole('button', { name: 'Créer et ouvrir' }).click();
    await expect(page.getByTestId('active-dossier-name')).toHaveText('Entreprise exemple');
    await expect(page.getByTestId('active-dossier-activity')).toHaveText(activity);
  }
  await expect(
    page.getByTestId('dossier-list').getByText('Entreprise exemple', { exact: true }),
  ).toHaveCount(2);
  const identifiers = await page
    .getByTestId('dossier-list')
    .locator('[data-dossier-id]')
    .evaluateAll((items) => items.map((item) => item.getAttribute('data-dossier-id')));
  expect(new Set(identifiers).size).toBe(identifiers.length);
});
