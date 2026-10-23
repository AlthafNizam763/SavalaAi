"use client";

import React from "react";
import Image from "next/image";
import {
  Mic,
  Code2,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  PlusCircle,
  FileCheck2,
  CheckCircle2,
  Video,
} from "lucide-react";
import { SessionData, ResumeData, UserSettingsData, AppUser } from "@/types";
import { NavTab } from "../layout/AppShell";

interface DashboardViewProps {
  sessions: SessionData[];
  resume: ResumeData | null;
  settings: UserSettingsData | null;
  user: AppUser | null;
  onNavigate: (tab: NavTab) => void;
  isLoading?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sessions,
  resume,
  settings,
  user,
  onNavigate,
  isLoading = false,
}) => {
  const totalSessions = sessions.length;
  const totalDurationSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalMinutes = Math.round(totalDurationSeconds / 60);
  const codingSessions = sessions.filter((s) => s.sessionType === "coding").length;
  const interviewSessions = sessions.filter((s) => s.sessionType === "interview").length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner with Official Savala Mascot */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#121212]/90 backdrop-blur-2xl p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Live Interview & Technical Readiness Copilot</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name?.split(" ")[0] || "Candidate"}!
          </h1>
          <p className="text-sm sm:text-base text-[#A3A3A3] leading-relaxed">
            Real-time live interview assistance with speech detection, instant structured answers in English & Malayalam, algorithmic practice in the Coding Lab, and multi-provider AI key management.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate("meeting")}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#080808] shadow-xs hover:bg-[#E5E5E5] transition-all cursor-pointer"
            >
              <Video className="h-4 w-4" />
              <span>Launch Live Copilot</span>
            </button>

            <button
              onClick={() => onNavigate("practice")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Mic className="h-4 w-4" />
              <span>Practice Room</span>
            </button>

            <button
              onClick={() => onNavigate("coding")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Code2 className="h-4 w-4" />
              <span>Coding Lab</span>
            </button>
          </div>
        </div>

        {/* Mascot Character Showcase */}
        <div className="relative z-10 flex-shrink-0 flex flex-col items-center">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white/[0.04] border border-white/20 p-3 shadow-2xl backdrop-blur-md flex items-center justify-center transform hover:scale-105 transition-transform">
            <Image
              src="/logo.png"
              alt="Savala AI Ninja Mascot"
              width={160}
              height={160}
              className="w-full h-full object-contain filter drop-shadow-md"
              priority
            />
          </div>
          <span className="mt-2 text-[11px] font-bold tracking-wider text-[#A3A3A3] uppercase bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
            Savala Ninja Sensei
          </span>
        </div>

        {/* Subtle Ambient Glow */}
        <div
          className="absolute -right-12 -bottom-16 h-64 w-64 rounded-full bg-white/[0.03] blur-3xl pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Total Sessions
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{totalSessions}</div>
          <span className="text-xs text-[#737373] mt-1 block">
            {interviewSessions} Interviews · {codingSessions} Coding Labs
          </span>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Speaking Time
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
              <Mic className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{totalMinutes} min</div>
          <span className="text-xs text-[#737373] mt-1 block">
            Total recorded practice duration
          </span>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              Resume Status
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-xl font-bold text-white flex items-center gap-2">
            {resume ? (
              <span className="text-emerald-400 flex items-center gap-1.5 text-base">
                <CheckCircle2 className="h-4 w-4" /> Parsed & Active
              </span>
            ) : (
              <span className="text-[#737373] text-base">Not Uploaded</span>
            )}
          </div>
          <span className="text-xs text-[#737373] mt-1 block">
            {resume ? `${resume.parsedSkills?.length || 0} skills indexed` : "Upload PDF to generate questions"}
          </span>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
              AI Provider
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white capitalize">
            {settings?.activeProviderName || settings?.activeProvider || "Gemini"}
          </div>
          <span className="text-xs text-[#737373] mt-1 block truncate font-mono">
            Model: {settings?.preferredModel || "gemini-2.5-flash"}
          </span>
        </div>
      </div>

      {/* Main Grid: Resume Overview + Recent Practice Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Sessions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Recent Practice Sessions</h2>
              <p className="text-xs text-[#737373]">Persisted history of your interview simulations and coding labs</p>
            </div>
            {sessions.length > 0 && (
              <button
                onClick={() => onNavigate("history")}
                className="text-xs font-semibold text-[#A3A3A3] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-12 text-center text-sm text-[#737373]">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.01] p-10 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white">
                <Mic className="h-6 w-6 text-[#A3A3A3]" />
              </div>
              <div>
                <h3 className="font-semibold text-white">No practice sessions recorded yet</h3>
                <p className="text-xs text-[#737373] max-w-sm mx-auto mt-1">
                  Start your first mock interview with live speech recording or open the coding lab to debug code.
                </p>
              </div>
              <button
                onClick={() => onNavigate("practice")}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-[#E5E5E5] transition-colors cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Begin Your First Practice</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 4).map((session) => (
                <div
                  key={session.id}
                  onClick={() => onNavigate("history")}
                  className="group flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-xs hover:border-white/30 hover:bg-white/[0.04] cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-white group-hover:bg-white group-hover:text-black transition-colors">
                      {session.sessionType === "coding" ? (
                        <Code2 className="h-5 w-5" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-semibold text-white">
                          {session.title}
                        </h4>
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-[#A3A3A3] capitalize">
                          {session.sessionType}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[#737373] mt-0.5">
                        {session.transcriptText
                          ? session.transcriptText.substring(0, 80) + "..."
                          : session.targetRole || "Session notes available"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-3">
                    <span className="text-xs text-[#737373]">
                      {new Date(session.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {session.durationSeconds > 0 && (
                      <span className="block text-[11px] font-medium text-[#A3A3A3]">
                        {Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Active Resume & Readiness Card */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-white">Resume & Readiness</h2>
            <p className="text-xs text-[#737373]">Tailor mock questions to your background</p>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs space-y-4">
            {resume ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-bold text-white">{resume.fileName}</h4>
                    <span className="text-[11px] text-[#737373]">
                      {(resume.fileSizeBytes / 1024).toFixed(1)} KB · Analyzed
                    </span>
                  </div>
                </div>

                {resume.parsedSummary && (
                  <p className="text-xs text-[#A3A3A3] leading-relaxed line-clamp-3">
                    {resume.parsedSummary}
                  </p>
                )}

                {resume.parsedSkills && resume.parsedSkills.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] mb-2">
                      Key Competencies
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.parsedSkills.slice(0, 8).map((skill, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-[#A3A3A3]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onNavigate("resume")}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Inspect Full Resume Analysis</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white">
                  <FileText className="h-5 w-5 text-[#A3A3A3]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">No resume uploaded</h4>
                  <p className="text-xs text-[#737373] mt-1">
                    Upload your PDF resume to extract skills and automatically generate tailored mock questions.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate("resume")}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-[#E5E5E5] transition-colors cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Upload Resume (PDF)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
