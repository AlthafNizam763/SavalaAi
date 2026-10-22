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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5DD] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3A0F34]">Session History</h1>
          <p className="text-xs sm:text-sm text-[#58505C]">
            Review your past mock interviews, transcripts, coding sessions, and AI feedback.
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            onClick={handleClearAllHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear All History</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-[#58505C]" />
        {["all", "interview", "coding"].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
              filterType === type
                ? "bg-[#3A0F34] text-white shadow-xs"
                : "bg-white text-[#58505C] border border-[#CBD5DD] hover:bg-[#F4F7F9]"
            }`}
          >
            {type === "all" ? `All (${sessions.length})` : type}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="rounded-xl border border-[#CBD5DD] bg-white p-12 text-center text-sm text-[#58505C]">
          Loading session history...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5DD] bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#DDE3E8]/60 text-[#3A0F34]">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#1F1722]">No saved sessions found</h3>
            <p className="text-xs text-[#58505C] mt-1">
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
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[#CBD5DD] bg-white p-4 shadow-xs hover:border-[#3A0F34] hover:shadow-sm cursor-pointer transition-all"
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#DDE3E8]/60 text-[#3A0F34] group-hover:bg-[#3A0F34] group-hover:text-white transition-colors">
                  {session.sessionType === "coding" ? (
                    <Code2 className="h-5 w-5" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-sm font-bold text-[#1F1722]">
                      {session.title}
                    </h4>
                    <span className="rounded-md bg-[#DDE3E8] px-2 py-0.5 text-[10px] font-semibold text-[#3A0F34] capitalize">
                      {session.sessionType}
                    </span>
                  </div>

                  <p className="truncate text-xs text-[#58505C]">
                    {session.transcriptText
                      ? session.transcriptText.substring(0, 100) + "..."
                      : session.notes || "Practice Session Details Available"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 pl-14 sm:pl-0">
                <div className="text-right text-xs text-[#58505C]">
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
                    <span className="block font-medium text-[#3A0F34]">
                      {Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s
                    </span>
                  )}
                </div>

                <button
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  disabled={isDeleting === session.id}
                  className="rounded-lg p-2 text-[#58505C] hover:bg-red-50 hover:text-red-600 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-[#CBD5DD] space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#CBD5DD] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-md bg-[#3A0F34] px-2 py-0.5 text-[10px] font-bold text-white capitalize">
                    {selectedSession.sessionType}
                  </span>
                  <span className="text-xs text-[#58505C]">
                    {new Date(selectedSession.createdAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#1F1722]">{selectedSession.title}</h3>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-lg p-1.5 text-[#58505C] hover:bg-[#F4F7F9]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Transcript if present */}
            {selectedSession.transcriptText && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#3A0F34]">
                  Recorded Transcript
                </h4>
                <div className="rounded-lg bg-[#F4F7F9] p-4 text-xs font-normal text-[#1F1722] leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedSession.transcriptText}
                </div>
              </div>
            )}

            {/* Notes or Prompt */}
            {selectedSession.notes && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#3A0F34]">
                  Session Context / Question
                </h4>
                <p className="text-xs text-[#58505C]">{selectedSession.notes}</p>
              </div>
            )}

            {/* Messages / AI Responses */}
            {selectedSession.messages && selectedSession.messages.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#3A0F34] flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#EAAA00]" />
                  AI Feedback & Evaluation
                </h4>

                <div className="space-y-3">
                  {selectedSession.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl p-4 text-xs leading-relaxed ${
                        msg.role === "assistant"
                          ? "bg-[#F4F7F9] border border-[#CBD5DD] text-[#1F1722]"
                          : "bg-[#3A0F34] text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-[10px] uppercase tracking-wider mb-1.5 opacity-80">
                        <span>{msg.role === "assistant" ? "Savala AI Mentor" : "User Input"}</span>
                        {msg.provider && <span>{msg.provider}</span>}
                      </div>
                      <div className="whitespace-pre-wrap font-mono text-xs">{msg.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-[#CBD5DD]">
              <button
                onClick={() => setSelectedSession(null)}
                className="rounded-lg bg-[#3A0F34] px-4 py-2 text-xs font-semibold text-white hover:bg-[#270A23]"
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
