"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Video,
  Mic,
  MonitorUp,
  Sparkles,
  Play,
  Pause,
  Square,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Loader2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Settings as SettingsIcon,
  Minimize2,
  Maximize2,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Send,
  Keyboard,
} from "lucide-react";
import {
  UserSettingsData,
  ResumeData,
  AnswerLanguage,
  MeetingAudioSource,
  LiveDetectedQuestion,
  LiveSuggestedAnswer,
} from "@/types";
import { parseAndValidateMeetingUrl, MeetingUrlInfo } from "@/lib/copilot/meetingUrl";
import { extractQuestionsFromTranscript } from "@/lib/copilot/questionDetector";
import { BrandLogo } from "@/components/common/BrandLogo";

export function formatAudioErrorMessage(err: unknown, source: MeetingAudioSource): string {
  const errorName = err instanceof Error ? err.name : "";
  const errorMessage = err instanceof Error ? err.message : String(err || "");

  if (
    errorName === "NotFoundError" ||
    errorMessage.includes("The object can not be found here") ||
    errorMessage.includes("Requested device not found") ||
    errorMessage.includes("device not found") ||
    errorMessage.includes("NotFoundError")
  ) {
    if (source === "microphone") {
      return "No microphone hardware detected on your system. Please connect an audio device, check Windows sound device settings, or use 'Live Transcript / Manual Input' mode.";
    } else {
      return "No audio source found to capture. When sharing your tab or screen, please ensure you check 'Share tab audio'.";
    }
  }

  if (
    errorName === "NotAllowedError" ||
    errorName === "PermissionDeniedError" ||
    errorMessage.includes("Permission denied") ||
    errorMessage.includes("not allowed")
  ) {
    return "Microphone permission was denied. Please allow microphone access in your browser address bar and retry.";
  }

  if (errorName === "NotReadableError" || errorName === "TrackStartError" || errorMessage.includes("concurrent")) {
    return "Microphone is in use by another program (Teams, Zoom, or another window). Please close other audio applications and retry.";
  }

  if (errorName === "OverconstrainedError") {
    return "Your audio device does not support the requested constraints. Please try standard audio mode.";
  }

  return errorMessage || "Could not connect meeting audio. Please verify your audio settings.";
}

interface MeetingCopilotViewProps {
  settings: UserSettingsData | null;
  resume: ResumeData | null;
  onNavigateSettings?: () => void;
}

export const MeetingCopilotView: React.FC<MeetingCopilotViewProps> = ({
  settings,
  resume,
  onNavigateSettings,
}) => {
  // Meeting URL & Connection State
  const [meetingUrl, setMeetingUrl] = useState<string>("https://meet.google.com/abc-defg-hij");
  const [urlInfo, setUrlInfo] = useState<MeetingUrlInfo>(parseAndValidateMeetingUrl("https://meet.google.com/abc-defg-hij"));
  const [audioSource, setAudioSource] = useState<MeetingAudioSource>("microphone");
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "paused" | "error"
  >("disconnected");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Compact / Minimized floating presentation mode
  const [isCompactMode, setIsCompactMode] = useState<boolean>(false);

  // Language & AI Settings
  const [speechLanguage, setSpeechLanguage] = useState<"en-US" | "ml-IN">("en-US");
  const [responseLanguage, setResponseLanguage] = useState<AnswerLanguage>("en");
  const [detailedExplanationOpen, setDetailedExplanationOpen] = useState<boolean>(true);

  // Live Transcript & Questions State
  const [transcriptLines, setTranscriptLines] = useState<Array<{ timestamp: string; text: string; id: string }>>([
    {
      id: "demo-t1",
      timestamp: "10:14:02 AM",
      text: "Could you explain how Next.js App Router handles server components versus client components, and how you prevent SSR hydration mismatches?",
    },
  ]);
  const [detectedQuestions, setDetectedQuestions] = useState<LiveDetectedQuestion[]>([
    {
      id: "demo-q1",
      text: "Could you explain how Next.js App Router handles server components versus client components, and how you prevent SSR hydration mismatches?",
      timestamp: "10:14:02 AM",
      language: "en",
      confidence: 0.98,
      status: "answered",
    },
  ]);
  const [activeQuestion, setActiveQuestion] = useState<LiveDetectedQuestion | null>({
    id: "demo-q1",
    text: "Could you explain how Next.js App Router handles server components versus client components, and how you prevent SSR hydration mismatches?",
    timestamp: "10:14:02 AM",
    language: "en",
    confidence: 0.98,
    status: "answered",
  });

  const [suggestedAnswers, setSuggestedAnswers] = useState<Record<string, LiveSuggestedAnswer>>({
    "demo-q1": {
      questionId: "demo-q1",
      conciseAnswer:
        "In Next.js App Router, all components inside the app folder are React Server Components (RSC) by default. They execute exclusively on the server, fetch data without exposing backend credentials, and send serialized JSON plus static HTML to the browser with zero client JavaScript bundle overhead.\n\nTo add interactive state (useState, useEffect, event listeners), we place the 'use client' directive at the top of the component boundary. Client components are still pre-rendered to HTML on the server, then hydrated on the client.",
      detailedExplanation:
        "Key Hydration Mismatch Solutions:\n1. Ensure deterministic rendering: Avoid using window, localStorage, or Date.now() directly during the initial render pass.\n2. Use useEffect or a custom mounted hook (hasMounted) before reading browser-only APIs.\n3. Wrap dynamically generated browser elements with suppressHydrationWarning if unavoidable (e.g. timestamps).\n4. In React 19 / Next.js 15, pass serializable server props down the component tree rather than executing client-side data fetches where possible.",
      language: "en",
      timestamp: "10:14:05 AM",
    },
  });

  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [copiedQuestionId, setCopiedQuestionId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, "up" | "down">>({});

  // Manual editing & question input
  const [manualQuestionInput, setManualQuestionInput] = useState<string>("");

  // Media Streams & Recognition Refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunkRecorderRef = useRef<MediaRecorder | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isPausedRef = useRef<boolean>(false);

  // Handle URL change
  const handleUrlChange = (value: string) => {
    setMeetingUrl(value);
    setUrlInfo(parseAndValidateMeetingUrl(value));
  };

  const stopAllAudioTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (chunkRecorderRef.current) {
      try {
        if (chunkRecorderRef.current.state !== "inactive") {
          chunkRecorderRef.current.stop();
        }
      } catch {
        // Ignore
      }
      chunkRecorderRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllAudioTracks();
    };
  }, [stopAllAudioTracks]);

  // Trigger AI suggested answer for a detected question
  const generateAnswerForQuestion = useCallback(
    async (questionText: string, questionId: string, forcedLang?: AnswerLanguage) => {
      setIsGeneratingAnswer(true);
      const targetLang = forcedLang || responseLanguage;

      try {
        const resumeSummary = resume
          ? `Verified Candidate Resume:\nSkills: ${resume.parsedSkills?.join(", ") || "Full-Stack Development"}\nSummary: ${resume.parsedSummary || ""}\nExperience Highlights: ${resume.parsedExperience || ""}`
          : "Candidate is a senior full-stack software engineer with deep proficiency in Node.js, Express.js, React, Next.js, TypeScript, PostgreSQL, MongoDB, REST APIs, and system architecture.";

        const recentTranscriptContext = transcriptLines
          .slice(-6)
          .map((l) => l.text)
          .join(" ");

        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "interview_answer",
            prompt: questionText,
            transcript: recentTranscriptContext,
            resumeContext: resumeSummary,
            responseLanguage: targetLang,
            detailedExplanation: true,
            isLiveMeeting: true,
            jobRole: settings?.defaultJobRole || "Full-Stack Software Engineer",
            difficulty: settings?.interviewDifficulty || "Medium",
          }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          const content: string = data.content;

          let concise = content;
          let detailed = "";

          if (content.includes("### Detailed Technical Explanation")) {
            const parts = content.split("### Detailed Technical Explanation");
            concise = parts[0].trim();
            detailed = parts[1].trim();
          }

          const now = new Date();
          const timestamp = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

          setSuggestedAnswers((prev) => ({
            ...prev,
            [questionId]: {
              questionId,
              conciseAnswer: concise,
              detailedExplanation: detailed,
              language: targetLang,
              timestamp,
            },
          }));
        } else {
          setSuggestedAnswers((prev) => ({
            ...prev,
            [questionId]: {
              questionId,
              conciseAnswer: `Notice: ${data.error || "Could not generate answer. Please verify your provider API key in Settings."}`,
              language: targetLang,
              timestamp: new Date().toLocaleTimeString(),
            },
          }));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Request failed";
        setSuggestedAnswers((prev) => ({
          ...prev,
          [questionId]: {
            questionId,
            conciseAnswer: `Answer Generation Error: ${message}`,
            language: targetLang,
            timestamp: new Date().toLocaleTimeString(),
          },
        }));
      } finally {
        setIsGeneratingAnswer(false);
      }
    },
    [resume, transcriptLines, responseLanguage, settings]
  );

  // Live incoming text ingestion
  const processLiveTranscriptText = useCallback(
    (textChunk: string) => {
      if (isPausedRef.current || !textChunk.trim()) return;

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const lineId = `line_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;

      setTranscriptLines((prev) => [...prev, { id: lineId, timestamp: timeStr, text: textChunk.trim() }]);

      // Detect questions
      setDetectedQuestions((prevQuestions) => {
        const newQs = extractQuestionsFromTranscript(textChunk, prevQuestions);
        if (newQs.length > 0) {
          const newest = newQs[0];
          setActiveQuestion(newest);
          generateAnswerForQuestion(newest.text, newest.id);
          return [...prevQuestions, ...newQs];
        }
        return prevQuestions;
      });
    },
    [generateAnswerForQuestion]
  );

  // Fallback chunked transcription
  const startChunkedAudioTranscription = useCallback(
    (stream: MediaStream) => {
      try {
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";

        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
        const recorder = new MediaRecorder(stream, options);
        chunkRecorderRef.current = recorder;

        recorder.ondataavailable = async (e) => {
          if (e.data && e.data.size > 1000 && !isPausedRef.current) {
            try {
              const formData = new FormData();
              formData.append("file", e.data, "chunk.webm");
              formData.append("language", speechLanguage === "ml-IN" ? "ml" : "en");

              const res = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
              });
              const data = await res.json();
              if (res.ok && data.success && data.transcript?.trim()) {
                processLiveTranscriptText(data.transcript);
              }
            } catch (transcribeErr) {
              console.warn("Chunk transcription warning:", transcribeErr);
            }
          }
        };

        recorder.start(5000);
      } catch (recorderErr) {
        console.warn("Could not start chunked media recorder:", recorderErr);
      }
    },
    [speechLanguage, processLiveTranscriptText]
  );

  const startMeetingCapture = async () => {
    setConnectionError(null);
    setConnectionStatus("connecting");
    isPausedRef.current = false;

    if (audioSource === "manual_transcript") {
      setConnectionStatus("connected");
      return;
    }

    try {
      if (audioSource === "tab_audio") {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error("Your browser does not support getDisplayMedia tab audio capture.");
        }

        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          stream.getTracks().forEach((t) => t.stop());
          throw new Error("No audio track shared. When selecting the meeting tab, check 'Share tab audio'.");
        }

        mediaStreamRef.current = stream;
        stream.getVideoTracks().forEach((t) => t.stop());
      } else {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Your browser does not support microphone capture.");
        }

        if (navigator.mediaDevices.enumerateDevices) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasAudioInput = devices.some((d) => d.kind === "audioinput");
            if (devices.length > 0 && !hasAudioInput) {
              const notFoundErr = new Error("The object can not be found here.");
              notFoundErr.name = "NotFoundError";
              throw notFoundErr;
            }
          } catch (enumErr: unknown) {
            if (enumErr instanceof Error && (enumErr.name === "NotFoundError" || enumErr.message.includes("not found"))) {
              throw enumErr;
            }
          }
        }

        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch (firstErr: unknown) {
          const isNotFound = firstErr instanceof Error && (firstErr.name === "NotFoundError" || firstErr.message.includes("The object can not be found here"));
          if (isNotFound) throw firstErr;
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch {
            throw firstErr;
          }
        }

        mediaStreamRef.current = stream;
      }

      startSpeechRecognition();
      setConnectionStatus("connected");
    } catch (err: unknown) {
      stopAllAudioTracks();
      const friendlyMessage = formatAudioErrorMessage(err, audioSource);
      setConnectionError(friendlyMessage);
      setConnectionStatus("error");
    }
  };

  const startSpeechRecognition = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      if (mediaStreamRef.current && typeof MediaRecorder !== "undefined") {
        startChunkedAudioTranscription(mediaStreamRef.current);
        return;
      }
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = speechLanguage;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const lastIndex = event.results.length - 1;
        const transcriptText = event.results[lastIndex][0].transcript;
        if (transcriptText) {
          processLiveTranscriptText(transcriptText);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          console.warn("Speech recognition error:", event.error);
        }
      };

      recognition.onend = () => {
        if (connectionStatus === "connected" && !isPausedRef.current && recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            // Ignore
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (recErr) {
      console.warn("SpeechRecognition init error:", recErr);
    }
  };

  const pauseMeetingCapture = () => {
    isPausedRef.current = true;
    setConnectionStatus("paused");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (chunkRecorderRef.current && chunkRecorderRef.current.state === "recording") {
      try {
        chunkRecorderRef.current.pause();
      } catch {
        // Ignore
      }
    }
  };

  const resumeMeetingCapture = () => {
    isPausedRef.current = false;
    setConnectionStatus("connected");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        // Ignore
      }
    } else {
      startSpeechRecognition();
    }
    if (chunkRecorderRef.current && chunkRecorderRef.current.state === "paused") {
      try {
        chunkRecorderRef.current.resume();
      } catch {
        // Ignore
      }
    }
  };

  const stopMeetingCapture = () => {
    isPausedRef.current = false;
    stopAllAudioTracks();
    setConnectionStatus("disconnected");
  };

  const handleManualQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuestionInput.trim()) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const qId = `manual_q_${Date.now()}`;

    const newQ: LiveDetectedQuestion = {
      id: qId,
      text: manualQuestionInput.trim(),
      timestamp: timeStr,
      language: responseLanguage,
      confidence: 1.0,
      status: "pending",
    };

    setDetectedQuestions((prev) => [...prev, newQ]);
    setActiveQuestion(newQ);
    setTranscriptLines((prev) => [
      ...prev,
      { id: `t_${Date.now()}`, timestamp: timeStr, text: manualQuestionInput.trim() },
    ]);
    generateAnswerForQuestion(manualQuestionInput.trim(), qId);
    setManualQuestionInput("");
  };

  const handleCopyAnswer = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuestionId(id);
    setTimeout(() => setCopiedQuestionId(null), 2500);
  };

  const handleClearTranscript = () => {
    setTranscriptLines([]);
    setDetectedQuestions([]);
    setActiveQuestion(null);
    setSuggestedAnswers({});
  };

  const actionsRef = useRef({
    startMeetingCapture,
    pauseMeetingCapture,
    resumeMeetingCapture,
    handleCopyAnswer,
  });

  useEffect(() => {
    actionsRef.current = {
      startMeetingCapture,
      pauseMeetingCapture,
      resumeMeetingCapture,
      handleCopyAnswer,
    };
  });

  // Keyboard shortcut listeners (Space = pause/resume, C = copy active answer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if focus is in an input or textarea
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (connectionStatus === "connected") {
          actionsRef.current.pauseMeetingCapture();
        } else if (connectionStatus === "paused") {
          actionsRef.current.resumeMeetingCapture();
        } else if (connectionStatus === "disconnected") {
          actionsRef.current.startMeetingCapture();
        }
      } else if (e.code === "KeyC" && activeQuestion && suggestedAnswers[activeQuestion.id]) {
        actionsRef.current.handleCopyAnswer(suggestedAnswers[activeQuestion.id].conciseAnswer, activeQuestion.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [connectionStatus, activeQuestion, suggestedAnswers]);

  const activeAnswer = activeQuestion ? suggestedAnswers[activeQuestion.id] : null;

  // Extract key technical bullet points from concise answer
  const technicalPoints = React.useMemo(() => {
    if (!activeAnswer?.conciseAnswer) return [];
    const lines = activeAnswer.conciseAnswer.split("\n");
    const points: string[] = [];

    for (const l of lines) {
      const trimmed = l.trim();
      if (
        trimmed.startsWith("•") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("*") ||
        /^\d+\./.test(trimmed)
      ) {
        points.push(trimmed.replace(/^[-*•\d.]+\s*/, ""));
      } else if (trimmed.length > 25 && trimmed.length < 160 && !trimmed.startsWith("#")) {
        // Also capture short punchy summary sentences
        if (points.length < 3) {
          points.push(trimmed);
        }
      }
    }

    if (points.length === 0 && activeAnswer.conciseAnswer) {
      // Fallback: split by sentences
      const sentences = activeAnswer.conciseAnswer
        .split(/(?<=[.?!])\s+/)
        .filter((s) => s.trim().length > 20);
      return sentences.slice(0, 3);
    }

    return points.slice(0, 4);
  }, [activeAnswer]);

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* FLOATING LIVE COPILOT CONTAINER */}
      <div className="relative rounded-2xl border border-white/[0.12] bg-[#0D0D0D]/95 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-200">
        {/* 1. TOP TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/[0.08] px-4 py-3 bg-white/[0.02] gap-2.5">
          {/* Logo & Audio Status */}
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />

            <div className="h-4 w-px bg-white/[0.12] hidden sm:block" />

            {/* Audio Source Status Badge */}
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  connectionStatus === "connected"
                    ? "bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse"
                    : connectionStatus === "connecting"
                    ? "bg-amber-400 ring-4 ring-amber-400/20 animate-ping"
                    : connectionStatus === "paused"
                    ? "bg-amber-400 ring-4 ring-amber-400/20"
                    : connectionStatus === "error"
                    ? "bg-rose-500 ring-4 ring-rose-500/20"
                    : "bg-neutral-500"
                }`}
              />
              <span className="font-semibold text-white capitalize text-[11px]">
                {connectionStatus === "connected"
                  ? "Live Listening"
                  : connectionStatus === "connecting"
                  ? "Connecting..."
                  : connectionStatus === "paused"
                  ? "Paused"
                  : connectionStatus === "error"
                  ? "Audio Error"
                  : "Standby"}
              </span>
              <span className="text-[#737373] text-[10px] hidden md:inline">
                ({audioSource === "microphone" ? "Mic" : audioSource === "tab_audio" ? "Tab Audio" : "Manual"})
              </span>
            </div>
          </div>

          {/* Active AI Provider & Actions */}
          <div className="flex items-center gap-2">
            {/* Active Provider Pill */}
            <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-[#A3A3A3]">
              <Sparkles className="h-3 w-3 text-white" />
              <span className="text-[11px] text-[#737373] hidden sm:inline">Engine:</span>
              <span className="font-mono text-white text-[11px] font-semibold">
                {settings?.activeProviderName || settings?.preferredModel || "Gemini 2.5 Flash"}
              </span>
            </div>

            {/* Language Selector */}
            <div className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 text-xs">
              <button
                onClick={() => {
                  setResponseLanguage("en");
                  setSpeechLanguage("en-US");
                  if (activeQuestion) generateAnswerForQuestion(activeQuestion.text, activeQuestion.id, "en");
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                  responseLanguage === "en" ? "bg-white text-black" : "text-[#737373] hover:text-white"
                }`}
                title="Respond in English"
              >
                EN
              </button>
              <button
                onClick={() => {
                  setResponseLanguage("ml");
                  setSpeechLanguage("ml-IN");
                  if (activeQuestion) generateAnswerForQuestion(activeQuestion.text, activeQuestion.id, "ml");
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                  responseLanguage === "ml" ? "bg-white text-black" : "text-[#737373] hover:text-white"
                }`}
                title="Respond in Malayalam"
              >
                മലയാളം
              </button>
              <button
                onClick={() => {
                  setResponseLanguage("manglish");
                  setSpeechLanguage("ml-IN");
                  if (activeQuestion) generateAnswerForQuestion(activeQuestion.text, activeQuestion.id, "manglish");
                }}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors ${
                  responseLanguage === "manglish" ? "bg-white text-black" : "text-[#737373] hover:text-white"
                }`}
                title="Respond in Manglish (Malayalam in English script)"
              >
                Manglish
              </button>
            </div>

            {/* Settings Link */}
            {onNavigateSettings && (
              <button
                onClick={onNavigateSettings}
                className="rounded-lg p-1.5 text-[#737373] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Open AI Provider Manager & Settings"
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
            )}

            {/* Minimize / Maximize Workspace */}
            <button
              onClick={() => setIsCompactMode(!isCompactMode)}
              className="rounded-lg p-1.5 text-[#737373] hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              title={isCompactMode ? "Expand to Full Workspace" : "Compact Mode"}
            >
              {isCompactMode ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </button>

            {/* Clear Transcript */}
            <button
              onClick={handleClearTranscript}
              className="rounded-lg p-1.5 text-[#737373] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Clear Transcript & Questions"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 2. QUESTION NAVIGATION STRIP */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2 bg-white/[0.01] gap-3 overflow-x-auto">
          <div className="flex items-center gap-2 flex-nowrap min-w-0">
            <span className="text-[10px] uppercase font-bold text-[#737373] tracking-wider whitespace-nowrap">
              Detected Questions ({detectedQuestions.length}):
            </span>

            {detectedQuestions.length === 0 ? (
              <span className="text-xs text-[#555] italic">Waiting for interview speech...</span>
            ) : (
              detectedQuestions.map((q, idx) => {
                const isActive = activeQuestion?.id === q.id;
                return (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestion(q)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-white text-black font-bold shadow-xs"
                        : "bg-white/[0.04] text-[#A3A3A3] hover:bg-white/[0.08] hover:text-white border border-white/[0.06]"
                    }`}
                  >
                    <span className="text-[10px] opacity-70">#{idx + 1}</span>
                    <span className="max-w-[180px] sm:max-w-[240px] truncate">{q.text}</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[10px] text-[#737373] whitespace-nowrap flex-shrink-0">
            <Keyboard className="h-3 w-3" />
            <span>[Space] Pause/Resume • [C] Copy Answer</span>
          </div>
        </div>

        {/* 3. MAIN WORKSPACE BODY */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Connection Error Banner */}
          {connectionError && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white">Audio Connection Notice</span>
                <p className="text-rose-200/90 leading-relaxed">{connectionError}</p>
              </div>
            </div>
          )}

          {/* MAIN QUESTION PANEL */}
          <div className="rounded-xl border border-white/[0.12] bg-white/[0.025] p-4 sm:p-5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] bg-white/10 px-2 py-0.5 rounded-md">
                  Active Question
                </span>
                {activeQuestion && (
                  <span className="text-xs text-[#737373] font-mono">
                    {activeQuestion.timestamp}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {activeQuestion?.confidence && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {Math.round(activeQuestion.confidence * 100)}% Confidence
                  </span>
                )}
                <span className="text-[10px] font-semibold text-white/70 uppercase">
                  {responseLanguage === "en" ? "English" : responseLanguage === "ml" ? "Malayalam" : "Manglish"}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="text-sm sm:text-base font-semibold text-white leading-relaxed">
              {activeQuestion ? (
                activeQuestion.text
              ) : (
                <span className="text-[#737373] italic">
                  No active question selected. Start audio listening or type a question below.
                </span>
              )}
            </div>

            {/* Quick manual question ask input */}
            <form onSubmit={handleManualQuestionSubmit} className="pt-2 flex items-center gap-2">
              <input
                type="text"
                placeholder="Type or refine interview question here..."
                value={manualQuestionInput}
                onChange={(e) => setManualQuestionInput(e.target.value)}
                className="flex-1 rounded-xl border border-white/[0.10] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-[#555] focus:border-white focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!manualQuestionInput.trim() || isGeneratingAnswer}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-[#E5E5E5] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <Send className="h-3 w-3" />
                <span className="hidden sm:inline">Ask Copilot</span>
              </button>
            </form>
          </div>

          {/* MAIN ANSWER PANEL */}
          <div className="relative rounded-xl border border-white/[0.12] bg-white/[0.035] p-5 sm:p-6 space-y-4">
            {/* Header with Quick Actions */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-white" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  AI Suggested Response
                </h3>
                {isGeneratingAnswer && (
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/80 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Generating structured answer...
                  </span>
                )}
              </div>

              {/* Action Buttons: Copy, Regenerate, Feedback */}
              <div className="flex items-center gap-1.5">
                {activeAnswer && (
                  <>
                    <button
                      onClick={() => handleCopyAnswer(activeAnswer.conciseAnswer, activeAnswer.questionId)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-[#A3A3A3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title="Copy Answer"
                    >
                      {copiedQuestionId === activeAnswer.questionId ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() =>
                        activeQuestion &&
                        generateAnswerForQuestion(activeQuestion.text, activeQuestion.id, responseLanguage)
                      }
                      disabled={isGeneratingAnswer}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-[#A3A3A3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
                      title="Regenerate Answer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Regenerate</span>
                    </button>

                    {/* Feedback Thumbs */}
                    <div className="flex items-center border border-white/10 rounded-lg bg-white/[0.02] p-0.5">
                      <button
                        onClick={() =>
                          setFeedbackState((prev) => ({
                            ...prev,
                            [activeAnswer.questionId]: "up",
                          }))
                        }
                        className={`p-1 rounded text-xs ${
                          feedbackState[activeAnswer.questionId] === "up"
                            ? "text-emerald-400 bg-white/10"
                            : "text-[#737373] hover:text-white"
                        }`}
                        title="Helpful Answer"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() =>
                          setFeedbackState((prev) => ({
                            ...prev,
                            [activeAnswer.questionId]: "down",
                          }))
                        }
                        className={`p-1 rounded text-xs ${
                          feedbackState[activeAnswer.questionId] === "down"
                            ? "text-rose-400 bg-white/10"
                            : "text-[#737373] hover:text-white"
                        }`}
                        title="Not Helpful"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Answer Content */}
            {isGeneratingAnswer && !activeAnswer ? (
              <div className="py-8 space-y-3 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-5/6" />
              </div>
            ) : activeAnswer ? (
              <div className="space-y-4">
                {/* 1. Concise Speech Answer */}
                <div className="text-sm text-white/95 leading-relaxed font-normal whitespace-pre-line selection:bg-white selection:text-black">
                  {activeAnswer.conciseAnswer}
                </div>

                {/* 2. Key Technical Points Strip */}
                {technicalPoints.length > 0 && (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">
                      Key Technical Talking Points:
                    </span>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-white/90">
                      {technicalPoints.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="mt-1 flex h-1.5 w-1.5 rounded-full bg-white flex-shrink-0" />
                          <span className="leading-snug">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 3. Collapsible Detailed Deep-Dive */}
                {activeAnswer.detailedExplanation && (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDetailedExplanationOpen(!detailedExplanationOpen)}
                      className="w-full flex items-center justify-between p-3 text-xs font-semibold text-white/80 hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-3.5 w-3.5 text-white" />
                        <span>Technical Deep-Dive & Architecture Explanation</span>
                      </div>
                      {detailedExplanationOpen ? (
                        <ChevronUp className="h-4 w-4 text-[#737373]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#737373]" />
                      )}
                    </button>

                    {detailedExplanationOpen && (
                      <div className="p-3.5 pt-1 text-xs text-[#A3A3A3] leading-relaxed border-t border-white/[0.06] whitespace-pre-line">
                        {activeAnswer.detailedExplanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-[#737373] text-xs">
                Answers will automatically populate here as questions are detected from the live audio stream.
              </div>
            )}
          </div>
        </div>

        {/* 4. COMPACT AUDIO CONTROLS BAR (DOCKED AT BOTTOM) */}
        <div className="border-t border-white/[0.08] bg-[#0A0A0A] p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3">
          {/* Audio Source Selectors */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#737373] hidden sm:inline">Source:</span>
            <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] p-1 gap-1">
              <button
                type="button"
                onClick={() => setAudioSource("microphone")}
                disabled={connectionStatus === "connected"}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  audioSource === "microphone"
                    ? "bg-white text-black"
                    : "text-[#A3A3A3] hover:text-white"
                } ${connectionStatus === "connected" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <Mic className="h-3.5 w-3.5" />
                <span>Microphone</span>
              </button>

              <button
                type="button"
                onClick={() => setAudioSource("tab_audio")}
                disabled={connectionStatus === "connected"}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  audioSource === "tab_audio"
                    ? "bg-white text-black"
                    : "text-[#A3A3A3] hover:text-white"
                } ${connectionStatus === "connected" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                title="Share browser tab containing Google Meet or Microsoft Teams"
              >
                <MonitorUp className="h-3.5 w-3.5" />
                <span>Tab Audio</span>
              </button>

              <button
                type="button"
                onClick={() => setAudioSource("manual_transcript")}
                disabled={connectionStatus === "connected"}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  audioSource === "manual_transcript"
                    ? "bg-white text-black"
                    : "text-[#A3A3A3] hover:text-white"
                } ${connectionStatus === "connected" ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span>Manual</span>
              </button>
            </div>
          </div>

          {/* Audio Action Buttons: Start, Pause, Resume, Stop */}
          <div className="flex items-center gap-2">
            {connectionStatus === "disconnected" || connectionStatus === "error" ? (
              <button
                onClick={startMeetingCapture}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-[#E5E5E5] transition-all shadow-xs cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-black" />
                <span>Start Listening</span>
              </button>
            ) : connectionStatus === "connected" ? (
              <>
                <button
                  onClick={pauseMeetingCapture}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Pause className="h-3.5 w-3.5" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={stopMeetingCapture}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 fill-rose-300" />
                  <span>Stop</span>
                </button>
              </>
            ) : connectionStatus === "paused" ? (
              <>
                <button
                  onClick={resumeMeetingCapture}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-[#E5E5E5] transition-all shadow-xs cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-black" />
                  <span>Resume</span>
                </button>
                <button
                  onClick={stopMeetingCapture}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
                >
                  <Square className="h-3.5 w-3.5 fill-rose-300" />
                  <span>Stop</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* 5. MEETING URL VERIFICATION & AUTHORIZED CONNECTION CARD */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0F0F0F]/60 backdrop-blur-xl p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-white" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Meeting Integration & URL Validator
            </h3>
          </div>
          <span className="text-[10px] text-[#737373]">
            Google Meet • Microsoft Teams • Zoom
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <input
            type="url"
            value={meetingUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Paste meeting URL (e.g., https://meet.google.com/abc-defg-hij)"
            className="w-full sm:flex-1 rounded-xl border border-white/[0.10] bg-white/[0.03] px-3.5 py-2 text-xs text-white placeholder-[#555] font-mono focus:border-white focus:outline-hidden"
          />
          {urlInfo.isValid && (
            <a
              href={meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <span>Open {urlInfo.platform === "google_meet" ? "Meet" : "Teams"}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Clear Notice on Audio Capture */}
        <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3 text-[11px] text-[#737373]">
          <ShieldAlert className="h-4 w-4 text-[#A3A3A3] flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">Notice:</strong> Entering a meeting URL does not automatically grant audio access. Savala AI complies with browser security sandbox standards. Audio is captured via your browser tab audio stream or local microphone input.
          </p>
        </div>
      </div>
    </div>
  );
};
