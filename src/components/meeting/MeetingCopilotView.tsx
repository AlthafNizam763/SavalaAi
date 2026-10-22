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
  Languages,
  BookOpen,
  HelpCircle,
  FileCheck2,
  ChevronDown,
  ChevronUp,
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

interface MeetingCopilotViewProps {
  settings: UserSettingsData | null;
  resume: ResumeData | null;
}

export const MeetingCopilotView: React.FC<MeetingCopilotViewProps> = ({
  settings,
  resume,
}) => {
  // Meeting URL & Connection State
  const [meetingUrl, setMeetingUrl] = useState<string>("https://meet.google.com/abc-defg-hij");
  const [urlInfo, setUrlInfo] = useState<MeetingUrlInfo>(parseAndValidateMeetingUrl("https://meet.google.com/abc-defg-hij"));
  const [audioSource, setAudioSource] = useState<MeetingAudioSource>("microphone");
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected" | "paused" | "error"
  >("disconnected");
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Language & AI Settings
  const [speechLanguage, setSpeechLanguage] = useState<"en-US" | "ml-IN">("en-US");
  const [responseLanguage, setResponseLanguage] = useState<AnswerLanguage>("en");
  const [detailedExplanation, setDetailedExplanation] = useState<boolean>(false);

  // Live Transcript & Questions State
  const [transcriptLines, setTranscriptLines] = useState<Array<{ timestamp: string; text: string; id: string }>>([]);
  const [detectedQuestions, setDetectedQuestions] = useState<LiveDetectedQuestion[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<LiveDetectedQuestion | null>(null);
  const [suggestedAnswers, setSuggestedAnswers] = useState<Record<string, LiveSuggestedAnswer>>({});
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [copiedQuestionId, setCopiedQuestionId] = useState<string | null>(null);

  // Manual editing & regeneration state
  const [manualQuestionInput, setManualQuestionInput] = useState<string>("");
  const [showDetailedPanel, setShowDetailedPanel] = useState<boolean>(true);

  // Media Streams & Recognition Refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
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
    async (questionText: string, questionId: string) => {
      setIsGeneratingAnswer(true);

      try {
        const resumeSummary = resume
          ? `Verified Candidate Resume:\nSkills: ${resume.parsedSkills?.join(", ") || "Full-Stack Development"}\nSummary: ${resume.parsedSummary || ""}\nExperience Highlights: ${resume.parsedExperience || ""}`
          : "Candidate is a senior full-stack software engineer with deep proficiency in Node.js, Express.js, React, Next.js, PHP (Laravel, CodeIgniter), REST APIs, and databases.";

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
            responseLanguage,
            detailedExplanation: true,
            isLiveMeeting: true,
            jobRole: settings?.defaultJobRole || "Full-Stack Software Engineer",
            difficulty: settings?.interviewDifficulty || "Medium",
          }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          const content: string = data.content;

          // Split concise answer and detailed explanation if present
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
              language: responseLanguage,
              timestamp,
            },
          }));
        } else {
          setSuggestedAnswers((prev) => ({
            ...prev,
            [questionId]: {
              questionId,
              conciseAnswer: `Notice: ${data.error || "Could not generate answer. Please verify your provider API key in Settings."}`,
              language: responseLanguage,
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
            language: responseLanguage,
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

  // Connect Audio Session (Tab Audio or Microphone)
  const startMeetingCapture = async () => {
    setConnectionError(null);
    setConnectionStatus("connecting");
    isPausedRef.current = false;

    try {
      if (audioSource === "tab_audio") {
        // Tab Audio via getDisplayMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
          throw new Error("Your browser does not support getDisplayMedia tab audio capture. Please use Chrome or Edge.");
        }

        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });

        // Verify audio track exists
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
          stream.getTracks().forEach((t) => t.stop());
          throw new Error(
            "No audio track was shared. When sharing the meeting tab, please ensure you check 'Share tab audio' or 'Also share system audio'."
          );
        }

        mediaStreamRef.current = stream;
        stream.getVideoTracks().forEach((t) => t.stop()); // We only need audio
      } else {
        // Microphone via getUserMedia
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Your browser does not support getUserMedia microphone capture.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        mediaStreamRef.current = stream;
      }

      // Initialize Web Speech Recognition
      startSpeechRecognition();
      setConnectionStatus("connected");
    } catch (err: unknown) {
      stopAllAudioTracks();
      const message = err instanceof Error ? err.message : "Failed to connect meeting audio.";
      setConnectionError(message);
      setConnectionStatus("error");
    }
  };

  const startSpeechRecognition = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setConnectionError(
        "Web Speech Recognition API is not supported in this browser. Please use Chrome or Edge for live real-time speech-to-text."
      );
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
        // Automatically restart if still connected and not paused
        if (connectionStatus === "connected" && !isPausedRef.current && recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            // Ignore already started
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Speech recognition start failed";
      console.error(message);
    }
  };

  const togglePause = () => {
    if (connectionStatus === "connected") {
      isPausedRef.current = true;
      setConnectionStatus("paused");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    } else if (connectionStatus === "paused") {
      isPausedRef.current = false;
      setConnectionStatus("connected");
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // Ignore
        }
      }
    }
  };

  const stopMeetingCapture = () => {
    stopAllAudioTracks();
    setConnectionStatus("disconnected");
    isPausedRef.current = false;
  };

  const handleClearTranscriptAndAnswers = () => {
    if (window.confirm("Clear all meeting transcripts and detected questions?")) {
      setTranscriptLines([]);
      setDetectedQuestions([]);
      setActiveQuestion(null);
      setSuggestedAnswers({});
    }
  };

  const handleManualQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuestionInput.trim()) return;

    const text = manualQuestionInput.trim();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const newQ: LiveDetectedQuestion = {
      id: `q_manual_${Date.now()}`,
      timestamp: timeStr,
      text,
      category: "technical",
      isAnswered: false,
      confidence: 1.0,
    };

    setDetectedQuestions((prev) => [newQ, ...prev]);
    setActiveQuestion(newQ);
    setManualQuestionInput("");
    generateAnswerForQuestion(text, newQ.id);
  };

  const handleCopyAnswer = (text: string, qId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuestionId(qId);
    setTimeout(() => setCopiedQuestionId(null), 2000);
  };

  const activeAnswer = activeQuestion ? suggestedAnswers[activeQuestion.id] : null;

  return (
    <div className="space-y-6">
      {/* 1. Header with Copilot Brand & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5DD] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#3A0F34]">Live Meeting Interview Copilot</h1>
            <span className="rounded-full bg-[#EAAA00] px-2.5 py-0.5 text-[10px] font-bold text-[#270A23]">
              Authorized Copilot
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#58505C] mt-0.5">
            Real-time question detection, speech-to-text in English and Malayalam, and instant contextual answers grounded in your resume.
          </p>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold border ${
              connectionStatus === "connected"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/20"
                : connectionStatus === "paused"
                ? "bg-amber-50 text-amber-800 border-amber-300"
                : connectionStatus === "connecting"
                ? "bg-blue-50 text-blue-800 border-blue-300 animate-pulse"
                : "bg-[#F4F7F9] text-[#58505C] border-[#CBD5DD]"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-emerald-500 animate-pulse"
                  : connectionStatus === "paused"
                  ? "bg-amber-500"
                  : connectionStatus === "connecting"
                  ? "bg-blue-500"
                  : "bg-gray-400"
              }`}
            />
            <span className="capitalize">
              {connectionStatus === "connected"
                ? `Active (${audioSource === "tab_audio" ? "Tab Audio" : "Microphone"})`
                : connectionStatus}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Privacy & Screen-Sharing Transparency Banner */}
      <div className="rounded-xl border border-[#CBD5DD] bg-[#FFF8E6] p-4 text-xs text-[#58505C] space-y-2">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-[#EAAA00] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-[#3A0F34]">
              Screen-Sharing Visibility & Privacy Advisory
            </span>
            <p className="leading-relaxed">
              Savala AI operates under standard browser permissions and complies with meeting policies.
              <strong> Important:</strong> If you select &quot;Entire Screen&quot; in Google Meet or Teams, Savala AI will be visible to participants.
              To preserve privacy, share only your specific application window (e.g. VS Code, Terminal, or your browser tab) rather than your entire desktop.
              Savala AI does not use stealth hooks, undetectable browser overlays, or monitoring evasion techniques.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Meeting Connect & Audio Configuration Card */}
      <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Meeting URL Input */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#3A0F34] flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-[#EAAA00]" />
              Meeting Link (Google Meet / Microsoft Teams)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={meetingUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij or Microsoft Teams link"
                className="w-full rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] p-2.5 text-xs font-medium text-[#1F1722] focus:border-[#3A0F34] focus:bg-white focus:outline-hidden"
              />
              {urlInfo.normalizedUrl && (
                <a
                  href={urlInfo.normalizedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-[#CBD5DD] bg-white p-2.5 text-[#3A0F34] hover:bg-[#F4F7F9]"
                  title="Open meeting in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            {urlInfo.isValid ? (
              <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Validated: {urlInfo.platform === "google_meet" ? "Google Meet" : urlInfo.platform === "microsoft_teams" ? "Microsoft Teams" : "Web Meeting"}
              </span>
            ) : (
              <span className="text-[11px] text-amber-700">{urlInfo.error || "Please enter a valid Google Meet or Teams URL."}</span>
            )}
          </div>

          {/* Audio Source Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#3A0F34] flex items-center gap-1.5">
              <MonitorUp className="h-3.5 w-3.5 text-[#EAAA00]" />
              Audio Capture Method
            </label>
            <select
              value={audioSource}
              onChange={(e) => setAudioSource(e.target.value as MeetingAudioSource)}
              disabled={connectionStatus === "connected"}
              className="w-full rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] p-2.5 text-xs font-semibold text-[#3A0F34] focus:border-[#3A0F34] focus:outline-hidden"
            >
              <option value="microphone">Microphone (Room & Speaker Audio)</option>
              <option value="tab_audio">Browser Tab Audio (getDisplayMedia)</option>
              <option value="manual_transcript">Live Transcript / Manual Input</option>
            </select>
            <span className="text-[10px] text-[#58505C] block">
              {audioSource === "tab_audio"
                ? "Captures interviewer tab directly with 'Share tab audio'"
                : "Captures your mic and audio coming out of speakers"}
            </span>
          </div>
        </div>

        {/* Language Selection Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#CBD5DD]">
          {/* Speech-to-Text Input Language */}
          <div>
            <label className="text-xs font-semibold text-[#58505C] flex items-center gap-1.5 mb-1">
              <Languages className="h-3.5 w-3.5 text-[#3A0F34]" />
              Transcription Language
            </label>
            <select
              value={speechLanguage}
              onChange={(e) => setSpeechLanguage(e.target.value as "en-US" | "ml-IN")}
              className="w-full rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] p-2 text-xs font-semibold text-[#3A0F34]"
            >
              <option value="en-US">English (Indian / Global Accents)</option>
              <option value="ml-IN">Malayalam (മലയാളം)</option>
            </select>
          </div>

          {/* AI Response Output Language */}
          <div>
            <label className="text-xs font-semibold text-[#58505C] flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5 text-[#EAAA00]" />
              AI Answer Language
            </label>
            <select
              value={responseLanguage}
              onChange={(e) => setResponseLanguage(e.target.value as AnswerLanguage)}
              className="w-full rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] p-2 text-xs font-semibold text-[#3A0F34]"
            >
              <option value="en">English (Professional Tech English)</option>
              <option value="ml-en">Malayalam + English (Manglish / മിശ്രിതം)</option>
              <option value="ml">Pure Malayalam (മലയാളം)</option>
            </select>
          </div>

          {/* Detailed explanation toggle */}
          <div className="flex flex-col justify-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={detailedExplanation}
                onChange={(e) => setDetailedExplanation(e.target.checked)}
                className="h-4 w-4 rounded-sm border-[#CBD5DD] text-[#3A0F34] focus:ring-[#EAAA00]"
              />
              <span className="text-xs font-semibold text-[#1F1722]">
                Include Detailed Deep-Dive
              </span>
            </label>
          </div>
        </div>

        {/* Connection Controls & Errors */}
        {connectionError && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-800 border border-red-200 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>{connectionError}</div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            {connectionStatus !== "connected" && connectionStatus !== "paused" ? (
              <button
                onClick={startMeetingCapture}
                disabled={connectionStatus === "connecting"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#EAAA00] px-5 py-2.5 text-xs font-bold text-[#270A23] shadow-sm hover:bg-[#CF9400] disabled:opacity-50 transition-colors"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Start Copilot Audio</span>
              </button>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3A0F34] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#270A23] transition-colors"
                >
                  <Pause className="h-4 w-4" />
                  <span>{connectionStatus === "paused" ? "Resume" : "Pause"}</span>
                </button>

                <button
                  onClick={stopMeetingCapture}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition-colors"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span>Stop Copilot</span>
                </button>
              </>
            )}

            <button
              onClick={handleClearTranscriptAndAnswers}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#CBD5DD] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#58505C] hover:bg-[#F4F7F9] transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          </div>

          {/* Candidate Grounding Indicator */}
          <div className="flex items-center gap-2 text-xs text-[#58505C]">
            <FileCheck2 className="h-4 w-4 text-emerald-600" />
            <span>
              Resume Grounding:{" "}
              <strong className="text-[#3A0F34]">
                {resume ? `${resume.fileName} (${resume.parsedSkills?.length || 0} skills)` : "Full-Stack General"}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4. Two-Column Workspace: Live Transcript Feed & Live AI Suggested Answer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Live Transcript & Question Stream */}
        <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs space-y-4 flex flex-col h-[600px]">
          <div className="flex items-center justify-between border-b border-[#CBD5DD] pb-3">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-[#3A0F34]" />
              <h3 className="text-sm font-bold text-[#3A0F34]">Live Meeting Transcript Stream</h3>
            </div>
            <span className="text-[11px] font-mono text-[#58505C]">
              {transcriptLines.length} segments · {detectedQuestions.length} questions detected
            </span>
          </div>

          {/* Transcript Feed Scrollable Area */}
          <div className="flex-1 overflow-y-auto space-y-3 p-1">
            {transcriptLines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center text-[#58505C] space-y-2">
                <Video className="h-10 w-10 text-[#CBD5DD]" />
                <h4 className="text-sm font-semibold text-[#1F1722]">Waiting for interview audio</h4>
                <p className="text-xs max-w-xs">
                  Click &quot;Start Copilot Audio&quot; or paste a question below to detect questions and generate live answers.
                </p>
              </div>
            ) : (
              transcriptLines.map((line) => (
                <div key={line.id} className="text-xs leading-relaxed space-y-0.5">
                  <div className="flex items-center gap-2 font-mono text-[10px] text-[#58505C]">
                    <span>[{line.timestamp}]</span>
                    <span>Interviewer / Candidate</span>
                  </div>
                  <p className="text-[#1F1722] bg-[#F4F7F9] p-2.5 rounded-lg border border-[#CBD5DD]/60 font-medium">
                    {line.text}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Manual Question Injector & Correction Form */}
          <form onSubmit={handleManualQuestionSubmit} className="pt-2 border-t border-[#CBD5DD] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#58505C]">
              <span>Ask or Correct Detected Question:</span>
              <span>Hit Enter to Generate</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualQuestionInput}
                onChange={(e) => setManualQuestionInput(e.target.value)}
                placeholder="Type or paste question to generate answer immediately..."
                className="w-full rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] p-2.5 text-xs font-medium text-[#1F1722] focus:border-[#3A0F34] focus:bg-white focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!manualQuestionInput.trim() || isGeneratingAnswer}
                className="rounded-lg bg-[#3A0F34] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#270A23] disabled:opacity-50 transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Prominent Suggested Answer & Deep Dive */}
        <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs space-y-4 flex flex-col h-[600px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#CBD5DD] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#EAAA00]" />
              <h3 className="text-sm font-bold text-[#3A0F34]">Latest Suggested Answer</h3>
            </div>

            {activeAnswer && (
              <button
                onClick={() => handleCopyAnswer(activeAnswer.conciseAnswer, activeAnswer.questionId)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#DDE3E8] px-2.5 py-1 text-xs font-semibold text-[#3A0F34] hover:bg-[#CBD5DD] transition-colors"
              >
                {copiedQuestionId === activeAnswer.questionId ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                <span>{copiedQuestionId === activeAnswer.questionId ? "Copied" : "Copy Answer"}</span>
              </button>
            )}
          </div>

          {/* Active Question Banner */}
          {activeQuestion && (
            <div className="rounded-xl bg-[#3A0F34] p-3.5 text-white shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#EAAA00] font-bold">
                <span className="flex items-center gap-1">
                  <HelpCircle className="h-3 w-3" />
                  Detected Question [{activeQuestion.timestamp}]
                </span>
                <span className="capitalize">{activeQuestion.category || "Technical"}</span>
              </div>
              <p className="text-xs sm:text-sm font-bold leading-snug">{activeQuestion.text}</p>
            </div>
          )}

          {/* Answer Content Display */}
          <div className="flex-1 overflow-y-auto space-y-4 p-1">
            {isGeneratingAnswer ? (
              <div className="flex flex-col items-center justify-center h-full py-24 text-[#58505C] space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#EAAA00]" />
                <p className="text-xs font-bold text-[#3A0F34]">
                  Savala AI is generating a tailored answer ({responseLanguage === "ml" ? "മലയാളം" : responseLanguage === "ml-en" ? "Manglish" : "English"})...
                </p>
                <span className="text-[11px] text-[#58505C]">
                  Grounding response in your verified technical experience
                </span>
              </div>
            ) : activeAnswer ? (
              <div className="space-y-4">
                {/* Spoken Concise Answer Box */}
                <div className="rounded-xl border border-[#CBD5DD] bg-[#F4F7F9] p-4 text-xs sm:text-sm font-normal text-[#1F1722] leading-relaxed whitespace-pre-wrap shadow-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#3A0F34] mb-2 pb-1 border-b border-[#CBD5DD]/50">
                    <span>What to Speak (Concise STAR Format)</span>
                    <span className="text-[#58505C] font-mono text-[10px]">{activeAnswer.timestamp}</span>
                  </div>
                  {activeAnswer.conciseAnswer}
                </div>

                {/* Deep-Dive Technical Explanation (if requested) */}
                {activeAnswer.detailedExplanation && (
                  <div className="rounded-xl border border-[#CBD5DD] bg-white p-4 space-y-2">
                    <button
                      onClick={() => setShowDetailedPanel(!showDetailedPanel)}
                      className="w-full flex items-center justify-between text-xs font-bold text-[#3A0F34] hover:text-[#EAAA00] transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-[#3A0F34]" />
                        Deep-Dive Technical Architecture & Mechanics
                      </span>
                      {showDetailedPanel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {showDetailedPanel && (
                      <div className="text-xs leading-relaxed text-[#58505C] pt-2 border-t border-[#CBD5DD] whitespace-pre-wrap">
                        {activeAnswer.detailedExplanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Regenerate with Another Language */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-[#58505C] text-[11px]">Regenerate in:</span>
                  <button
                    onClick={() => {
                      setResponseLanguage("en");
                      if (activeQuestion) generateAnswerForQuestion(activeQuestion.text, activeQuestion.id);
                    }}
                    className="rounded-md border border-[#CBD5DD] bg-white px-2 py-1 text-[11px] font-semibold text-[#3A0F34] hover:bg-[#F4F7F9]"
                  >
                    English
                  </button>
                  <button
                    onClick={() => {
                      setResponseLanguage("ml-en");
                      if (activeQuestion) generateAnswerForQuestion(activeQuestion.text, activeQuestion.id);
                    }}
                    className="rounded-md border border-[#CBD5DD] bg-white px-2 py-1 text-[11px] font-semibold text-[#3A0F34] hover:bg-[#F4F7F9]"
                  >
                    Manglish (മലയാളം+English)
                  </button>
                  <button
                    onClick={() => {
                      setResponseLanguage("ml");
                      if (activeQuestion) generateAnswerForQuestion(activeQuestion.text, activeQuestion.id);
                    }}
                    className="rounded-md border border-[#CBD5DD] bg-white px-2 py-1 text-[11px] font-semibold text-[#3A0F34] hover:bg-[#F4F7F9]"
                  >
                    Malayalam (മലയാളം)
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-24 text-center text-[#58505C] space-y-2">
                <Sparkles className="h-10 w-10 text-[#CBD5DD]" />
                <h4 className="text-sm font-semibold text-[#1F1722]">Awaiting next question</h4>
                <p className="text-xs max-w-sm">
                  As the interviewer speaks in Google Meet or Teams, Savala AI will automatically detect questions and generate concise, professional answers here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
