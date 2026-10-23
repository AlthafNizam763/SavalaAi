"use client";

import React, { useState } from "react";
import {
  History,
  Mic,
  Code2,
  Trash2,
  X,
  Sparkles,
  Calendar,
  Filter,
} from "lucide-react";
import { SessionData } from "@/types";

interface HistoryViewProps {
  sessions: SessionData[];
  onRefreshSessions: () => void;
  isLoading?: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  onRefreshSessions,
  isLoading = false,
}) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filteredSessions = sessions.filter((s) => {
    if (filterType === "all") return true;
    return s.sessionType === filterType;
  });

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this session?")) return;

    setIsDeleting(id);
    try {
      const response = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (response.ok) {
        if (selectedSession?.id === id) setSelectedSession(null);
        onRefreshSessions();
      }
    } catch {
      alert("Failed to delete session.");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleClearAllHistory = async () => {
    if (!window.confirm("Are you sure you want to delete ALL practice sessions? This action cannot be reversed.")) return;

    try {
      const response = await fetch("/api/sessions", { method: "DELETE" });
      if (response.ok) {
        setSelectedSession(null);
        onRefreshSessions();
      }
    } catch {
      alert("Failed to clear sessions.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Session History</h1>
          <p className="text-xs text-[#737373] mt-1">
            Review your past mock interviews, transcripts, coding sessions, and AI feedback.
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={handleClearAllHistory}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear All History</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[#737373]" />
        {["all", "interview", "coding"].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all cursor-pointer ${
              filterType === type
                ? "bg-white text-black font-bold shadow-xs"
                : "bg-white/[0.03] text-[#A3A3A3] border border-white/[0.08] hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            {type === "all" ? `All (${sessions.length})` : type}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-12 text-center text-sm text-[#737373]">
          Loading session history...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.01] p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white">
            <History className="h-6 w-6 text-[#A3A3A3]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">No saved sessions found</h3>
            <p className="text-xs text-[#737373] mt-1">
              Complete a mock interview or save a solution in the Coding Lab to see your records here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              onClick={() => setSelectedSession(session)}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-xs hover:border-white/30 hover:bg-white/[0.04] cursor-pointer transition-all"
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-white group-hover:bg-white group-hover:text-black transition-colors">
                  {session.sessionType === "coding" ? (
                    <Code2 className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-bold text-white">
                      {session.title}
                    </h4>
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#A3A3A3] capitalize">
                      {session.sessionType}
                    </span>
                  </div>

                  <p className="truncate text-xs text-[#737373]">
                    {session.transcriptText
                      ? session.transcriptText.substring(0, 100) + "..."
                      : session.notes || "Practice Session Details Available"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 pl-14 sm:pl-0">
                <div className="text-right text-xs text-[#737373]">
                  <div className="flex items-center gap-1 sm:justify-end">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(session.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {session.durationSeconds > 0 && (
                    <span className="block font-medium text-white">
                      {Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  disabled={isDeleting === session.id}
                  className="rounded-lg p-2 text-[#737373] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  title="Delete Session"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#101010] p-6 shadow-2xl border border-white/[0.12] space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white capitalize">
                    {selectedSession.sessionType}
                  </span>
                  <span className="text-xs text-[#737373]">
                    {new Date(selectedSession.createdAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{selectedSession.title}</h3>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-lg p-1.5 text-[#737373] hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Transcript if present */}
            {selectedSession.transcriptText && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Recorded Transcript
                </h4>
                <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 text-xs font-normal text-white/90 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedSession.transcriptText}
                </div>
              </div>
            )}

            {/* Notes or Prompt */}
            {selectedSession.notes && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Session Context / Question
                </h4>
                <p className="text-xs text-[#737373]">{selectedSession.notes}</p>
              </div>
            )}

            {/* Messages / AI Responses */}
            {selectedSession.messages && selectedSession.messages.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                  AI Feedback & Evaluation
                </h4>

                <div className="space-y-3">
                  {selectedSession.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl p-4 text-xs leading-relaxed border ${
                        msg.role === "assistant"
                          ? "bg-white/[0.03] border-white/[0.08] text-white/90"
                          : "bg-white/10 border-white/20 text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-wider mb-1.5 text-[#737373]">
                        <span>{msg.role === "assistant" ? "Savala AI Mentor" : "User Input"}</span>
                        {msg.provider && <span>{msg.provider}</span>}
                      </div>
                      <div className="whitespace-pre-wrap font-mono text-xs">{msg.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-white/[0.08]">
              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-[#E5E5E5] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
