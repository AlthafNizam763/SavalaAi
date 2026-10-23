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
    <div className="flex min-h-screen bg-[#F4F7F9] text-[#1F1722]">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#3A0F34] text-[#DDE3E8] shadow-xl transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center justify-between border-b border-white/10 px-6 flex-shrink-0">
          <BrandLogo size="md" variant="dark" />
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-[#DDE3E8] hover:bg-white/10 lg:hidden"
            aria-label="Close navigation sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto" aria-label="Main Navigation">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-[#DDE3E8]/50">
            Workspace
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#EAAA00] text-[#270A23] font-semibold shadow-sm"
                    : "text-[#DDE3E8] hover:bg-white/8 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-5 w-5 transition-colors ${
                      isActive ? "text-[#270A23]" : "text-[#DDE3E8]/80 group-hover:text-white"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-[#270A23]/15 text-[#270A23]"
                        : "bg-white/15 text-[#EAAA00]"
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
        <div className="border-t border-white/10 p-4 space-y-3">
          {/* Active Model Pill */}
          <div className="flex items-center justify-between rounded-xl bg-black/20 p-3 text-xs border border-white/5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#EAAA00]" />
              <span className="text-[#DDE3E8]/70">Engine:</span>
              <span className="font-semibold text-white capitalize">{activeProvider}</span>
            </div>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isProviderActive ? "bg-emerald-400 ring-4 ring-emerald-400/20" : "bg-amber-400 ring-4 ring-amber-400/20"
              }`}
              title={isProviderActive ? "AI API configured" : "Key pending in .env"}
            />
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between rounded-xl p-2.5 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAAA00] text-[#270A23] font-bold text-sm">
                {user?.name ? user.name.charAt(0).toUpperCase() : "C"}
              </div>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="truncate text-sm font-semibold text-white">
                  {user?.name || "Interview Candidate"}
                </span>
                <span className="truncate text-[11px] text-[#DDE3E8]/60">
                  {user?.email || "candidate@savala.ai"}
                </span>
              </div>
            </div>
            <ShieldCheck className="h-4 w-4 text-[#EAAA00]" />
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#CBD5DD] bg-white px-4 sm:px-8 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-[#3A0F34] hover:bg-[#DDE3E8]/40 lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2 text-sm text-[#58505C]">
              <span className="font-semibold text-[#3A0F34]">Savala Workspace</span>
              <ChevronRight className="h-4 w-4 text-[#CBD5DD]" />
              <span className="capitalize font-medium text-[#1F1722]">{currentTab}</span>
            </div>
          </div>

          {/* Header Action Badges */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab("settings")}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] px-3 py-1.5 text-xs font-medium text-[#3A0F34] hover:bg-[#DDE3E8] transition-colors"
            >
              <span className="text-[#58505C]">Active AI:</span>
              <span className="font-semibold capitalize text-[#3A0F34]">{activeProvider}</span>
            </button>

            <button
              onClick={() => onSelectTab("practice")}
              className="flex items-center gap-2 rounded-lg bg-[#EAAA00] px-3.5 py-1.5 text-xs font-semibold text-[#270A23] shadow-xs hover:bg-[#CF9400] transition-colors"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Practice Now</span>
            </button>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
};
