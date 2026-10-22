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

    // Check browser support
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

      // Determine supported mime type
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

        // If auto-transcribe is enabled, automatically send to transcription route
        if (settings?.audioAutoTranscribe !== false) {
          await sendAudioForTranscription(recordedBlob, type);
        }
      };

      recorder.start(1000); // 1-second chunks
      setIsRecording(true);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 300) {
            // Enforce maximum 5 minutes recording limit
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
        // If STT provider has no API key configured, provide a helpful actionable banner
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

  // Ask AI about the spoken transcript
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

  // Save session to database
  const saveSession = async () => {
    if (!transcript && !aiAnalysis) {
      alert("No transcript or AI analysis to save.");
      return;
    }

    setSaveStatus("saving");
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Mock Interview: ${question.substring(0, 50)}...`,
          sessionType: "interview",
          transcriptText: transcript,
          durationSeconds: recordingSeconds,
          targetRole,
          notes: question,
          messages: aiAnalysis
            ? [
                {
                  role: "user",
                  content: transcript || `Question: ${question}`,
                },
                {
                  role: "assistant",
                  content: aiAnalysis,
                  provider: settings?.activeProvider || "gemini",
                },
              ]
            : [],
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSaveStatus("saved");
        if (onSessionSaved && data.session) {
          onSessionSaved(data.session);
        }
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5DD] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3A0F34]">Practice Room</h1>
          <p className="text-xs sm:text-sm text-[#58505C]">
            Speak naturally. Record your answers, review automated transcripts, and receive expert AI coaching.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "saved" ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <Check className="h-3.5 w-3.5" /> Session Saved
            </span>
          ) : (
            <button
              onClick={saveSession}
              disabled={(!transcript && !aiAnalysis) || saveStatus === "saving"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5DD] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3A0F34] shadow-xs hover:bg-[#F4F7F9] disabled:opacity-50 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saveStatus === "saving" ? "Saving..." : "Save Session"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Target Question Box */}
      <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#3A0F34]">
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-[#EAAA00]" />
            Interview Question
          </span>
          <div className="flex items-center gap-3 lowercase text-[#58505C]">
            <span>Role: <strong className="text-[#3A0F34] capitalize">{targetRole}</strong></span>
            <span>•</span>
            <span>Level: <strong className="text-[#3A0F34] capitalize">{difficulty}</strong></span>
          </div>
        </div>

        <textarea
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full resize-none rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] p-3 text-sm font-medium text-[#1F1722] focus:border-[#3A0F34] focus:bg-white focus:outline-hidden"
          placeholder="Enter the mock interview question..."
        />

        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[#58505C]">Quick presets:</span>
          <button
            onClick={() =>
              setQuestion("Describe how you debugged a high-latency regression in a production service under load.")
            }
            className="rounded-md bg-[#DDE3E8]/60 px-2 py-1 text-[11px] font-medium text-[#3A0F34] hover:bg-[#DDE3E8]"
          >
            Production Latency Bug
          </button>
          <button
            onClick={() =>
              setQuestion("How do you design an idempotent payment processing API to handle network retries?")
            }
            className="rounded-md bg-[#DDE3E8]/60 px-2 py-1 text-[11px] font-medium text-[#3A0F34] hover:bg-[#DDE3E8]"
          >
            Idempotent Payment API
          </button>
          <button
            onClick={() =>
              setQuestion("Tell me about a time you strongly disagreed with a product specification or engineering decision.")
            }
            className="rounded-md bg-[#DDE3E8]/60 px-2 py-1 text-[11px] font-medium text-[#3A0F34] hover:bg-[#DDE3E8]"
          >
            Conflict / Disagreement
          </button>
        </div>
      </div>

      {/* Recording Console */}
      <div className="rounded-xl border border-[#CBD5DD] bg-white p-6 shadow-xs text-center space-y-4">
        {/* Permission / Status Alert */}
        {micPermissionError && (
          <div className="rounded-lg bg-amber-50 p-3 text-left text-xs text-amber-900 border border-amber-200 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Notice:</span> {micPermissionError}
            </div>
          </div>
        )}

        {/* Visualizer & Timer */}
        <div className="flex flex-col items-center justify-center space-y-3 py-2">
          <div className="relative flex items-center justify-center">
            {isRecording && (
              <span className="absolute h-24 w-24 rounded-full bg-[#EAAA00]/25 animate-ping" />
            )}
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-full transition-all ${
                isRecording
                  ? "bg-[#EAAA00] text-[#270A23] shadow-md ring-8 ring-[#EAAA00]/20"
                  : "bg-[#3A0F34] text-[#DDE3E8]"
              }`}
            >
              <Mic className={`h-8 w-8 ${isRecording ? "animate-pulse" : ""}`} />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-extrabold tracking-tight font-mono text-[#3A0F34]">
              {formatTimer(recordingSeconds)}
            </div>
            <p className="text-xs text-[#58505C]">
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
              className="inline-flex items-center gap-2 rounded-xl bg-[#EAAA00] px-6 py-3 text-sm font-bold text-[#270A23] shadow-sm hover:bg-[#CF9400] disabled:opacity-50 transition-colors"
            >
              <Mic className="h-4 w-4" />
              <span>Start Recording</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="inline-flex items-center gap-2 rounded-xl bg-[#DC2626] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#B91C1C] transition-colors"
            >
              <Square className="h-4 w-4" />
              <span>Stop & Transcribe</span>
            </button>
          )}

          {isTranscribing && (
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#3A0F34]">
              <Loader2 className="h-4 w-4 animate-spin text-[#EAAA00]" />
              <span>Transcribing audio...</span>
            </div>
          )}
        </div>
      </div>

      {/* Two-Column Workspace: Transcript Editor & AI Coaching Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Transcript Display & Editor */}
        <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#3A0F34]">Your Spoken Transcript</span>
              <span className="rounded-md bg-[#DDE3E8] px-2 py-0.5 text-[10px] font-semibold text-[#3A0F34]">
                {transcript.trim() ? `${transcript.trim().split(/\s+/).length} words` : "0 words"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyTranscript}
                disabled={!transcript}
                className="rounded-lg p-1.5 text-[#58505C] hover:bg-[#F4F7F9] hover:text-[#3A0F34] disabled:opacity-30"
                title="Copy Transcript"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                onClick={handleClearTranscript}
                disabled={!transcript}
                className="rounded-lg p-1.5 text-[#58505C] hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
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
            className="flex-1 w-full rounded-lg border border-[#CBD5DD] p-3 text-sm font-normal text-[#1F1722] leading-relaxed focus:border-[#3A0F34] focus:outline-hidden"
          />

          {/* Quick AI Coaching Actions */}
          <div className="pt-2 border-t border-[#CBD5DD] flex flex-wrap gap-2">
            <button
              onClick={() => requestAiAnalysis("feedback")}
              disabled={aiLoading || !transcript}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3A0F34] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#270A23] disabled:opacity-40 transition-colors"
            >
              <Brain className="h-3.5 w-3.5 text-[#EAAA00]" />
              <span>Evaluate My Answer</span>
            </button>

            <button
              onClick={() => requestAiAnalysis("model_answer")}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A0F34] hover:bg-[#F4F7F9] disabled:opacity-40 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#EAAA00]" />
              <span>Generate Model STAR Answer</span>
            </button>

            <button
              onClick={() => requestAiAnalysis("concept")}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#3A0F34] hover:bg-[#F4F7F9] disabled:opacity-40 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5 text-[#EAAA00]" />
              <span>Deep-Dive Concept</span>
            </button>
          </div>
        </div>

        {/* Right: AI Coaching & Feedback Panel */}
        <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#CBD5DD] pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#EAAA00]" />
              <span className="text-sm font-bold text-[#3A0F34]">
                AI Assessment & Feedback
              </span>
            </div>
            <span className="text-[11px] font-semibold capitalize text-[#58505C]">
              Provider: {settings?.activeProvider || "Gemini"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[240px]">
            {aiLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-[#58505C] space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#EAAA00]" />
                <p className="text-xs font-medium">Savala AI is evaluating your response...</p>
              </div>
            ) : aiAnalysis ? (
              <div className="prose prose-sm max-w-none text-[#1F1722] text-xs leading-relaxed whitespace-pre-wrap">
                {aiAnalysis}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center text-[#58505C] space-y-2">
                <ThumbsUp className="h-8 w-8 text-[#CBD5DD]" />
                <h4 className="text-sm font-semibold text-[#1F1722]">Ready for evaluation</h4>
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
