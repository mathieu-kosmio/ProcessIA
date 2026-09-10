import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ModelService, demoSession } from '../../src/application/model/service.ts';
import { InterviewService, InterviewError } from '../../src/application/interviews/session.ts';

function setup(t: TestContext) {
  const directory = mkdtempSync(join(tmpdir(), 'processia-interview-'));
  const path = join(directory, 'test.sqlite');
  const models = new ModelService(path);
  const interviews = new InterviewService(path, models);
  t.after(() => {
    interviews.close();
    models.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { models, interviews };
}

test('T007 / TC-015 et TC-017 : voix et texte restent dans un même entretien sans audio durable', (t) => {
  const { interviews } = setup(t);
  const session = interviews.start(demoSession, {
    dossier_id: 'demo-kosmio',
    model_id: 'process-diagnostic',
    transcription_policy: 'session',
  });
  assert.equal(session.audio_persisted, false);
  assert.equal(session.voice_state, 'ready');

  interviews.setVoiceConsent(demoSession, session.interview_id, true);
  assert.equal(interviews.listen(demoSession, session.interview_id).voice_state, 'listening');
  const voiceTurn = interviews.addTurn(demoSession, session.interview_id, {
    idempotency_key: 'voice-turn-1',
    mode: 'voice',
    text: 'Ici nous utilisons un modèle',
    selection_snapshot: { element_id: 'task-restitution', revision: 0 },
  });
  assert.equal(voiceTurn.sequence, 1);

  const switched = interviews.switchMode(demoSession, session.interview_id, 'text');
  assert.equal(switched.interview_id, session.interview_id);
  assert.equal(switched.mode, 'text');
  assert.equal(switched.voice_state, 'paused');
  const textTurn = interviews.addTurn(demoSession, session.interview_id, {
    idempotency_key: 'text-turn-2',
    mode: 'text',
    text: 'Le modèle est transmis avant la réunion.',
    selection_snapshot: { element_id: 'task-restitution', revision: 0 },
  });
  assert.equal(textTurn.sequence, 2);

  const sameInterview = interviews.get(demoSession, session.interview_id);
  assert.equal(sameInterview.messages.length, 2);
  assert.deepEqual(
    sameInterview.messages.map((message) => message.mode),
    ['voice', 'text'],
  );
  assert.deepEqual(
    sameInterview.messages.map((message) => message.selection_snapshot?.element_id),
    ['task-restitution', 'task-restitution'],
  );
  assert.equal(sameInterview.audio_persisted, false);
});

test('T007 / TC-016 : un refus du micro conserve le parcours textuel sans nouvelle demande implicite', (t) => {
  const { interviews } = setup(t);
  const session = interviews.start(demoSession, {
    dossier_id: 'demo-kosmio',
    model_id: 'process-diagnostic',
    transcription_policy: 'session',
  });
  const refused = interviews.setVoiceConsent(demoSession, session.interview_id, false);
  assert.equal(refused.mode, 'text');
  assert.equal(refused.voice_state, 'paused');
  assert.throws(
    () => interviews.listen(demoSession, session.interview_id),
    (error) => error instanceof InterviewError && error.code === 'VOICE_CONSENT_REQUIRED',
  );
  const turn = interviews.addTurn(demoSession, session.interview_id, {
    idempotency_key: 'text-after-refusal',
    mode: 'text',
    text: 'Je poursuis par écrit.',
  });
  assert.equal(turn.sequence, 1);
  assert.equal(interviews.get(demoSession, session.interview_id).messages.length, 1);
});

test('T007 / TC-015 : un même tour rejoué après un changement de mode ne crée pas de doublon', (t) => {
  const { interviews } = setup(t);
  const session = interviews.start(demoSession, {
    dossier_id: 'demo-kosmio',
    model_id: 'process-diagnostic',
    transcription_policy: 'session',
  });
  const input = {
    idempotency_key: 'stable-turn',
    mode: 'text' as const,
    text: 'Ajoute une validation avant la restitution.',
  };
  const first = interviews.addTurn(demoSession, session.interview_id, input);
  interviews.switchMode(demoSession, session.interview_id, 'voice');
  const replay = interviews.addTurn(demoSession, session.interview_id, input);
  assert.deepEqual(replay, first);
  assert.equal(interviews.get(demoSession, session.interview_id).messages.length, 1);
});

test('T007 / TC-018 : interrompre une réponse la clôt sans commande partielle', (t) => {
  const { interviews, models } = setup(t);
  const session = interviews.start(demoSession, {
    dossier_id: 'demo-kosmio',
    model_id: 'process-diagnostic',
    transcription_policy: 'session',
  });
  const response = interviews.beginResponse(
    demoSession,
    session.interview_id,
    'Je prépare une proposition de modification.',
  );
  assert.equal(response.status, 'streaming');
  const interrupted = interviews.interrupt(demoSession, session.interview_id);
  assert.equal(interrupted.voice_state, 'ready');
  assert.equal(interrupted.messages[0].status, 'interrupted');
  assert.equal(models.getHistory(demoSession, 'demo-kosmio', 'process-diagnostic').length, 0);
});

test('T007 / TC-019 : corriger une transcription conserve le texte original et son auteur', (t) => {
  const { interviews } = setup(t);
  const session = interviews.start(demoSession, {
    dossier_id: 'demo-kosmio',
    model_id: 'process-diagnostic',
    transcription_policy: 'session',
  });
  interviews.setVoiceConsent(demoSession, session.interview_id, true);
  const segment = interviews.addTurn(demoSession, session.interview_id, {
    idempotency_key: 'voice-correction',
    mode: 'voice',
    text: 'Nous utilisons Notionne.',
  });
  const corrected = interviews.correctTranscript(
    demoSession,
    session.interview_id,
    segment.message_id,
    'Nous utilisons Notion.',
  );
  assert.equal(corrected.text, 'Nous utilisons Notion.');
  assert.deepEqual(corrected.corrections, [
    {
      previous_text: 'Nous utilisons Notionne.',
      corrected_text: 'Nous utilisons Notion.',
      corrected_by: 'local-consultant',
      corrected_at: corrected.corrections?.[0].corrected_at,
    },
  ]);
});

test('T007 / TC-017 : sans conservation de transcription, la saisie manuelle reste disponible', (t) => {
  const { interviews } = setup(t);
  const session = interviews.start(demoSession, {
    dossier_id: 'demo-kosmio',
    model_id: 'process-diagnostic',
    transcription_policy: 'none',
  });
  interviews.setVoiceConsent(demoSession, session.interview_id, true);
  assert.throws(
    () =>
      interviews.addTurn(demoSession, session.interview_id, {
        idempotency_key: 'voice-without-transcript',
        mode: 'voice',
        text: 'Cette transcription ne doit pas être conservée.',
      }),
    (error) => error instanceof InterviewError && error.code === 'TRANSCRIPTION_REQUIRED',
  );
  const text = interviews.addTurn(demoSession, session.interview_id, {
    idempotency_key: 'manual-without-transcript',
    mode: 'text',
    text: 'Je documente manuellement le processus.',
  });
  assert.equal(text.mode, 'text');
  assert.equal(interviews.get(demoSession, session.interview_id).messages.length, 1);
});
