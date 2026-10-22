"use client";

import React, { useState, useEffect } from "react";
import { AppShell, NavTab } from "@/components/layout/AppShell";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { MeetingCopilotView } from "@/components/meeting/MeetingCopilotView";
import { PracticeRoomView } from "@/components/practice/PracticeRoomView";
import { CodingLabView } from "@/components/coding/CodingLabView";
import { ResumeView } from "@/components/resume/ResumeView";
import { HistoryView } from "@/components/history/HistoryView";
import { SettingsView } from "@/components/settings/SettingsView";
import { SessionData, ResumeData, UserSettingsData, AppUser } from "@/types";

export default function SavalaWorkspacePage() {
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [user, setUser] = useState<AppUser | null>(null);
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [practiceQuestion, setPracticeQuestion] = useState<string | undefined>(undefined);

  // Fetch all initial workspace data on mount
  useEffect(() => {
    let isMounted = true;

    async function initWorkspace() {
      try {
        const [userRes, settingsRes, sessionsRes, resumeRes] = await Promise.allSettled([
          fetch("/api/auth/me"),
          fetch("/api/settings"),
          fetch("/api/sessions"),
          fetch("/api/resume"),
        ]);

        if (!isMounted) return;

        if (userRes.status === "fulfilled" && userRes.value.ok) {
          const userData = await userRes.value.json();
          if (userData.user && isMounted) setUser(userData.user);
        }

        if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
          const settingsData = await settingsRes.value.json();
          if (settingsData.settings && isMounted) setSettings(settingsData.settings);
        }

        if (sessionsRes.status === "fulfilled" && sessionsRes.value.ok) {
          const sessionsData = await sessionsRes.value.json();
          if (sessionsData.sessions && isMounted) setSessions(sessionsData.sessions);
        }

        if (resumeRes.status === "fulfilled" && resumeRes.value.ok) {
          const resumeData = await resumeRes.value.json();
          if (resumeData.resume && isMounted) setResume(resumeData.resume);
        }
      } catch (err) {
        console.error("Failed to load workspace data", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initWorkspace();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshResume = async () => {
    try {
      const res = await fetch("/api/resume");
      if (res.ok) {
        const data = await res.json();
        setResume(data.resume || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefreshSessions = async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSessionSaved = (newSession: SessionData) => {
    setSessions((prev) => [newSession, ...prev]);
  };

  const handlePracticeQuestionFromResume = (question: string) => {
    setPracticeQuestion(question);
    setCurrentTab("practice");
  };

  const handleClearAllHistory = async () => {
    if (!window.confirm("Are you sure you want to delete all practice history?")) return;
    try {
      const res = await fetch("/api/sessions", { method: "DELETE" });
      if (res.ok) {
        setSessions([]);
        alert("All sessions have been deleted.");
      }
    } catch {
      alert("Failed to clear sessions.");
    }
  };

  const handleClearResume = async () => {
    if (!window.confirm("Are you sure you want to delete your resume?")) return;
    try {
      const res = await fetch("/api/resume", { method: "DELETE" });
      if (res.ok) {
        setResume(null);
        alert("Resume has been deleted.");
      }
    } catch {
      alert("Failed to delete resume.");
    }
  };

  return (
    <AppShell
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      settings={settings}
      user={user}
    >
      {currentTab === "dashboard" && (
        <DashboardView
          sessions={sessions}
          resume={resume}
          settings={settings}
          user={user}
          onNavigate={setCurrentTab}
          isLoading={isLoading}
        />
      )}

      {currentTab === "meeting" && (
        <MeetingCopilotView
          settings={settings}
          resume={resume}
        />
      )}

      {currentTab === "practice" && (
        <PracticeRoomView
          settings={settings}
          onSessionSaved={handleSessionSaved}
          initialQuestion={practiceQuestion}
        />
      )}

      {currentTab === "coding" && (
        <CodingLabView
          settings={settings}
          onSessionSaved={handleSessionSaved}
        />
      )}

      {currentTab === "resume" && (
        <ResumeView
          resume={resume}
          onRefreshResume={handleRefreshResume}
          onPracticeQuestion={handlePracticeQuestionFromResume}
        />
      )}

      {currentTab === "history" && (
        <HistoryView
          sessions={sessions}
          onRefreshSessions={handleRefreshSessions}
          isLoading={isLoading}
        />
      )}

      {currentTab === "settings" && (
        <SettingsView
          settings={settings}
          onSettingsUpdated={setSettings}
          onClearHistory={handleClearAllHistory}
          onClearResume={handleClearResume}
        />
      )}
    </AppShell>
  );
}
