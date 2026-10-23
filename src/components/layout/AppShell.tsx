"use client";

import React, { useState } from "react";
import {
  LayoutDashboard,
  Mic,
  Code2,
  FileText,
  History,
  Settings,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Video,
} from "lucide-react";
import { BrandLogo } from "../common/BrandLogo";
import { UserSettingsData, AppUser } from "@/types";

export type NavTab = "dashboard" | "meeting" | "practice" | "coding" | "resume" | "history" | "settings";

interface AppShellProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  settings?: UserSettingsData | null;
  user?: AppUser | null;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  settings,
  user,
  children,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      id: "dashboard" as NavTab,
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "meeting" as NavTab,
      label: "Live Meeting Copilot",
      icon: Video,
      badge: "Teams & Meet",
    },
    {
      id: "practice" as NavTab,
      label: "Practice Room",
      icon: Mic,
      badge: "Voice & AI",
    },
    {
      id: "coding" as NavTab,
      label: "Coding Lab",
      icon: Code2,
      badge: null,
    },
    {
      id: "resume" as NavTab,
      label: "My Resume",
      icon: FileText,
      badge: null,
    },
    {
      id: "history" as NavTab,
      label: "Session History",
      icon: History,
      badge: null,
    },
    {
      id: "settings" as NavTab,
      label: "Settings",
      icon: Settings,
      badge: null,
    },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileOpen(false);
  };

  const activeProvider = settings?.activeProvider || "gemini";
  const isProviderActive = activeProvider === "gemini" ? settings?.geminiConfigured : settings?.openaiConfigured;

  return (
    <div className="flex min-h-screen bg-[#080808] text-white">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#0D0D0D]/90 backdrop-blur-2xl border-r border-white/[0.08] shadow-2xl transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-18 items-center justify-between border-b border-white/[0.08] px-6 flex-shrink-0">
          <BrandLogo size="md" />
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-[#A3A3A3] hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-4 py-5 overflow-y-auto" aria-label="Main Navigation">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#737373]">
            Workspace
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-[#080808] font-bold shadow-xs"
                    : "text-[#A3A3A3] hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive ? "text-[#080808]" : "text-[#737373] group-hover:text-white"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isActive
                        ? "bg-[#080808]/15 text-[#080808]"
                        : "bg-white/[0.08] text-[#A3A3A3]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* AI Provider Indicator & Profile Card */}
        <div className="border-t border-white/[0.08] p-4 space-y-2.5">
          {/* Active Model Pill */}
          <div className="flex items-center justify-between rounded-xl bg-white/[0.04] p-2.5 text-xs border border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span className="text-[#737373] text-[11px]">Engine:</span>
              <span className="font-semibold text-white capitalize text-xs">
                {settings?.activeProviderName || activeProvider}
              </span>
            </div>
            <span
              className={`h-2 w-2 rounded-full ${
                isProviderActive ? "bg-emerald-400 ring-4 ring-emerald-400/20" : "bg-neutral-500 ring-4 ring-neutral-500/20"
              }`}
              title={isProviderActive ? "AI API configured and active" : "Key pending in AI Providers"}
            />
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between rounded-xl p-2 hover:bg-white/[0.04] transition-colors">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white font-bold text-xs border border-white/10">
                {user?.name ? user.name.charAt(0).toUpperCase() : "C"}
              </div>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="truncate text-xs font-semibold text-white">
                  {user?.name || "Candidate"}
                </span>
                <span className="truncate text-[10px] text-[#737373]">
                  {user?.email || "candidate@savala.ai"}
                </span>
              </div>
            </div>
            <ShieldCheck className="h-3.5 w-3.5 text-[#737373]" />
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 bg-[#080808]">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#080808]/80 backdrop-blur-xl px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-[#A3A3A3] hover:bg-white/[0.06] hover:text-white lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#737373]">
              <span className="font-semibold text-white">Savala AI</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#404040]" />
              <span className="capitalize font-medium text-[#A3A3A3]">{currentTab}</span>
            </div>
          </div>

          {/* Header Action Badges */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onSelectTab("settings")}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[#A3A3A3] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <span className="text-[#737373]">AI Engine:</span>
              <span className="font-semibold capitalize text-white">
                {settings?.activeProviderName || activeProvider}
              </span>
            </button>

            <button
              onClick={() => onSelectTab("meeting")}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-xs font-bold text-[#080808] shadow-xs hover:bg-[#E5E5E5] transition-colors cursor-pointer"
            >
              <Video className="h-3.5 w-3.5" />
              <span>Copilot</span>
            </button>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#080808]">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
