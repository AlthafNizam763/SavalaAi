import { prisma } from "../prisma";
import { PracticeSession, SessionMessage } from "@prisma/client";
import { ResumeData, SessionData, SessionMessageData, UserSettingsData, AIProvider } from "@/types";
import fs from "fs";
import path from "path";

// Local file-based fallback store directory for graceful development resilience
const DATA_DIR = path.join(process.cwd(), ".savala_data");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Ignore error
  }
}

function readLocalJson<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as T;
    }
  } catch {
    // fallback
  }
  return defaultValue;
}

function writeLocalJson<T>(filename: string, value: T): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
  } catch {
    // fallback
  }
}

// Check if MongoDB is reachable
let isDbOnline: boolean | null = null;
let lastDbCheck = 0;

export async function checkDatabaseConnection(): Promise<boolean> {
  const now = Date.now();
  if (isDbOnline !== null && now - lastDbCheck < 15000) {
    return isDbOnline;
  }

  try {
    // Ping command for MongoDB
    await prisma.$runCommandRaw({ ping: 1 });
    isDbOnline = true;
  } catch {
    isDbOnline = false;
  }
  lastDbCheck = now;
  return isDbOnline;
}

async function ensureUserExists(userId: string): Promise<void> {
  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      await prisma.user.create({
        data: { id: userId, email: `${userId}@savala.ai`, name: "Candidate" },
      });
    }
  } catch {
    // Handle gracefully
  }
}

// -------------------------------------------------------------
// USER SETTINGS
// -------------------------------------------------------------
export async function getSettingsForUser(userId: string): Promise<UserSettingsData> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      let settings = await prisma.userSettings.findUnique({
        where: { userId },
      });

      if (!settings) {
        await ensureUserExists(userId);

        settings = await prisma.userSettings.create({
          data: {
            userId,
            activeProvider: "gemini",
            preferredModel: "gemini-2.5-flash",
            audioAutoTranscribe: true,
            dataRetentionDays: 30,
            defaultJobRole: "Full-Stack Software Engineer",
            interviewDifficulty: "Medium",
          },
        });
      }

      const userProviderConfigs = await prisma.aIProviderConfig.findMany({
        where: { userId, isEnabled: true },
      });

      const activeCustom = userProviderConfigs.find((c) => c.isActive) || null;
      const hasGemini = !!process.env.GEMINI_API_KEY || userProviderConfigs.some((c) => c.providerType === "gemini");
      const hasOpenAI = !!process.env.OPENAI_API_KEY || userProviderConfigs.some((c) => c.providerType === "openai");

      return {
        id: settings.id,
        userId: settings.userId,
        activeProvider: (activeCustom?.providerType || settings.activeProvider) as AIProvider,
        preferredModel: activeCustom?.model || settings.preferredModel,
        activeProviderConfigId: activeCustom?.id || null,
        activeProviderName: activeCustom?.name || (settings.activeProvider === "gemini" ? "Google Gemini" : "OpenAI"),
        audioAutoTranscribe: settings.audioAutoTranscribe,
        dataRetentionDays: settings.dataRetentionDays,
        defaultJobRole: settings.defaultJobRole,
        interviewDifficulty: settings.interviewDifficulty,
        geminiConfigured: hasGemini,
        openaiConfigured: hasOpenAI,
        transcriptionConfigured: !!(process.env.TRANSCRIPTION_API_KEY || process.env.OPENAI_API_KEY || hasOpenAI),
        transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER || "openai",
        configuredProvidersCount: userProviderConfigs.length,
      };
    } catch {
      // Fall through to local store
    }
  }

  // Local fallback
  const store = readLocalJson<Record<string, UserSettingsData>>("settings.json", {});
  if (!store[userId]) {
    store[userId] = {
      id: `settings_${userId}`,
      userId,
      activeProvider: (process.env.DEFAULT_AI_PROVIDER as AIProvider) || "gemini",
      preferredModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      audioAutoTranscribe: true,
      dataRetentionDays: 30,
      defaultJobRole: "Full-Stack Software Engineer",
      interviewDifficulty: "Medium",
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      transcriptionConfigured: !!(process.env.TRANSCRIPTION_API_KEY || process.env.OPENAI_API_KEY),
      transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER || "openai",
      configuredProvidersCount: 0,
    };
    writeLocalJson("settings.json", store);
  }

  // Always reflect active environment flags
  store[userId].geminiConfigured = !!process.env.GEMINI_API_KEY;
  store[userId].openaiConfigured = !!process.env.OPENAI_API_KEY;
  store[userId].transcriptionConfigured = !!(process.env.TRANSCRIPTION_API_KEY || process.env.OPENAI_API_KEY);
  store[userId].transcriptionProvider = process.env.TRANSCRIPTION_PROVIDER || "openai";

  return store[userId];
}

export async function updateSettingsForUser(
  userId: string,
  updates: Partial<UserSettingsData>
): Promise<UserSettingsData> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      const existing = await prisma.userSettings.findUnique({ where: { userId } });
      let updated;

      if (existing) {
        updated = await prisma.userSettings.update({
          where: { userId },
          data: {
            ...(updates.activeProvider ? { activeProvider: updates.activeProvider } : {}),
            ...(updates.preferredModel ? { preferredModel: updates.preferredModel } : {}),
            ...(updates.audioAutoTranscribe !== undefined ? { audioAutoTranscribe: updates.audioAutoTranscribe } : {}),
            ...(updates.dataRetentionDays !== undefined ? { dataRetentionDays: updates.dataRetentionDays } : {}),
            ...(updates.defaultJobRole ? { defaultJobRole: updates.defaultJobRole } : {}),
            ...(updates.interviewDifficulty ? { interviewDifficulty: updates.interviewDifficulty } : {}),
          },
        });
      } else {
        await ensureUserExists(userId);
        updated = await prisma.userSettings.create({
          data: {
            userId,
            activeProvider: updates.activeProvider || "gemini",
            preferredModel: updates.preferredModel || "gemini-2.5-flash",
            audioAutoTranscribe: updates.audioAutoTranscribe ?? true,
            dataRetentionDays: updates.dataRetentionDays || 30,
            defaultJobRole: updates.defaultJobRole || "Full-Stack Software Engineer",
            interviewDifficulty: updates.interviewDifficulty || "Medium",
          },
        });
      }

      return {
        id: updated.id,
        userId: updated.userId,
        activeProvider: updated.activeProvider as AIProvider,
        preferredModel: updated.preferredModel,
        audioAutoTranscribe: updated.audioAutoTranscribe,
        dataRetentionDays: updated.dataRetentionDays,
        defaultJobRole: updated.defaultJobRole,
        interviewDifficulty: updated.interviewDifficulty,
        geminiConfigured: !!process.env.GEMINI_API_KEY,
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        transcriptionConfigured: !!(process.env.TRANSCRIPTION_API_KEY || process.env.OPENAI_API_KEY),
        transcriptionProvider: process.env.TRANSCRIPTION_PROVIDER || "openai",
      };
    } catch {
      // Fall through to local store
    }
  }

  // Local fallback
  const store = readLocalJson<Record<string, UserSettingsData>>("settings.json", {});
  const current = store[userId] || (await getSettingsForUser(userId));
  store[userId] = {
    ...current,
    ...updates,
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    transcriptionConfigured: !!(process.env.TRANSCRIPTION_API_KEY || process.env.OPENAI_API_KEY),
  };
  writeLocalJson("settings.json", store);
  return store[userId];
}

// -------------------------------------------------------------
// SESSIONS
// -------------------------------------------------------------
export async function getSessionsForUser(userId: string): Promise<SessionData[]> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      const sessions = await prisma.practiceSession.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      return sessions.map((s: PracticeSession & { messages: SessionMessage[] }) => ({
        id: s.id,
        userId: s.userId,
        title: s.title,
        sessionType: s.sessionType as SessionData["sessionType"],
        status: s.status as SessionData["status"],
        transcriptText: s.transcriptText,
        durationSeconds: s.durationSeconds,
        targetRole: s.targetRole,
        notes: s.notes,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        messages: (s.messages || []).map((m: SessionMessage) => ({
          id: m.id,
          sessionId: m.sessionId,
          role: m.role as SessionMessageData["role"],
          content: m.content,
          provider: m.provider,
          model: m.model,
          createdAt: m.createdAt.toISOString(),
        })),
      }));
    } catch {
      // Fall through to local store
    }
  }

  const allSessions = readLocalJson<SessionData[]>("sessions.json", []);
  return allSessions.filter((s) => s.userId === userId);
}

export async function getSessionById(userId: string, id: string): Promise<SessionData | null> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      const session = await prisma.practiceSession.findFirst({
        where: { id, userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      if (!session) return null;

      return {
        id: session.id,
        userId: session.userId,
        title: session.title,
        sessionType: session.sessionType as SessionData["sessionType"],
        status: session.status as SessionData["status"],
        transcriptText: session.transcriptText,
        durationSeconds: session.durationSeconds,
        targetRole: session.targetRole,
        notes: session.notes,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messages: (session.messages || []).map((m: SessionMessage) => ({
          id: m.id,
          sessionId: m.sessionId,
          role: m.role as SessionMessageData["role"],
          content: m.content,
          provider: m.provider,
          model: m.model,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    } catch {
      // Fall through to local store
    }
  }

  const allSessions = readLocalJson<SessionData[]>("sessions.json", []);
  return allSessions.find((s) => s.id === id && s.userId === userId) || null;
}

export async function createSessionForUser(
  userId: string,
  data: {
    title: string;
    sessionType: SessionData["sessionType"];
    transcriptText?: string;
    durationSeconds?: number;
    targetRole?: string;
    notes?: string;
    messages?: Array<{ role: "user" | "assistant" | "system"; content: string; provider?: string; model?: string }>;
  }
): Promise<SessionData> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      await ensureUserExists(userId);

      const session = await prisma.practiceSession.create({
        data: {
          userId,
          title: data.title,
          sessionType: data.sessionType || "interview",
          status: "completed",
          transcriptText: data.transcriptText,
          durationSeconds: data.durationSeconds || 0,
          targetRole: data.targetRole,
          notes: data.notes,
        },
      });

      const savedMessages: SessionMessageData[] = [];
      if (data.messages && data.messages.length > 0) {
        for (const m of data.messages) {
          const createdMsg = await prisma.sessionMessage.create({
            data: {
              sessionId: session.id,
              role: m.role,
              content: m.content,
              provider: m.provider,
              model: m.model,
            },
          });
          savedMessages.push({
            id: createdMsg.id,
            sessionId: createdMsg.sessionId,
            role: createdMsg.role as SessionMessageData["role"],
            content: createdMsg.content,
            provider: createdMsg.provider,
            model: createdMsg.model,
            createdAt: createdMsg.createdAt.toISOString(),
          });
        }
      }

      return {
        id: session.id,
        userId: session.userId,
        title: session.title,
        sessionType: session.sessionType as SessionData["sessionType"],
        status: session.status as SessionData["status"],
        transcriptText: session.transcriptText,
        durationSeconds: session.durationSeconds,
        targetRole: session.targetRole,
        notes: session.notes,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messages: savedMessages,
      };
    } catch {
      // Fall through to local store
    }
  }

  // Local fallback
  const allSessions = readLocalJson<SessionData[]>("sessions.json", []);
  const newId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newSession: SessionData = {
    id: newId,
    userId,
    title: data.title || "Practice Session",
    sessionType: data.sessionType || "interview",
    status: "completed",
    transcriptText: data.transcriptText,
    durationSeconds: data.durationSeconds || 0,
    targetRole: data.targetRole,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
    messages: (data.messages || []).map((m, idx) => ({
      id: `msg_${Date.now()}_${idx}`,
      sessionId: newId,
      role: m.role,
      content: m.content,
      provider: m.provider,
      model: m.model,
      createdAt: now,
    })),
  };

  allSessions.unshift(newSession);
  writeLocalJson("sessions.json", allSessions);
  return newSession;
}

export async function deleteSessionForUser(userId: string, id: string): Promise<boolean> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      await prisma.practiceSession.deleteMany({
        where: { id, userId },
      });
      return true;
    } catch {
      // Fall through
    }
  }

  const allSessions = readLocalJson<SessionData[]>("sessions.json", []);
  const filtered = allSessions.filter((s) => !(s.id === id && s.userId === userId));
  writeLocalJson("sessions.json", filtered);
  return true;
}

export async function clearAllSessionsForUser(userId: string): Promise<void> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      await prisma.practiceSession.deleteMany({
        where: { userId },
      });
    } catch {
      // Fall through
    }
  }

  const allSessions = readLocalJson<SessionData[]>("sessions.json", []);
  const filtered = allSessions.filter((s) => s.userId !== userId);
  writeLocalJson("sessions.json", filtered);
}

// -------------------------------------------------------------
// RESUMES
// -------------------------------------------------------------
export async function getResumeForUser(userId: string): Promise<ResumeData | null> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      const resume = await prisma.resume.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      if (!resume) return null;

      return {
        id: resume.id,
        userId: resume.userId,
        fileName: resume.fileName,
        fileSizeBytes: resume.fileSizeBytes,
        mimeType: resume.mimeType,
        extractedText: resume.extractedText,
        parsedSummary: resume.parsedSummary,
        parsedSkills: resume.parsedSkills ? JSON.parse(resume.parsedSkills) : [],
        parsedExperience: resume.parsedExperience,
        interviewQuestions: resume.interviewQuestions ? JSON.parse(resume.interviewQuestions) : [],
        createdAt: resume.createdAt.toISOString(),
        updatedAt: resume.updatedAt.toISOString(),
      };
    } catch {
      // Fall through
    }
  }

  const resumes = readLocalJson<ResumeData[]>("resumes.json", []);
  return resumes.find((r) => r.userId === userId) || null;
}

export async function saveResumeForUser(
  userId: string,
  data: {
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    extractedText: string;
    parsedSummary?: string;
    parsedSkills?: string[];
    parsedExperience?: string;
    interviewQuestions?: string[];
  }
): Promise<ResumeData> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      await ensureUserExists(userId);

      // Clear previous resumes for this user so they have 1 active resume
      await prisma.resume.deleteMany({ where: { userId } });

      const created = await prisma.resume.create({
        data: {
          userId,
          fileName: data.fileName,
          fileSizeBytes: data.fileSizeBytes,
          mimeType: data.mimeType,
          extractedText: data.extractedText,
          parsedSummary: data.parsedSummary,
          parsedSkills: data.parsedSkills ? JSON.stringify(data.parsedSkills) : null,
          parsedExperience: data.parsedExperience,
          interviewQuestions: data.interviewQuestions ? JSON.stringify(data.interviewQuestions) : null,
        },
      });

      return {
        id: created.id,
        userId: created.userId,
        fileName: created.fileName,
        fileSizeBytes: created.fileSizeBytes,
        mimeType: created.mimeType,
        extractedText: created.extractedText,
        parsedSummary: created.parsedSummary,
        parsedSkills: created.parsedSkills ? JSON.parse(created.parsedSkills) : [],
        parsedExperience: created.parsedExperience,
        interviewQuestions: created.interviewQuestions ? JSON.parse(created.interviewQuestions) : [],
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch {
      // Fall through
    }
  }

  // Local fallback
  const resumes = readLocalJson<ResumeData[]>("resumes.json", []);
  const filtered = resumes.filter((r) => r.userId !== userId);
  const now = new Date().toISOString();

  const newResume: ResumeData = {
    id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    fileName: data.fileName,
    fileSizeBytes: data.fileSizeBytes,
    mimeType: data.mimeType,
    extractedText: data.extractedText,
    parsedSummary: data.parsedSummary,
    parsedSkills: data.parsedSkills || [],
    parsedExperience: data.parsedExperience,
    interviewQuestions: data.interviewQuestions || [],
    createdAt: now,
    updatedAt: now,
  };

  filtered.unshift(newResume);
  writeLocalJson("resumes.json", filtered);
  return newResume;
}

export async function deleteResumeForUser(userId: string): Promise<boolean> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      await prisma.resume.deleteMany({ where: { userId } });
      return true;
    } catch {
      // Fall through
    }
  }

  const resumes = readLocalJson<ResumeData[]>("resumes.json", []);
  const filtered = resumes.filter((r) => r.userId !== userId);
  writeLocalJson("resumes.json", filtered);
  return true;
}
