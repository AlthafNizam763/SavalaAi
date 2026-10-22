"use client";

import React, { useState } from "react";
import {
  Sparkles,
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
  const [activeProvider, setActiveProvider] = useState<AIProvider>(settings?.activeProvider || "gemini");
  const [preferredModel, setPreferredModel] = useState<string>(settings?.preferredModel || "gemini-2.5-flash");
  const [audioAutoTranscribe, setAudioAutoTranscribe] = useState<boolean>(settings?.audioAutoTranscribe ?? true);
  const [defaultJobRole, setDefaultJobRole] = useState<string>(settings?.defaultJobRole || "Full-Stack Software Engineer");
  const [interviewDifficulty, setInterviewDifficulty] = useState<string>(settings?.interviewDifficulty || "Medium");
  const [dataRetentionDays, setDataRetentionDays] = useState<number>(settings?.dataRetentionDays || 30);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleProviderSelect = (prov: AIProvider) => {
    setActiveProvider(prov);
    if (prov === "gemini") {
      setPreferredModel("gemini-2.5-flash");
    } else {
      setPreferredModel("gpt-4o-mini");
    }
  };

  const handleSaveSettings = async () => {
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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5DD] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3A0F34]">Settings & Configuration</h1>
          <p className="text-xs sm:text-sm text-[#58505C]">
            Manage your AI text-generation providers, interview preferences, and data privacy controls.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#EAAA00] px-5 py-2.5 text-xs font-bold text-[#270A23] shadow-sm hover:bg-[#CF9400] disabled:opacity-50 transition-colors"
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* 1. AI Text-Generation Provider Selection */}
      <div className="rounded-xl border border-[#CBD5DD] bg-white p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#3A0F34] flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#EAAA00]" />
            Active AI Engine Provider
          </h3>
          <p className="text-xs text-[#58505C] mt-0.5">
            Switch between Google Gemini and OpenAI for interview evaluations, coding solutions, and resume parsing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Gemini Option */}
          <div
            onClick={() => handleProviderSelect("gemini")}
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
              activeProvider === "gemini"
                ? "border-[#EAAA00] bg-[#FFF8E6] shadow-xs"
                : "border-[#CBD5DD] bg-white hover:border-[#3A0F34]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-[#3A0F34]">Google Gemini</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  settings?.geminiConfigured
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {settings?.geminiConfigured ? "Ready (Key Detected)" : "Needs API Key in .env"}
              </span>
            </div>
            <p className="text-xs text-[#58505C] leading-snug">
              Ultra-fast latency and multimodal reasoning powered by Google GenAI.
            </p>
            <div className="mt-3 text-[11px] font-mono text-[#3A0F34] bg-white/70 p-1.5 rounded-md border border-[#CBD5DD]">
              Model: gemini-2.5-flash
            </div>
          </div>

          {/* OpenAI Option */}
          <div
            onClick={() => handleProviderSelect("openai")}
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
              activeProvider === "openai"
                ? "border-[#EAAA00] bg-[#FFF8E6] shadow-xs"
                : "border-[#CBD5DD] bg-white hover:border-[#3A0F34]"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-[#3A0F34]">OpenAI</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  settings?.openaiConfigured
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {settings?.openaiConfigured ? "Ready (Key Detected)" : "Needs API Key in .env"}
              </span>
            </div>
            <p className="text-xs text-[#58505C] leading-snug">
              Industry-standard GPT-4o-mini engine for structured technical answers.
            </p>
            <div className="mt-3 text-[11px] font-mono text-[#3A0F34] bg-white/70 p-1.5 rounded-md border border-[#CBD5DD]">
              Model: gpt-4o-mini
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="rounded-lg bg-[#F4F7F9] p-3 text-xs text-[#58505C] border border-[#CBD5DD] flex items-start gap-2.5">
          <Key className="h-4 w-4 text-[#3A0F34] flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-[#3A0F34]">Key Security Guarantee:</strong> In accordance with security best practices, provider API keys are exclusively loaded from server-side environment variables (<code className="bg-[#DDE3E8] px-1 py-0.5 rounded">GEMINI_API_KEY</code>, <code className="bg-[#DDE3E8] px-1 py-0.5 rounded">OPENAI_API_KEY</code>). They are never saved into browser localStorage or exposed in client responses.
          </div>
        </div>
      </div>

      {/* 2. Transcription Provider Status */}
      <div className="rounded-xl border border-[#CBD5DD] bg-white p-6 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[#3A0F34] flex items-center gap-2">
            <Mic className="h-4 w-4 text-[#EAAA00]" />
            Speech-to-Text Transcription Service
          </h3>
          <p className="text-xs text-[#58505C] mt-0.5">
            Configured transcription adapter powering the Practice Room microphone recording.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] p-4">
          <div>
            <div className="text-xs font-bold text-[#1F1722] flex items-center gap-2">
              <span>OpenAI Whisper API Adapter</span>
              <span className="rounded-md bg-[#DDE3E8] px-2 py-0.5 text-[10px] text-[#3A0F34] font-mono">
                whisper-1
              </span>
            </div>
            <p className="text-xs text-[#58505C] mt-1">
              Processes audio records in memory, performs high-fidelity English transcription, and releases buffers.
            </p>
          </div>

          <span
            className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full ${
              settings?.transcriptionConfigured
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {settings?.transcriptionConfigured ? "Configured" : "OPENAI_API_KEY Required"}
          </span>
        </div>

        <label className="flex items-center gap-3 pt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={audioAutoTranscribe}
            onChange={(e) => setAudioAutoTranscribe(e.target.checked)}
            className="h-4 w-4 rounded-sm border-[#CBD5DD] text-[#3A0F34] focus:ring-[#EAAA00]"
          />
          <span className="text-xs font-medium text-[#1F1722]">
            Automatically trigger speech-to-text when microphone recording stops
          </span>
        </label>
      </div>

      {/* 3. Interview Readiness Defaults */}
      <div className="rounded-xl border border-[#CBD5DD] bg-white p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[#3A0F34] flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#EAAA00]" />
            Interview Defaults & Target Role
          </h3>
          <p className="text-xs text-[#58505C] mt-0.5">
            Set your target engineering discipline and seniority level for tailored AI questions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#58505C] block mb-1.5">
              Default Target Role
            </label>
            <input
              type="text"
              value={defaultJobRole}
              onChange={(e) => setDefaultJobRole(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] p-2.5 text-xs font-semibold text-[#1F1722] focus:border-[#3A0F34] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#58505C] block mb-1.5">
              Seniority / Difficulty Level
            </label>
            <select
              value={interviewDifficulty}
              onChange={(e) => setInterviewDifficulty(e.target.value)}
              className="w-full rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] p-2.5 text-xs font-semibold text-[#1F1722] focus:border-[#3A0F34] focus:outline-hidden"
            >
              <option value="Junior">Junior Engineer (Foundations & Syntax)</option>
              <option value="Medium">Mid-Level Engineer (Systems & Problem Solving)</option>
              <option value="Senior">Senior Engineer (Architecture & Trade-offs)</option>
              <option value="Staff">Staff / Principal (System Design & Organization)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Privacy & Data Retention Controls */}
      <div className="rounded-xl border border-red-200 bg-white p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-700" />
            Data Privacy & Data Retention Controls
          </h3>
          <p className="text-xs text-[#58505C] mt-0.5">
            Manage your persistent data footprint. You can delete individual items or clear all workspace history anytime.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-[#58505C] flex items-center gap-1.5 mb-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#3A0F34]" />
            <span>Automatic Session & Audio Retention (Days)</span>
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={dataRetentionDays}
            onChange={(e) => setDataRetentionDays(parseInt(e.target.value, 10) || 30)}
            className="w-32 rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] p-2 text-xs font-semibold text-[#1F1722] focus:border-[#3A0F34] focus:outline-hidden"
          />
          <span className="text-[11px] text-[#58505C] block mt-1">
            Data older than {dataRetentionDays} days can be automatically cleared.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={onClearHistory}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete All Practice Sessions</span>
          </button>

          <button
            onClick={onClearResume}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Stored Resume</span>
          </button>
        </div>
      </div>
    </div>
  );
};
