export type AIProvider = "gemini" | "openai";

export type AIAction =
  | "interview_answer"
  | "concept_explanation"
  | "transcript_analysis"
  | "solve_problem"
  | "debug_code"
  | "explain_code"
  | "review_code"
  | "resume_analysis"
  | "generate_questions";

export type AnswerLanguage = "en" | "ml" | "ml-en" | "manglish";

export type MeetingPlatform = "google_meet" | "microsoft_teams" | "other";

export type MeetingAudioSource = "tab_audio" | "microphone" | "manual_transcript";

export interface LiveDetectedQuestion {
  id: string;
  timestamp: string;
  text: string;
  category?: "technical" | "behavioral" | "system_design" | "general";
  isAnswered?: boolean;
  status?: "pending" | "answered";
  confidence: number;
  language?: string;
}

export interface LiveSuggestedAnswer {
  questionId: string;
  conciseAnswer: string;
  detailedExplanation?: string;
  language: AnswerLanguage;
  timestamp: string;
  keyPoints?: string[];
}

export interface AIRequestPayload {
  action: AIAction;
  prompt?: string;
  context?: string;
  code?: string;
  language?: string;
  transcript?: string;
  jobRole?: string;
  difficulty?: "Junior" | "Medium" | "Senior" | "Staff";
  provider?: AIProvider;
  model?: string;
  responseLanguage?: AnswerLanguage;
  detailedExplanation?: boolean;
  resumeContext?: string;
  isLiveMeeting?: boolean;
}

export interface AIResponsePayload {
  success: boolean;
  content: string;
  provider: AIProvider;
  model: string;
  structuredData?: {
    approach?: string;
    code?: string;
    complexity?: {
      time?: string;
      space?: string;
    };
    edgeCases?: string[];
    suggestedQuestions?: string[];
    summary?: string;
    skills?: string[];
    experienceHighlights?: string[];
  };
  error?: string;
}

export interface TranscriptionResult {
  success: boolean;
  transcript: string;
  durationSeconds?: number;
  provider: string;
  error?: string;
}

export interface SessionData {
  id: string;
  userId: string;
  title: string;
  sessionType: "interview" | "coding" | "transcript_review";
  status: "draft" | "in_progress" | "completed";
  transcriptText?: string | null;
  durationSeconds: number;
  targetRole?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: SessionMessageData[];
}

export interface SessionMessageData {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider?: string | null;
  model?: string | null;
  createdAt: string;
}

export interface ResumeData {
  id: string;
  userId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  extractedText: string;
  parsedSummary?: string | null;
  parsedSkills?: string[] | null;
  parsedExperience?: string | null;
  interviewQuestions?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettingsData {
  id: string;
  userId: string;
  activeProvider: AIProvider;
  preferredModel: string;
  activeProviderConfigId?: string | null;
  activeProviderName?: string | null;
  audioAutoTranscribe: boolean;
  dataRetentionDays: number;
  defaultJobRole: string;
  interviewDifficulty: string;
  geminiConfigured: boolean;
  openaiConfigured: boolean;
  transcriptionConfigured: boolean;
  transcriptionProvider: string;
  configuredProvidersCount?: number;
}

export interface ProviderConfigData {
  id: string;
  userId: string;
  name: string;
  providerType: AIProvider;
  model: string;
  maskedKey: string;
  isActive: boolean;
  isEnabled: boolean;
  customEndpoint?: string | null;
  lastTestedAt?: string | null;
  testStatus?: "verified" | "failed" | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderConfigInput {
  name: string;
  providerType: AIProvider;
  apiKey: string;
  model: string;
  customEndpoint?: string;
  isActive?: boolean;
}

export interface UpdateProviderConfigInput {
  name?: string;
  apiKey?: string;
  model?: string;
  customEndpoint?: string;
  isActive?: boolean;
  isEnabled?: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
}
