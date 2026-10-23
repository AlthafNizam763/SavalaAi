"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Sparkles,
  Copy,
  Trash2,
  Save,
  Check,
  AlertCircle,
  HelpCircle,
  Loader2,
  MessageSquare,
  ThumbsUp,
  Brain,
} from "lucide-react";
import { UserSettingsData, SessionData } from "@/types";

interface PracticeRoomViewProps {
  settings: UserSettingsData | null;
  onSessionSaved?: (session: SessionData) => void;
  initialQuestion?: string;
}

export const PracticeRoomView: React.FC<PracticeRoomViewProps> = ({
  settings,
  onSessionSaved,
  initialQuestion = "Tell me about a challenging technical system design trade-off you had to make, and how you evaluated the options.",
}) => {
  // Practice Question State
  const [question, setQuestion] = useState(initialQuestion);
  const targetRole = settings?.defaultJobRole || "Full-Stack Software Engineer";
  const difficulty = settings?.interviewDifficulty || "Medium";

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Transcript State
  const [transcript, setTranscript] = useState("");
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // AI Analysis State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Refs for audio media recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const stopMediaTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Cleanup microphone streams on unmount
  useEffect(() => {
    return () => {
      stopMediaTracks();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    setMicPermissionError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicPermissionError("Your browser does not support audio recording via getUserMedia. Please use Chrome, Firefox, or Edge.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const type = mimeType || "audio/webm";
        const recordedBlob = new Blob(audioChunksRef.current, { type });
        stopMediaTracks();

        if (settings?.audioAutoTranscribe !== false) {
          await sendAudioForTranscription(recordedBlob, type);
        }
      };

      recorder.start(1000);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 300) {
            stopRecording();
            return 300;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: unknown) {
      stopMediaTracks();
      const message = err instanceof Error ? err.message : "Microphone access denied.";
      if (message.includes("Permission denied") || message.includes("NotAllowedError")) {
        setMicPermissionError("Microphone permission was denied. Please allow microphone access in your browser address bar.");
      } else {
        setMicPermissionError(`Could not access microphone: ${message}`);
      }
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const sendAudioForTranscription = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    setMicPermissionError(null);

    try {
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      formData.append("mimeType", mimeType);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTranscript((prev) => (prev ? `${prev}\n\n${data.transcript}` : data.transcript));
      } else {
        const errMsg = data.error || "Transcription failed.";
        setMicPermissionError(`${errMsg} You can also type or paste your spoken answer directly into the transcript box below.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error during transcription.";
      setMicPermissionError(`Transcription request failed: ${message}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleCopyTranscript = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearTranscript = () => {
    if (window.confirm("Are you sure you want to clear this transcript?")) {
      setTranscript("");
      setAiAnalysis(null);
    }
  };

  const requestAiAnalysis = async (mode: "feedback" | "model_answer" | "concept") => {
    if (!transcript && mode !== "model_answer") {
      alert("Please record or enter a transcript first so AI can review your response.");
      return;
    }

    setAiLoading(true);

    try {
      let action: "transcript_analysis" | "interview_answer" | "concept_explanation" = "transcript_analysis";
      let prompt = `Interview Question: "${question}"\nTarget Role: ${targetRole}\nDifficulty: ${difficulty}`;

      if (mode === "model_answer") {
        action = "interview_answer";
        prompt = `Please provide a masterclass model answer using the STAR method for this interview question: "${question}". Target role: ${targetRole}.`;
      } else if (mode === "concept") {
        action = "concept_explanation";
        prompt = `Explain the core concepts and trade-offs relevant to this interview question: "${question}".`;
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          prompt,
          transcript: mode !== "model_answer" ? transcript : undefined,
          jobRole: targetRole,
          difficulty,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setAiAnalysis(data.content);
      } else {
        setAiAnalysis(`AI Response Notice: ${data.error || "Could not generate analysis. Please check your provider API key in Settings."}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      setAiAnalysis(`Request failed: ${message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const saveSession = async () => {
    if (!transcript && !aiAnalysis) {
      alert("Please record an answer or generate an evaluation before saving the session.");
      return;
    }

    setSaveStatus("saving");

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: question.substring(0, 70) + (question.length > 70 ? "..." : ""),
          sessionType: "interview",
          targetRole,
          difficulty,
          transcriptText: transcript,
          aiFeedback: aiAnalysis || "Session saved without evaluation.",
          durationSeconds: recordingSeconds,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSaveStatus("saved");
        if (onSessionSaved && data.session) {
          onSessionSaved(data.session);
        }
        setTimeout(() => setSaveStatus(null), 3500);
      } else {
        alert(data.error || "Failed to persist session.");
        setSaveStatus(null);
      }
    } catch {
      alert("Network error saving practice session.");
      setSaveStatus("error");
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header and Context Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Practice Room</h1>
          <p className="text-xs text-[#737373] mt-1">
            Speak naturally. Record your answers, review automated transcripts, and receive expert AI coaching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "saved" ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <Check className="h-3.5 w-3.5" /> Session Saved
            </span>
          ) : (
            <button
              onClick={saveSession}
              disabled={(!transcript && !aiAnalysis) || saveStatus === "saving"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black shadow-xs hover:bg-[#E5E5E5] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saveStatus === "saving" ? "Saving..." : "Save Session"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Target Question Box */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-white" />
            Interview Question
          </span>
          <div className="flex items-center gap-3 lowercase text-[#737373]">
            <span>Role: <strong className="text-white capitalize">{targetRole}</strong></span>
            <span>•</span>
            <span>Level: <strong className="text-white capitalize">{difficulty}</strong></span>
          </div>
        </div>

        <textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full resize-none rounded-xl border border-white/[0.12] bg-white/[0.03] p-3 text-sm font-medium text-white placeholder-[#555] focus:border-white focus:outline-hidden"
          placeholder="Enter the mock interview question..."
        />

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[#737373]">Quick presets:</span>
          <button
            onClick={() =>
              setQuestion("Describe how you debugged a high-latency regression in a production service under load.")
            }
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-[#A3A3A3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Production Latency Bug
          </button>
          <button
            onClick={() =>
              setQuestion("How do you design an idempotent payment processing API to handle network retries?")
            }
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-[#A3A3A3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Idempotent Payment API
          </button>
          <button
            onClick={() =>
              setQuestion("Tell me about a time you strongly disagreed with a product specification or engineering decision.")
            }
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-[#A3A3A3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Conflict / Disagreement
          </button>
        </div>
      </div>

      {/* Recording Console */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-6 shadow-xs text-center space-y-4">
        {micPermissionError && (
          <div className="rounded-xl bg-amber-500/10 p-3 text-left text-xs text-amber-200 border border-amber-500/20 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-white">Notice:</span> {micPermissionError}
            </div>
          </div>
        )}

        {/* Visualizer & Timer */}
        <div className="flex flex-col items-center justify-center space-y-3 py-2">
          <div className="relative flex items-center justify-center">
            {isRecording && (
              <span className="absolute h-24 w-24 rounded-full bg-white/20 animate-ping" />
            )}
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
                isRecording
                  ? "bg-white text-black shadow-lg ring-8 ring-white/20"
                  : "bg-white/10 text-white border border-white/10"
              }`}
            >
              <Mic className={`h-8 w-8 ${isRecording ? "animate-pulse" : ""}`} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-extrabold tracking-tight font-mono text-white">
              {formatTimer(recordingSeconds)}
            </div>
            <p className="text-xs text-[#737373]">
              {isRecording
                ? "Recording microphone audio... Speak clearly. Click Stop when finished."
                : isTranscribing
                ? "Transcribing your audio with AI..."
                : "Microphone is idle. Press Start Recording to begin."}
            </p>
          </div>
        </div>

        {/* Record Controls */}
        <div className="flex justify-center items-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isTranscribing}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-black shadow-xs hover:bg-[#E5E5E5] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Mic className="h-4 w-4" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
            >
              <Square className="h-4 w-4 fill-white" />
              <span>Stop & Transcribe</span>
            </button>
          )}

          {isTranscribing && (
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-white">
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              <span>Transcribing audio...</span>
            </div>
          )}
        </div>
      </div>

      {/* Two-Column Workspace: Transcript Editor & AI Coaching Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Transcript Display & Editor */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Your Spoken Transcript</span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[#A3A3A3]">
                {transcript.trim() ? `${transcript.trim().split(/\s+/).length} words` : "0 words"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyTranscript}
                disabled={!transcript}
                className="rounded-lg p-1.5 text-[#737373] hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                title="Copy Transcript"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                onClick={handleClearTranscript}
                disabled={!transcript}
                className="rounded-lg p-1.5 text-[#737373] hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-30 cursor-pointer"
                title="Clear Transcript"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <textarea
            rows={10}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Your spoken transcription will appear here after recording stops. You can also type or edit your answer directly here..."
            className="flex-1 w-full rounded-xl border border-white/[0.10] bg-white/[0.03] p-3 text-sm font-normal text-white leading-relaxed placeholder-[#555] focus:border-white focus:outline-hidden"
          />

          {/* Quick AI Coaching Actions */}
          <div className="pt-2 border-t border-white/[0.08] flex flex-wrap gap-2">
            <button
              onClick={() => requestAiAnalysis("feedback")}
              disabled={aiLoading || !transcript}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black hover:bg-[#E5E5E5] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Brain className="h-3.5 w-3.5" />
              <span>Evaluate My Answer</span>
            </button>

            <button
              onClick={() => requestAiAnalysis("model_answer")}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-white" />
              <span>Generate Model STAR Answer</span>
            </button>

            <button
              onClick={() => requestAiAnalysis("concept")}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <HelpCircle className="h-3.5 w-3.5 text-white" />
              <span>Deep-Dive Concept</span>
            </button>
          </div>
        </div>

        {/* Right: AI Coaching & Feedback Panel */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">
                AI Assessment & Feedback
              </span>
            </div>
            <span className="text-[11px] font-semibold capitalize text-[#737373]">
              Provider: {settings?.activeProviderName || settings?.activeProvider || "Gemini"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[240px]">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-[#737373] space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
                <p className="text-xs font-medium">Savala AI is evaluating your response...</p>
              </div>
            ) : aiAnalysis ? (
              <div className="text-white text-xs leading-relaxed whitespace-pre-wrap">
                {aiAnalysis}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center text-[#737373] space-y-2">
                <ThumbsUp className="h-8 w-8 text-[#555]" />
                <h4 className="text-sm font-semibold text-white">Ready for evaluation</h4>
                <p className="text-xs max-w-xs">
                  Record your answer or click &quot;Evaluate My Answer&quot; to receive structured feedback on communication, technical accuracy, and delivery.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
