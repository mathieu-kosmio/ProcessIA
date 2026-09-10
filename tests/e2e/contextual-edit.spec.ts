import { test, expect } from '@playwright/test';

test('T006 : la proposition affiche et conserve la tâche ciblée par le contexte initial', async ({
  page,
  request,
}) => {
  const before = await request
    .get('/api/dossiers/demo-kosmio/models/process-diagnostic')
    .then((response) => response.json());
  const target = before.tasks.find((task: { id: string }) => task.id === 'task-restitution');
  const other = before.tasks.find((task: { id: string }) => task.id === 'task-preparation');

  await page.goto('/');
  await page.getByRole('button', { name: '☷ Liste', exact: true }).click();
  await page.getByRole('button', { name: new RegExp(target.label) }).click();
  await page.getByLabel('Votre demande').fill('Ici nous utilisons un modèle de restitution');
  await page.getByRole('button', { name: 'Proposer la modification' }).click();

  await expect(page.getByTestId('proposal-context')).toContainText(target.label);
  await expect(page.getByTestId('proposal-context')).toContainText(`Révision ${before.revision}`);
  await expect(page.locator('[data-proposal-target="true"]')).toContainText(target.label);

  await page.getByRole('button', { name: new RegExp(other.label) }).click();
  await expect(page.getByTestId('proposal-context')).toContainText(target.label);
  await expect(page.locator('[data-proposal-target="true"]')).toContainText(target.label);
  await page.getByRole('button', { name: 'Appliquer à la carte' }).click();

  const after = await request
    .get('/api/dossiers/demo-kosmio/models/process-diagnostic')
    .then((response) => response.json());
  const targetAfter = after.tasks.find((task: { id: string }) => task.id === target.id);
  const otherAfter = after.tasks.find((task: { id: string }) => task.id === other.id);
  const information = after.information.find(
    (item: { id: string }) => item.id === targetAfter.details.inputs.ids[0],
  );
  expect(information).toMatchObject({ label: 'Modèle de restitution', category: 'template' });
  expect(otherAfter.details.inputs.ids).not.toContain(information.id);
});
