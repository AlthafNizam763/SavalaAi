"use client";

import React from "react";
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
  // Compute real activity metrics
  const totalSessions = sessions.length;
  const totalDurationSeconds = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalMinutes = Math.round(totalDurationSeconds / 60);
  const codingSessions = sessions.filter((s) => s.sessionType === "coding").length;
  const interviewSessions = sessions.filter((s) => s.sessionType === "interview").length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#3A0F34] p-6 sm:p-8 text-white shadow-sm border border-[#3A0F34]">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EAAA00]/20 px-3 py-1 text-xs font-semibold text-[#EAAA00] border border-[#EAAA00]/30">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Interview & Technical Readiness Workspace</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name?.split(" ")[0] || "Candidate"}!
          </h1>
          <p className="text-sm sm:text-base text-[#DDE3E8]/90 leading-relaxed">
            Practice realistic mock interview questions with microphone audio recording, solve algorithmic challenges in the Coding Lab, and analyze your resume for targeted technical questions.
          </p>

            <button
              onClick={() => onNavigate("meeting")}
              className="inline-flex items-center gap-2 rounded-xl bg-[#EAAA00] px-5 py-3 text-sm font-bold text-[#270A23] shadow-sm hover:bg-[#CF9400] transition-colors"
            >
              <Video className="h-4 w-4" />
              <span>Launch Meeting Copilot</span>
            </button>

            <button
              onClick={() => onNavigate("practice")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <Mic className="h-4 w-4" />
              <span>Practice Room</span>
            </button>

            <button
              onClick={() => onNavigate("coding")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <Code2 className="h-4 w-4" />
              <span>Coding Lab</span>
            </button>
        </div>

        {/* Ambient background decoration */}
        <div
          className="absolute -right-12 -bottom-16 h-64 w-64 rounded-full bg-[#EAAA00]/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#58505C]">
              Total Sessions
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DDE3E8]/60 text-[#3A0F34]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#1F1722]">{totalSessions}</div>
          <span className="text-xs text-[#58505C] mt-1 block">
            {interviewSessions} Mock Interviews · {codingSessions} Coding Labs
          </span>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#58505C]">
              Speaking Time
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DDE3E8]/60 text-[#3A0F34]">
              <Mic className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#1F1722]">{totalMinutes} min</div>
          <span className="text-xs text-[#58505C] mt-1 block">
            Total recorded practice duration
          </span>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#58505C]">
              Resume Status
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DDE3E8]/60 text-[#3A0F34]">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-xl font-bold text-[#1F1722] flex items-center gap-2">
            {resume ? (
              <span className="text-emerald-700 flex items-center gap-1.5 text-base">
                <CheckCircle2 className="h-4 w-4" /> Parsed & Active
              </span>
            ) : (
              <span className="text-[#58505C] text-base">Not Uploaded</span>
            )}
          </div>
          <span className="text-xs text-[#58505C] mt-1 block">
            {resume ? `${resume.parsedSkills?.length || 0} skills indexed` : "Upload PDF to generate questions"}
          </span>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#58505C]">
              AI Provider
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DDE3E8]/60 text-[#3A0F34]">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-[#1F1722] capitalize">
            {settings?.activeProvider || "Gemini"}
          </div>
          <span className="text-xs text-[#58505C] mt-1 block truncate">
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
              <h2 className="text-lg font-bold text-[#3A0F34]">Recent Practice Sessions</h2>
              <p className="text-xs text-[#58505C]">Persisted history of your interview simulations and coding labs</p>
            </div>
            {sessions.length > 0 && (
              <button
                onClick={() => onNavigate("history")}
                className="text-xs font-semibold text-[#3A0F34] hover:text-[#EAAA00] flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-[#CBD5DD] bg-white p-12 text-center text-sm text-[#58505C]">
              Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#CBD5DD] bg-white p-10 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#DDE3E8]/50 text-[#3A0F34]">
                <Mic className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1F1722]">No practice sessions recorded yet</h3>
                <p className="text-xs text-[#58505C] max-w-sm mx-auto mt-1">
                  Start your first mock interview with live speech recording or open the coding lab to debug code.
                </p>
              </div>
              <button
                onClick={() => onNavigate("practice")}
                className="inline-flex items-center gap-2 rounded-lg bg-[#EAAA00] px-4 py-2 text-xs font-bold text-[#270A23] hover:bg-[#CF9400] transition-colors"
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
                  className="group flex items-center justify-between rounded-xl border border-[#CBD5DD] bg-white p-4 shadow-xs hover:border-[#3A0F34] hover:shadow-sm cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#DDE3E8]/60 text-[#3A0F34] group-hover:bg-[#3A0F34] group-hover:text-white transition-colors">
                      {session.sessionType === "coding" ? (
                        <Code2 className="h-5 w-5" />
                      ) : (
                        <Mic className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm font-semibold text-[#1F1722]">
                          {session.title}
                        </h4>
                        <span className="rounded-md bg-[#DDE3E8] px-2 py-0.5 text-[10px] font-medium text-[#3A0F34] capitalize">
                          {session.sessionType}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[#58505C] mt-0.5">
                        {session.transcriptText
                          ? session.transcriptText.substring(0, 80) + "..."
                          : session.targetRole || "Session notes available"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 pl-3">
                    <span className="text-xs text-[#58505C]">
                      {new Date(session.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {session.durationSeconds > 0 && (
                      <span className="block text-[11px] font-medium text-[#3A0F34]">
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
            <h2 className="text-lg font-bold text-[#3A0F34]">Resume & Readiness</h2>
            <p className="text-xs text-[#58505C]">Tailor mock questions to your background</p>
          </div>

          <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs space-y-4">
            {resume ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <FileCheck2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-bold text-[#1F1722]">{resume.fileName}</h4>
                    <span className="text-[11px] text-[#58505C]">
                      {(resume.fileSizeBytes / 1024).toFixed(1)} KB · Analyzed
                    </span>
                  </div>
                </div>

                {resume.parsedSummary && (
                  <p className="text-xs text-[#58505C] leading-relaxed line-clamp-3">
                    {resume.parsedSummary}
                  </p>
                )}

                {resume.parsedSkills && resume.parsedSkills.length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#58505C] mb-2">
                      Key Competencies
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.parsedSkills.slice(0, 8).map((skill, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-[#DDE3E8] px-2 py-0.5 text-[11px] font-medium text-[#3A0F34]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => onNavigate("resume")}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#CBD5DD] py-2 text-xs font-semibold text-[#3A0F34] hover:bg-[#F4F7F9] transition-colors"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Inspect Full Resume Analysis</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#DDE3E8]/60 text-[#3A0F34]">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#1F1722]">No resume uploaded</h4>
                  <p className="text-xs text-[#58505C] mt-1">
                    Upload your PDF resume to extract skills and automatically generate tailored mock questions.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate("resume")}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#3A0F34] px-4 py-2 text-xs font-semibold text-white hover:bg-[#270A23] transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5 text-[#EAAA00]" />
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
