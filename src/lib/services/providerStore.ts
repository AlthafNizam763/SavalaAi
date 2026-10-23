import { prisma } from "../prisma";
import { checkDatabaseConnection } from "./store";
import {
  encryptApiKey,
  decryptApiKey,
  validateProviderEndpoint,
} from "../security/crypto";
import {
  AIProvider,
  ProviderConfigData,
  CreateProviderConfigInput,
  UpdateProviderConfigInput,
} from "@/types";
import { serverConfig } from "../config";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".savala_data");
const LOCAL_CONFIGS_FILE = "provider_configs.json";

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch {
    // Ignore error
  }
}

interface StoredProviderConfig {
  id: string;
  userId: string;
  name: string;
  providerType: AIProvider;
  model: string;
  encryptedApiKey: string;
  iv: string;
  authTag: string;
  maskedKey: string;
  isActive: boolean;
  isEnabled: boolean;
  customEndpoint?: string | null;
  lastTestedAt?: string | null;
  testStatus?: "verified" | "failed" | null;
  createdAt: string;
  updatedAt: string;
}

function readLocalConfigs(): StoredProviderConfig[] {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, LOCAL_CONFIGS_FILE);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data) as StoredProviderConfig[];
    }
  } catch {
    // Fallback
  }
  return [];
}

function writeLocalConfigs(configs: StoredProviderConfig[]): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, LOCAL_CONFIGS_FILE);
  try {
    fs.writeFileSync(filePath, JSON.stringify(configs, null, 2), "utf-8");
  } catch {
    // Fallback
  }
}

function sanitizeConfig(config: StoredProviderConfig): ProviderConfigData {
  return {
    id: config.id,
    userId: config.userId,
    name: config.name,
    providerType: config.providerType,
    model: config.model,
    maskedKey: config.maskedKey,
    isActive: config.isActive,
    isEnabled: config.isEnabled,
    customEndpoint: config.customEndpoint,
    lastTestedAt: config.lastTestedAt,
    testStatus: config.testStatus,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}

/**
 * Get all configured providers for a user.
 * Plaintext keys are never returned.
 */
export async function getProviderConfigsForUser(userId: string): Promise<ProviderConfigData[]> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      const records = await prisma.aIProviderConfig.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      return records.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        providerType: r.providerType as AIProvider,
        model: r.model,
        maskedKey: r.maskedKey,
        isActive: r.isActive,
        isEnabled: r.isEnabled,
        customEndpoint: r.customEndpoint,
        lastTestedAt: r.lastTestedAt?.toISOString() || null,
        testStatus: (r.testStatus as "verified" | "failed" | null) || null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    } catch {
      // Fallback to local file store
    }
  }

  const localConfigs = readLocalConfigs().filter((c) => c.userId === userId);
  return localConfigs.map(sanitizeConfig);
}

/**
 * Create a new encrypted provider configuration.
 */
export async function createProviderConfig(
  userId: string,
  input: CreateProviderConfigInput
): Promise<ProviderConfigData> {
  if (!input.name || !input.name.trim()) {
    throw new Error("Provider display name is required.");
  }
  if (!input.apiKey || !input.apiKey.trim()) {
    throw new Error("API key is required.");
  }
  if (!input.model || !input.model.trim()) {
    throw new Error("Model identifier is required.");
  }

  const endpointValidation = validateProviderEndpoint(input.customEndpoint);
  if (!endpointValidation.isValid) {
    throw new Error(endpointValidation.error || "Invalid custom endpoint.");
  }

  // Encrypt API key using AES-256-GCM
  const { encryptedApiKey, iv, authTag, maskedKey } = encryptApiKey(input.apiKey.trim());
  const now = new Date();
  const id = `prov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const shouldBeActive = !!input.isActive;

  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      // If setting as active, deactivate other configs for this user
      if (shouldBeActive) {
        await prisma.aIProviderConfig.updateMany({
          where: { userId },
          data: { isActive: false },
        });
      }

      const created = await prisma.aIProviderConfig.create({
        data: {
          id,
          userId,
          name: input.name.trim(),
          providerType: input.providerType,
          model: input.model.trim(),
          encryptedApiKey,
          iv,
          authTag,
          maskedKey,
          isActive: shouldBeActive,
          isEnabled: true,
          customEndpoint: input.customEndpoint?.trim() || null,
        },
      });

      if (shouldBeActive) {
        await prisma.userSettings.updateMany({
          where: { userId },
          data: {
            activeProvider: input.providerType,
            preferredModel: input.model.trim(),
            activeProviderConfigId: id,
          },
        });
      }

      return {
        id: created.id,
        userId: created.userId,
        name: created.name,
        providerType: created.providerType as AIProvider,
        model: created.model,
        maskedKey: created.maskedKey,
        isActive: created.isActive,
        isEnabled: created.isEnabled,
        customEndpoint: created.customEndpoint,
        lastTestedAt: null,
        testStatus: null,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err: unknown) {
      console.warn("Prisma error in createProviderConfig, falling back to local store:", err);
    }
  }

  // Local file fallback
  const localConfigs = readLocalConfigs();
  if (shouldBeActive) {
    localConfigs.forEach((c) => {
      if (c.userId === userId) c.isActive = false;
    });
  }

  const newStored: StoredProviderConfig = {
    id,
    userId,
    name: input.name.trim(),
    providerType: input.providerType,
    model: input.model.trim(),
    encryptedApiKey,
    iv,
    authTag,
    maskedKey,
    isActive: shouldBeActive,
    isEnabled: true,
    customEndpoint: input.customEndpoint?.trim() || null,
    lastTestedAt: null,
    testStatus: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  localConfigs.unshift(newStored);
  writeLocalConfigs(localConfigs);

  return sanitizeConfig(newStored);
}

/**
 * Update a provider configuration.
 */
export async function updateProviderConfig(
  userId: string,
  id: string,
  input: UpdateProviderConfigInput
): Promise<ProviderConfigData> {
  const endpointValidation = validateProviderEndpoint(input.customEndpoint);
  if (!endpointValidation.isValid) {
    throw new Error(endpointValidation.error || "Invalid custom endpoint.");
  }

  const now = new Date();
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      const existing = await prisma.aIProviderConfig.findFirst({
        where: { id, userId },
      });
      if (!existing) {
        throw new Error("Provider configuration not found or access denied.");
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataToUpdate: any = { updatedAt: now };

      if (input.name) dataToUpdate.name = input.name.trim();
      if (input.model) dataToUpdate.model = input.model.trim();
      if (input.customEndpoint !== undefined) dataToUpdate.customEndpoint = input.customEndpoint?.trim() || null;
      if (input.isEnabled !== undefined) dataToUpdate.isEnabled = input.isEnabled;

      if (input.apiKey && input.apiKey.trim()) {
        const encrypted = encryptApiKey(input.apiKey.trim());
        dataToUpdate.encryptedApiKey = encrypted.encryptedApiKey;
        dataToUpdate.iv = encrypted.iv;
        dataToUpdate.authTag = encrypted.authTag;
        dataToUpdate.maskedKey = encrypted.maskedKey;
      }

      if (input.isActive) {
        await prisma.aIProviderConfig.updateMany({
          where: { userId },
          data: { isActive: false },
        });
        dataToUpdate.isActive = true;

        await prisma.userSettings.updateMany({
          where: { userId },
          data: {
            activeProvider: existing.providerType,
            preferredModel: input.model ? input.model.trim() : existing.model,
            activeProviderConfigId: id,
          },
        });
      }

      const updated = await prisma.aIProviderConfig.update({
        where: { id },
        data: dataToUpdate,
      });

      return {
        id: updated.id,
        userId: updated.userId,
        name: updated.name,
        providerType: updated.providerType as AIProvider,
        model: updated.model,
        maskedKey: updated.maskedKey,
        isActive: updated.isActive,
        isEnabled: updated.isEnabled,
        customEndpoint: updated.customEndpoint,
        lastTestedAt: updated.lastTestedAt?.toISOString() || null,
        testStatus: (updated.testStatus as "verified" | "failed" | null) || null,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (err: unknown) {
      console.warn("Prisma error in updateProviderConfig, falling back:", err);
    }
  }

  // Local fallback
  const localConfigs = readLocalConfigs();
  const idx = localConfigs.findIndex((c) => c.id === id && c.userId === userId);
  if (idx === -1) {
    throw new Error("Provider configuration not found.");
  }

  const target = localConfigs[idx];
  if (input.name) target.name = input.name.trim();
  if (input.model) target.model = input.model.trim();
  if (input.customEndpoint !== undefined) target.customEndpoint = input.customEndpoint?.trim() || null;
  if (input.isEnabled !== undefined) target.isEnabled = input.isEnabled;

  if (input.apiKey && input.apiKey.trim()) {
    const encrypted = encryptApiKey(input.apiKey.trim());
    target.encryptedApiKey = encrypted.encryptedApiKey;
    target.iv = encrypted.iv;
    target.authTag = encrypted.authTag;
    target.maskedKey = encrypted.maskedKey;
  }

  if (input.isActive) {
    localConfigs.forEach((c) => {
      if (c.userId === userId) c.isActive = false;
    });
    target.isActive = true;
  }

  target.updatedAt = now.toISOString();
  writeLocalConfigs(localConfigs);

  return sanitizeConfig(target);
}

/**
 * Delete a provider configuration.
 */
export async function deleteProviderConfig(userId: string, id: string): Promise<boolean> {
  const dbConnected = await checkDatabaseConnection();

  if (dbConnected) {
    try {
      const existing = await prisma.aIProviderConfig.findFirst({
        where: { id, userId },
      });
      if (!existing) return false;

      await prisma.aIProviderConfig.delete({ where: { id } });

      // If this was active, fallback to another enabled config or clear
      if (existing.isActive) {
        const nextActive = await prisma.aIProviderConfig.findFirst({
          where: { userId, isEnabled: true },
          orderBy: { createdAt: "desc" },
        });

        if (nextActive) {
          await prisma.aIProviderConfig.update({
            where: { id: nextActive.id },
            data: { isActive: true },
          });
          await prisma.userSettings.updateMany({
            where: { userId },
            data: {
              activeProvider: nextActive.providerType,
              preferredModel: nextActive.model,
              activeProviderConfigId: nextActive.id,
            },
          });
        } else {
          await prisma.userSettings.updateMany({
            where: { userId },
            data: { activeProviderConfigId: null },
          });
        }
      }

      return true;
    } catch {
      // Fallback
    }
  }

  const localConfigs = readLocalConfigs();
  const idx = localConfigs.findIndex((c) => c.id === id && c.userId === userId);
  if (idx === -1) return false;

  const [removed] = localConfigs.splice(idx, 1);
  if (removed.isActive) {
    const next = localConfigs.find((c) => c.userId === userId && c.isEnabled);
    if (next) next.isActive = true;
  }

  writeLocalConfigs(localConfigs);
  return true;
}

/**
 * Set an active provider configuration.
 */
export async function setActiveProviderConfig(userId: string, id: string): Promise<ProviderConfigData> {
  return updateProviderConfig(userId, id, { isActive: true });
}

/**
 * Resolve the active provider, model, and decrypted API key for an execution request.
 * Never leaves decrypted key in database or logs.
 */
export async function resolveActiveProviderCredentials(
  userId: string
): Promise<{
  provider: AIProvider;
  model: string;
  apiKey: string;
  configId?: string;
  name?: string;
  isCustom: boolean;
}> {
  const dbConnected = await checkDatabaseConnection();

  let activeConfig: StoredProviderConfig | null = null;

  if (dbConnected) {
    try {
      const record = await prisma.aIProviderConfig.findFirst({
        where: { userId, isActive: true, isEnabled: true },
      });

      if (record) {
        activeConfig = {
          id: record.id,
          userId: record.userId,
          name: record.name,
          providerType: record.providerType as AIProvider,
          model: record.model,
          encryptedApiKey: record.encryptedApiKey,
          iv: record.iv,
          authTag: record.authTag,
          maskedKey: record.maskedKey,
          isActive: record.isActive,
          isEnabled: record.isEnabled,
          customEndpoint: record.customEndpoint,
          lastTestedAt: record.lastTestedAt?.toISOString() || null,
          testStatus: record.testStatus as "verified" | "failed" | null,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        };
      }
    } catch {
      // fallback to local
    }
  }

  if (!activeConfig) {
    const localConfigs = readLocalConfigs();
    activeConfig = localConfigs.find((c) => c.userId === userId && c.isActive && c.isEnabled) || null;
  }

  // 1. If user configured an active in-app provider, decrypt its key in-memory
  if (activeConfig) {
    try {
      const decryptedKey = decryptApiKey(
        activeConfig.encryptedApiKey,
        activeConfig.iv,
        activeConfig.authTag
      );

      return {
        provider: activeConfig.providerType,
        model: activeConfig.model,
        apiKey: decryptedKey,
        configId: activeConfig.id,
        name: activeConfig.name,
        isCustom: true,
      };
    } catch (err: unknown) {
      console.error("Decryption failed for user provider:", err);
    }
  }

  // 2. Fallback to server environment variables
  const defaultProvider = serverConfig.defaultAiProvider || "gemini";
  if (defaultProvider === "gemini" && serverConfig.geminiApiKey) {
    return {
      provider: "gemini",
      model: serverConfig.geminiModel,
      apiKey: serverConfig.geminiApiKey,
      name: "Environment Google Gemini",
      isCustom: false,
    };
  }

  if (defaultProvider === "openai" && serverConfig.openaiApiKey) {
    return {
      provider: "openai",
      model: serverConfig.openaiModel,
      apiKey: serverConfig.openaiApiKey,
      name: "Environment OpenAI",
      isCustom: false,
    };
  }

  // Check if either key is available as secondary fallback
  if (serverConfig.geminiApiKey) {
    return {
      provider: "gemini",
      model: serverConfig.geminiModel,
      apiKey: serverConfig.geminiApiKey,
      name: "Environment Google Gemini",
      isCustom: false,
    };
  }

  if (serverConfig.openaiApiKey) {
    return {
      provider: "openai",
      model: serverConfig.openaiModel,
      apiKey: serverConfig.openaiApiKey,
      name: "Environment OpenAI",
      isCustom: false,
    };
  }

  // No keys configured
  return {
    provider: defaultProvider,
    model: defaultProvider === "gemini" ? "gemini-2.5-flash" : "gpt-4o-mini",
    apiKey: "",
    name: "Unconfigured Provider",
    isCustom: false,
  };
}

/**
 * Make a REAL live test ping request to verify provider API key validity.
 * Never simulated.
 */
export async function testProviderLiveConnection(
  providerType: AIProvider,
  apiKey: string,
  modelName: string
): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, latencyMs: 0, error: "API key is required for connection testing." };
  }

  const startTime = Date.now();

  try {
    if (providerType === "gemini") {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const testModel = modelName || "gemini-2.5-flash";

      const res = await ai.models.generateContent({
        model: testModel,
        contents: [{ role: "user", parts: [{ text: "Ping test. Respond with OK." }] }],
      });

      const latencyMs = Date.now() - startTime;
      if (res.text) {
        return { success: true, latencyMs };
      }
      return { success: false, latencyMs, error: "Empty response from Gemini API." };
    } else {
      // OpenAI connection test
      const openai = new OpenAI({ apiKey: apiKey.trim() });
      const testModel = modelName || "gpt-4o-mini";

      const completion = await openai.chat.completions.create({
        model: testModel,
        messages: [{ role: "user", content: "Ping test. Respond with OK." }],
        max_tokens: 5,
      });

      const latencyMs = Date.now() - startTime;
      if (completion.choices && completion.choices.length > 0) {
        return { success: true, latencyMs };
      }
      return { success: false, latencyMs, error: "Empty response from OpenAI API." };
    }
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : "Connection failed.";
    return {
      success: false,
      latencyMs,
      error: normalizeProviderError(message, providerType),
    };
  }
}

function normalizeProviderError(rawMsg: string, provider: AIProvider): string {
  const lower = rawMsg.toLowerCase();
  if (lower.includes("api_key_invalid") || lower.includes("invalid api key") || lower.includes("incorrect api key")) {
    return `Invalid ${provider === "gemini" ? "Google Gemini" : "OpenAI"} API Key. Please verify the key from your provider console.`;
  }
  if (lower.includes("quota") || lower.includes("rate limit") || lower.includes("resource_exhausted") || lower.includes("429")) {
    return `Provider Quota or Rate Limit exceeded on ${provider}. Check your account billing status.`;
  }
  if (lower.includes("not found") || lower.includes("model")) {
    return `The model specified is not available for this API key. Verify model name.`;
  }
  return rawMsg;
}
