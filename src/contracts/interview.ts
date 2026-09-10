import type { Command } from './model.ts';

export type InterviewMode = 'voice' | 'text';
export type VoiceState = 'ready' | 'listening' | 'processing' | 'responding' | 'paused';
export type VoiceConsent = 'pending' | 'granted' | 'refused' | 'withdrawn';
export type TranscriptionPolicy = 'session' | 'dossier' | 'none';

export type TranscriptCorrection = {
  previous_text: string;
  corrected_text: string;
  corrected_by: string;
  corrected_at: string;
};

export type InterviewMessage = {
  message_id: string;
  sequence: number;
  role: 'user' | 'assistant';
  mode: InterviewMode;
  text: string;
  status: 'final' | 'streaming' | 'interrupted';
  selection_snapshot?: Command['selection_snapshot'];
  corrections?: TranscriptCorrection[];
  created_at: string;
};

export type InterviewSession = {
  interview_id: string;
  dossier_id: string;
  model_id: string;
  actor: string;
  status: 'active' | 'completed';
  mode: InterviewMode;
  voice_state: VoiceState;
  voice_consent: VoiceConsent;
  transcription_policy: TranscriptionPolicy;
  audio_persisted: false;
  messages: InterviewMessage[];
  created_at: string;
  updated_at: string;
};

export type StartInterviewInput = {
  dossier_id: string;
  model_id: string;
  transcription_policy: TranscriptionPolicy;
};

export type AddInterviewTurnInput = {
  idempotency_key: string;
  mode: InterviewMode;
  text: string;
  selection_snapshot?: Command['selection_snapshot'];
};
