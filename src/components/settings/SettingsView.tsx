"use client";

import React, { useState } from "react";
import {
  Mic,
  Shield,
  Save,
  Check,
  AlertCircle,
  Key,
  Trash2,
  Sliders,
  Calendar,
} from "lucide-react";
import { UserSettingsData, AIProvider } from "@/types";
import { AIProviderManager } from "./AIProviderManager";

interface SettingsViewProps {
  settings: UserSettingsData | null;
  onSettingsUpdated: (updated: UserSettingsData) => void;
  onClearHistory: () => void;
  onClearResume: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsUpdated,
  onClearHistory,
  onClearResume,
}) => {
  const [activeTab, setActiveTab] = useState<"providers" | "general">("providers");

  const [activeProvider, setActiveProvider] = useState<AIProvider>(settings?.activeProvider || "gemini");
  const [preferredModel, setPreferredModel] = useState<string>(settings?.preferredModel || "gemini-2.5-flash");
  const [audioAutoTranscribe, setAudioAutoTranscribe] = useState<boolean>(settings?.audioAutoTranscribe ?? true);
  const [defaultJobRole, setDefaultJobRole] = useState<string>(settings?.defaultJobRole || "Full-Stack Software Engineer");
  const [interviewDifficulty, setInterviewDifficulty] = useState<string>(settings?.interviewDifficulty || "Medium");
  const [dataRetentionDays, setDataRetentionDays] = useState<number>(settings?.dataRetentionDays || 30);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeProvider,
          preferredModel,
          audioAutoTranscribe,
          defaultJobRole,
          interviewDifficulty,
          dataRetentionDays,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        onSettingsUpdated(data.settings);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.error || "Failed to update settings.");
      }
    } catch {
      setSaveError("Network error while saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleActiveProviderChanged = (providerType: AIProvider, model: string, name: string) => {
    setActiveProvider(providerType);
    setPreferredModel(model);
    if (settings) {
      onSettingsUpdated({
        ...settings,
        activeProvider: providerType,
        preferredModel: model,
        activeProviderName: name,
        geminiConfigured: providerType === "gemini" ? true : settings.geminiConfigured,
        openaiConfigured: providerType === "openai" ? true : settings.openaiConfigured,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Title & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            Settings & AI Configuration
          </h1>
          <p className="text-xs text-[#737373] mt-1">
            Manage your AI text-generation provider credentials, interview parameters, and privacy controls.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-1 gap-1">
          <button
            onClick={() => setActiveTab("providers")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "providers"
                ? "bg-white text-[#080808] shadow-xs"
                : "text-[#A3A3A3] hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Key className="h-3.5 w-3.5" />
            <span>AI Providers & Keys</span>
          </button>

          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "general"
                ? "bg-white text-[#080808] shadow-xs"
                : "text-[#A3A3A3] hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>General Preferences</span>
          </button>
        </div>
      </div>

      {/* Tab 1: AI Provider Manager */}
      {activeTab === "providers" && (
        <AIProviderManager onActiveProviderChanged={handleActiveProviderChanged} />
      )}

      {/* Tab 2: General Preferences & Privacy */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-[#080808] hover:bg-[#E5E5E5] disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Preferences Saved</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? "Saving..." : "Save Preferences"}</span>
                </>
              )}
            </button>
          </div>

          {saveError && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Speech-to-Text Transcription Service */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs space-y-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Mic className="h-4 w-4 text-white" />
                Speech-to-Text Transcription Service
              </h3>
              <p className="text-xs text-[#737373] mt-0.5">
                Configured transcription adapter powering the microphone audio capture and meeting audio analysis.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Web Speech API / OpenAI Whisper API Adapter</span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] text-[#A3A3A3] font-mono">
                    whisper-1
                  </span>
                </div>
                <p className="text-xs text-[#737373] mt-1">
                  Processes live meeting audio and microphone stream in real time.
                </p>
              </div>

              <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Ready & Integrated
              </span>
            </div>

            <label className="flex items-center gap-3 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={audioAutoTranscribe}
                onChange={(e) => setAudioAutoTranscribe(e.target.checked)}
                className="h-4 w-4 rounded-sm border-white/20 bg-white/5 text-white accent-white cursor-pointer"
              />
              <span className="text-xs font-medium text-[#A3A3A3]">
                Automatically trigger transcription when recording finishes
              </span>
            </label>
          </div>

          {/* Interview Readiness Defaults */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-white" />
                Interview Defaults & Target Role
              </h3>
              <p className="text-xs text-[#737373] mt-0.5">
                Set your target engineering discipline and seniority level for tailored AI evaluations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[#A3A3A3] block mb-1.5">
                  Default Target Role
                </label>
                <input
                  type="text"
                  value={defaultJobRole}
                  onChange={(e) => setDefaultJobRole(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] p-2.5 text-xs font-semibold text-white focus:border-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A3A3A3] block mb-1.5">
                  Seniority / Difficulty Level
                </label>
                <select
                  value={interviewDifficulty}
                  onChange={(e) => setInterviewDifficulty(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.12] bg-[#141414] p-2.5 text-xs font-semibold text-white focus:border-white focus:outline-hidden cursor-pointer"
                >
                  <option value="Junior">Junior Engineer (Foundations & Syntax)</option>
                  <option value="Medium">Mid-Level Engineer (Systems & Problem Solving)</option>
                  <option value="Senior">Senior Engineer (Architecture & Trade-offs)</option>
                  <option value="Staff">Staff / Principal (System Design & Leadership)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Privacy & Data Retention Controls */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-white" />
                Data Privacy & Retention Controls
              </h3>
              <p className="text-xs text-[#737373] mt-0.5">
                Manage your persistent data footprint. You can delete individual sessions or clear all workspace history anytime.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#A3A3A3] flex items-center gap-1.5 mb-1.5">
                <Calendar className="h-3.5 w-3.5 text-white" />
                <span>Automatic Session & Audio Retention (Days)</span>
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={dataRetentionDays}
                onChange={(e) => setDataRetentionDays(parseInt(e.target.value, 10) || 30)}
                className="w-32 rounded-xl border border-white/[0.12] bg-white/[0.04] p-2 text-xs font-semibold text-white focus:border-white focus:outline-hidden"
              />
              <span className="text-[11px] text-[#737373] block mt-1">
                Data older than {dataRetentionDays} days will be automatically cleared.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={onClearHistory}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete All Practice Sessions</span>
              </button>

              <button
                onClick={onClearResume}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Stored Resume</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
