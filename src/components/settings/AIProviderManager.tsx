"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Key,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  X,
  ExternalLink,
} from "lucide-react";
import { ProviderConfigData, CreateProviderConfigInput, AIProvider } from "@/types";

interface AIProviderManagerProps {
  onActiveProviderChanged?: (providerType: AIProvider, model: string, name: string) => void;
}

const COMMON_MODELS: Record<AIProvider, { id: string; label: string; desc: string }[]> = {
  gemini: [
    { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Recommended • Ultra-fast, live interview answering" },
    { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Deep reasoning & complex technical algorithms" },
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Balanced latency & multimodal support" },
  ],
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Recommended • Cost-effective, high speed copilot" },
    { id: "gpt-4o", label: "GPT-4o", desc: "Flagship intelligence & comprehensive reasoning" },
    { id: "o3-mini", label: "o3-mini", desc: "Advanced reasoning for hard coding questions" },
  ],
};

export const AIProviderManager: React.FC<AIProviderManagerProps> = ({
  onActiveProviderChanged,
}) => {
  const [providers, setProviders] = useState<ProviderConfigData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProvider, setEditingProvider] = useState<ProviderConfigData | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>("");
  const [formType, setFormType] = useState<AIProvider>("gemini");
  const [formModel, setFormModel] = useState<string>("gemini-2.5-flash");
  const [customModelMode, setCustomModelMode] = useState<boolean>(false);
  const [formApiKey, setFormApiKey] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [formSetActive, setFormSetActive] = useState<boolean>(true);

  // Connection Test State
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    id: string;
    success: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const [modalTesting, setModalTesting] = useState<boolean>(false);
  const [modalTestResult, setModalTestResult] = useState<{
    success: boolean;
    latencyMs?: number;
    error?: string;
  } | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/providers");
      const data = await res.json();
      if (res.ok && data.success) {
        setProviders(data.providers || []);
      } else {
        setError(data.error || "Failed to load provider configurations.");
      }
    } catch {
      setError("Network error while loading providers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/providers");
        const data = await res.json();
        if (!ignore) {
          if (res.ok && data.success) {
            setProviders(data.providers || []);
          } else {
            setError(data.error || "Failed to load provider configurations.");
          }
        }
      } catch {
        if (!ignore) {
          setError("Network error while loading providers.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const openAddModal = () => {
    setEditingProvider(null);
    setFormName("");
    setFormType("gemini");
    setFormModel("gemini-2.5-flash");
    setCustomModelMode(false);
    setFormApiKey("");
    setShowApiKey(false);
    setFormSetActive(providers.length === 0);
    setModalTestResult(null);
    setIsModalOpen(true);
  };

  const openEditModal = (provider: ProviderConfigData) => {
    setEditingProvider(provider);
    setFormName(provider.name);
    setFormType(provider.providerType);
    setFormModel(provider.model);
    setCustomModelMode(!COMMON_MODELS[provider.providerType].some((m) => m.id === provider.model));
    setFormApiKey(""); // Keep empty unless user wants to replace it
    setShowApiKey(false);
    setFormSetActive(provider.isActive);
    setModalTestResult(null);
    setIsModalOpen(true);
  };

  const handleTestModalKey = async () => {
    if (!formApiKey && !editingProvider) {
      setModalTestResult({ success: false, error: "Please enter an API key to test." });
      return;
    }

    setModalTesting(true);
    setModalTestResult(null);

    try {
      const payload: {
        providerType: AIProvider;
        model: string;
        apiKey?: string;
        configId?: string;
      } = {
        providerType: formType,
        model: formModel,
      };

      if (formApiKey) {
        payload.apiKey = formApiKey;
      } else if (editingProvider) {
        payload.configId = editingProvider.id;
      }

      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setModalTestResult({
        success: data.success,
        latencyMs: data.latencyMs,
        error: data.error,
      });
    } catch {
      setModalTestResult({ success: false, error: "Network error testing provider." });
    } finally {
      setModalTesting(false);
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError("Please provide a name for this configuration.");
      return;
    }
    if (!editingProvider && !formApiKey.trim()) {
      setError("Please enter the API key.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingProvider) {
        // Update existing
        const res = await fetch(`/api/providers/${editingProvider.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            model: formModel.trim(),
            apiKey: formApiKey.trim() || undefined,
            isActive: formSetActive,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setIsModalOpen(false);
          setActionSuccess(`Updated "${formName}".`);
          setTimeout(() => setActionSuccess(null), 3000);
          await fetchProviders();
          if (formSetActive && onActiveProviderChanged) {
            onActiveProviderChanged(formType, formModel, formName);
          }
        } else {
          setError(data.error || "Failed to update configuration.");
        }
      } else {
        // Create new
        const payload: CreateProviderConfigInput = {
          name: formName.trim(),
          providerType: formType,
          apiKey: formApiKey.trim(),
          model: formModel.trim(),
          isActive: formSetActive,
        };

        const res = await fetch("/api/providers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setIsModalOpen(false);
          setActionSuccess(`Added "${formName}" securely.`);
          setTimeout(() => setActionSuccess(null), 3000);
          await fetchProviders();
          if (formSetActive && onActiveProviderChanged) {
            onActiveProviderChanged(formType, formModel, formName);
          }
        } else {
          setError(data.error || "Failed to save configuration.");
        }
      }
    } catch {
      setError("Network error while saving provider.");
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (provider: ProviderConfigData) => {
    try {
      const res = await fetch(`/api/providers/${provider.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(`Activated "${provider.name}".`);
        setTimeout(() => setActionSuccess(null), 3000);
        await fetchProviders();
        if (onActiveProviderChanged) {
          onActiveProviderChanged(provider.providerType, provider.model, provider.name);
        }
      } else {
        setError(data.error || "Failed to set active provider.");
      }
    } catch {
      setError("Network error while switching provider.");
    }
  };

  const handleDeleteProvider = async (provider: ProviderConfigData) => {
    if (!window.confirm(`Are you sure you want to delete "${provider.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/providers/${provider.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccess(`Deleted "${provider.name}".`);
        setTimeout(() => setActionSuccess(null), 3000);
        await fetchProviders();
      } else {
        setError(data.error || "Failed to delete provider.");
      }
    } catch {
      setError("Network error deleting provider.");
    }
  };

  const handleTestExisting = async (provider: ProviderConfigData) => {
    setTestingId(provider.id);
    setTestResult(null);

    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId: provider.id }),
      });

      const data = await res.json();
      setTestResult({
        id: provider.id,
        success: data.success,
        latencyMs: data.latencyMs,
        error: data.error,
      });

      // Refresh list to show verified status
      if (data.success) {
        fetchProviders();
      }
    } catch {
      setTestResult({
        id: provider.id,
        success: false,
        error: "Network error during test.",
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">AI Provider Configurations</h2>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#A3A3A3]">
              {providers.length} Saved
            </span>
          </div>
          <p className="text-xs text-[#737373] mt-1">
            Configure an arbitrary number of Gemini and OpenAI API keys. Stored with AES-256-GCM encryption at rest. No manual .env editing needed.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#080808] hover:bg-[#E5E5E5] transition-all shadow-xs cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Provider</span>
        </button>
      </div>

      {/* Security Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs text-[#A3A3A3]">
        <ShieldCheck className="h-5 w-5 text-white flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-white">Bank-Grade Server-Side Encryption</span>
          <p className="text-[#737373] leading-relaxed">
            Your API credentials are encrypted server-side with AES-256-GCM authenticated cipher before persistence. Plaintext keys are never stored, never written to browser storage, and never logged or returned across the wire.
          </p>
        </div>
      </div>

      {/* Alert Notices */}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-300">
          <Check className="h-4 w-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Provider List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-[#737373]">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-xs font-medium">Loading AI provider configurations...</span>
        </div>
      ) : providers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.12] p-10 text-center bg-white/[0.01]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white mb-3">
            <Key className="h-6 w-6 text-[#A3A3A3]" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">No AI Providers Configured</h3>
          <p className="text-xs text-[#737373] max-w-sm mb-4">
            Add your personal Google Gemini or OpenAI API keys to start using the live copilot and AI interview features.
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#080808] hover:bg-[#E5E5E5] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Your First Key</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {providers.map((p) => {
            const isTestingThis = testingId === p.id;
            const testInfo = testResult?.id === p.id ? testResult : null;

            return (
              <div
                key={p.id}
                className={`relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4.5 transition-all ${
                  p.isActive
                    ? "border-white/30 bg-white/[0.06] shadow-sm"
                    : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                }`}
              >
                {/* Left Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    onClick={() => handleSetActive(p)}
                    className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border cursor-pointer transition-colors ${
                      p.isActive
                        ? "border-white bg-white text-black"
                        : "border-white/20 hover:border-white/60"
                    }`}
                    title={p.isActive ? "Active provider" : "Click to make active"}
                  >
                    {p.isActive && <div className="h-2 w-2 rounded-full bg-black" />}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white truncate">{p.name}</span>
                      <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold text-[#A3A3A3] uppercase">
                        {p.providerType}
                      </span>
                      {p.isActive && (
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          Active Copilot Provider
                        </span>
                      )}
                      {p.testStatus === "verified" && (
                        <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-[#A3A3A3] flex items-center gap-1">
                          <Check className="h-2.5 w-2.5 text-emerald-400" />
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#737373] flex-wrap">
                      <span className="font-mono text-white/80">{p.model}</span>
                      <span>•</span>
                      <span className="font-mono text-[11px] text-[#737373]">{p.maskedKey}</span>
                      {p.lastTestedAt && (
                        <>
                          <span>•</span>
                          <span className="text-[10px]">
                            Tested: {new Date(p.lastTestedAt).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Inline test message if available */}
                    {testInfo && (
                      <div
                        className={`text-[11px] font-medium pt-1 ${
                          testInfo.success ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {testInfo.success
                          ? `Connection verified live (${testInfo.latencyMs}ms latency).`
                          : `Connection failed: ${testInfo.error}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <button
                    onClick={() => handleTestExisting(p)}
                    disabled={isTestingThis}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-[#A3A3A3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isTestingThis ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    <span>Test</span>
                  </button>

                  {!p.isActive && (
                    <button
                      onClick={() => handleSetActive(p)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      Set Active
                    </button>
                  )}

                  <button
                    onClick={() => openEditModal(p)}
                    className="rounded-lg p-1.5 text-[#737373] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Edit provider"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteProvider(p)}
                    className="rounded-lg p-1.5 text-[#737373] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete provider"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Provider Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.12] bg-[#101010] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingProvider ? "Edit AI Provider" : "Add AI Provider"}
                  </h3>
                  <p className="text-[11px] text-[#737373]">
                    {editingProvider
                      ? "Update configuration parameters or replace stored key."
                      : "Add credentials to your personal encrypted vault."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-[#737373] hover:text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProvider} className="space-y-4">
              {/* Provider Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A3A3A3]">
                  Configuration Label <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Fast Gemini Flash / OpenAI Production"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-[#555] focus:border-white focus:outline-hidden"
                />
              </div>

              {/* Provider Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#A3A3A3]">AI Provider Engine</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={!!editingProvider}
                    onClick={() => {
                      setFormType("gemini");
                      setFormModel("gemini-2.5-flash");
                      setCustomModelMode(false);
                    }}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      formType === "gemini"
                        ? "border-white bg-white/[0.08] text-white"
                        : "border-white/[0.08] bg-white/[0.02] text-[#737373] hover:border-white/20"
                    } ${editingProvider ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <Sparkles className="h-4 w-4 text-white" />
                    <div>
                      <div className="text-xs font-bold">Google Gemini</div>
                      <div className="text-[10px] text-[#737373]">Fast & multimodal</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!!editingProvider}
                    onClick={() => {
                      setFormType("openai");
                      setFormModel("gpt-4o-mini");
                      setCustomModelMode(false);
                    }}
                    className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      formType === "openai"
                        ? "border-white bg-white/[0.08] text-white"
                        : "border-white/[0.08] bg-white/[0.02] text-[#737373] hover:border-white/20"
                    } ${editingProvider ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <Zap className="h-4 w-4 text-white" />
                    <div>
                      <div className="text-xs font-bold">OpenAI</div>
                      <div className="text-[10px] text-[#737373]">GPT-4o & o3-mini</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#A3A3A3]">Model Identifier</label>
                  <button
                    type="button"
                    onClick={() => setCustomModelMode(!customModelMode)}
                    className="text-[11px] font-medium text-white underline hover:text-[#CCC]"
                  >
                    {customModelMode ? "Select from list" : "Enter custom model ID"}
                  </button>
                </div>

                {customModelMode ? (
                  <input
                    type="text"
                    required
                    placeholder="e.g. gemini-2.5-flash or gpt-4o"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-3.5 py-2.5 text-xs text-white placeholder-[#555] font-mono focus:border-white focus:outline-hidden"
                  />
                ) : (
                  <select
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.12] bg-[#141414] px-3.5 py-2.5 text-xs text-white focus:border-white focus:outline-hidden cursor-pointer"
                  >
                    {COMMON_MODELS[formType].map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#141414] text-white">
                        {m.label} ({m.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#A3A3A3]">
                    API Key {editingProvider ? "(Leave blank to keep existing key)" : "*"}
                  </label>
                  <a
                    href={
                      formType === "gemini"
                        ? "https://aistudio.google.com/app/apikey"
                        : "https://platform.openai.com/api-keys"
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#A3A3A3] hover:text-white flex items-center gap-1"
                  >
                    <span>Get {formType === "gemini" ? "Gemini" : "OpenAI"} Key</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    required={!editingProvider}
                    placeholder={editingProvider ? "•••••••••••••••• (Encrypted)" : "Paste your private API key here"}
                    value={formApiKey}
                    onChange={(e) => setFormApiKey(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.12] bg-white/[0.04] px-3.5 py-2.5 pr-10 text-xs text-white font-mono placeholder-[#555] focus:border-white focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-[#737373] hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Set Active Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="setActiveCheckbox"
                  checked={formSetActive}
                  onChange={(e) => setFormSetActive(e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-white accent-white cursor-pointer"
                />
                <label htmlFor="setActiveCheckbox" className="text-xs text-[#A3A3A3] cursor-pointer">
                  Set as active default AI engine immediately
                </label>
              </div>

              {/* Test Button & Feedback inside modal */}
              <div className="pt-2 border-t border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleTestModalKey}
                    disabled={modalTesting || (!formApiKey && !editingProvider)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-[#A3A3A3] hover:text-white hover:bg-white/10 disabled:opacity-40 cursor-pointer"
                  >
                    {modalTesting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="h-3.5 w-3.5" />
                    )}
                    <span>Test Connection Before Saving</span>
                  </button>

                  <span className="text-[10px] text-[#737373]">Real API ping test</span>
                </div>

                {modalTestResult && (
                  <div
                    className={`rounded-lg p-2.5 text-xs flex items-center gap-2 ${
                      modalTestResult.success
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                        : "bg-rose-500/10 border border-rose-500/20 text-rose-300"
                    }`}
                  >
                    {modalTestResult.success ? (
                      <Check className="h-4 w-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    )}
                    <span>
                      {modalTestResult.success
                        ? `Success! API returned response in ${modalTestResult.latencyMs}ms.`
                        : `Test failed: ${modalTestResult.error}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-[#A3A3A3] hover:text-white hover:bg-white/[0.04] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2 text-xs font-bold text-[#080808] hover:bg-[#E5E5E5] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingProvider ? "Update Provider" : "Save Provider"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
