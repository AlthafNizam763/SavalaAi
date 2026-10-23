"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Loader2,
  Sparkles,
  HelpCircle,
  PlayCircle,
  Shield,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ResumeData } from "@/types";

interface ResumeViewProps {
  resume: ResumeData | null;
  onRefreshResume: () => void;
  onPracticeQuestion?: (question: string) => void;
}

export const ResumeView: React.FC<ResumeViewProps> = ({
  resume,
  onRefreshResume,
  onPracticeQuestion,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadSuccess(null);

    const maxMb = 10;
    if (file.size > maxMb * 1024 * 1024) {
      setUploadError(`File exceeds maximum allowed size of ${maxMb}MB.`);
      return;
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".txt") && !name.endsWith(".md")) {
      setUploadError("Invalid file type. Please upload a PDF (.pdf) or text (.txt) file.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/resume", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setUploadSuccess("Resume successfully parsed and indexed!");
        onRefreshResume();
      } else {
        setUploadError(data.error || "Failed to process resume document.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload network error";
      setUploadError(`Upload failed: ${message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm("Are you sure you want to delete your stored resume and extracted text? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/resume", { method: "DELETE" });
      if (response.ok) {
        onRefreshResume();
        setUploadSuccess("Resume removed.");
      }
    } catch {
      setUploadError("Could not delete resume.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">My Resume</h1>
          <p className="text-xs text-[#737373] mt-1">
            Upload your technical resume to automatically extract skills, build targeted mock questions, and practice real scenarios.
          </p>
        </div>

        {resume && (
          <button
            onClick={handleDeleteResume}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isDeleting ? "Deleting..." : "Delete Resume"}</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {uploadError && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{uploadError}</div>
        </div>
      )}

      {uploadSuccess && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{uploadSuccess}</div>
        </div>
      )}

      {/* Upload Box (Active or Replacement) */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (file) handleFileUpload(file);
        }}
        className="rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.02] p-8 text-center hover:border-white/30 hover:bg-white/[0.04] cursor-pointer transition-all space-y-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white">
          {isUploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          ) : (
            <Upload className="h-7 w-7" />
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white">
            {isUploading
              ? "Parsing document and extracting skills..."
              : resume
              ? "Click or drag to replace your resume"
              : "Upload your resume (PDF or TXT)"}
          </h3>
          <p className="text-xs text-[#737373]">
            Max 10MB. Files are processed securely in memory and never shared publicly.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
          <Shield className="h-3.5 w-3.5 text-white" />
          <span>Private & Encrypted Parsing</span>
        </div>
      </div>

      {/* Parsed Resume Details */}
      {resume && (
        <div className="space-y-6">
          {/* File Metadata Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{resume.fileName}</h4>
                <span className="text-xs text-[#737373]">
                  {(resume.fileSizeBytes / 1024).toFixed(1)} KB · Uploaded on{" "}
                  {new Date(resume.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowRawText(!showRawText)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"
            >
              <span>{showRawText ? "Hide Extracted Text" : "View Extracted Text"}</span>
              {showRawText ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Raw Extracted Text Drawer */}
          {showRawText && (
            <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 text-xs font-mono text-[#A3A3A3] max-h-60 overflow-y-auto whitespace-pre-wrap">
              {resume.extractedText}
            </div>
          )}

          {/* Structured Analysis Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Summary & Targeted Questions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile Summary */}
              {resume.parsedSummary && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                    AI Candidate Summary
                  </h3>
                  <p className="text-sm text-white/90 leading-relaxed">
                    {resume.parsedSummary}
                  </p>
                </div>
              )}

              {/* Tailored Interview Questions */}
              {resume.interviewQuestions && resume.interviewQuestions.length > 0 && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <HelpCircle className="h-4 w-4 text-white" />
                        Targeted Interview Questions
                      </h3>
                      <p className="text-xs text-[#737373]">
                        Generated based on projects and technologies on your resume
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {resume.interviewQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="group flex items-start justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 hover:border-white/30 hover:bg-white/[0.04] transition-all"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-white mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs sm:text-sm font-medium text-white/90 leading-snug">
                            {q}
                          </p>
                        </div>

                        {onPracticeQuestion && (
                          <button
                            onClick={() => onPracticeQuestion(q)}
                            className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-black hover:bg-[#E5E5E5] transition-colors cursor-pointer"
                            title="Practice this question"
                          >
                            <PlayCircle className="h-3 w-3" />
                            <span>Practice</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Col: Extracted Skills & Competencies */}
            <div className="space-y-6">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Extracted Skills & Tech
                </h3>

                {resume.parsedSkills && resume.parsedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {resume.parsedSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-[#A3A3A3]"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#737373]">No skills explicitly tagged.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
