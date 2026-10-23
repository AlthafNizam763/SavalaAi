"use client";

import React, { useState } from "react";
import {
  Code2,
  Bug,
  BookOpen,
  CheckCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Loader2,
  Save,
  Clock,
  Layers,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import { UserSettingsData, SessionData } from "@/types";

interface CodingLabViewProps {
  settings: UserSettingsData | null;
  onSessionSaved?: (session: SessionData) => void;
}

const SAMPLE_CODE_SNIPPETS: Record<string, { problem: string; code: string }> = {
  typescript: {
    problem: "Implement an LRU (Least Recently Used) Cache with O(1) get and put operations.",
    code: `class LRUCache<K, V> {
  private capacity: number;
  private map: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();
  }

  get(key: K): V | -1 {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  put(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.capacity) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) this.map.delete(oldestKey);
    }
    this.map.set(key, value);
  }
}`,
  },
  javascript: {
    problem: "Write a function to debounce an async search input handler with a leading/trailing option.",
    code: `function debounce(fn, delay = 300) {
  let timerId = null;
  return function (...args) {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}`,
  },
  python: {
    problem: "Find the median of two sorted arrays of different sizes in O(log(min(m, n))) time.",
    code: `def findMedianSortedArrays(nums1: list[int], nums2: list[int]) -> float:
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    
    m, n = len(nums1), len(nums2)
    low, high = 0, m

    while low <= high:
        partitionX = (low + high) // 2
        partitionY = (m + n + 1) // 2 - partitionX

        maxLeftX = float('-inf') if partitionX == 0 else nums1[partitionX - 1]
        minRightX = float('inf') if partitionX == m else nums1[partitionX]

        maxLeftY = float('-inf') if partitionY == 0 else nums2[partitionY - 1]
        minRightY = float('inf') if partitionY == n else nums2[partitionY]

        if maxLeftX <= minRightY and maxLeftY <= minRightX:
            if (m + n) % 2 == 0:
                return (max(maxLeftX, maxLeftY) + min(minRightX, minRightY)) / 2.0
            else:
                return float(max(maxLeftX, maxLeftY))
        elif maxLeftX > minRightY:
            high = partitionX - 1
        else:
            low = partitionX + 1

    raise ValueError("Input arrays were not sorted")`,
  },
  java: {
    problem: "Detect and return the start node of a cycle in a linked list without modifying node values.",
    code: `public class Solution {
    public ListNode detectCycle(ListNode head) {
        if (head == null || head.next == null) return null;
        ListNode slow = head;
        ListNode fast = head;

        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                ListNode ptr = head;
                while (ptr != slow) {
                    ptr = ptr.next;
                    slow = slow.next;
                }
                return ptr;
            }
        }
        return null;
    }
}`,
  },
  sql: {
    problem: "Find top 3 highest earning employees per department from Employee and Department tables.",
    code: `SELECT 
    d.name AS Department,
    e.name AS Employee,
    e.salary AS Salary
FROM (
    SELECT 
        departmentId, 
        name, 
        salary, 
        DENSE_RANK() OVER (PARTITION BY departmentId ORDER BY salary DESC) as rnk
    FROM Employee
) e
JOIN Department d ON e.departmentId = d.id
WHERE e.rnk <= 3;`,
  },
  php: {
    problem: "Implement a thread-safe Singleton database connection pool wrapper in modern PHP.",
    code: `<?php

declare(strict_types=1);

final class DatabasePool {
    private static ?self $instance = null;
    private ?PDO $connection = null;

    private function __construct() {
        $dsn = "pgsql:host=localhost;port=5432;dbname=savala_ai";
        $this->connection = new PDO($dsn, "user", "secret", [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    public static function getInstance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection(): PDO {
        return $this->connection;
    }
}`,
  },
};

export const CodingLabView: React.FC<CodingLabViewProps> = ({
  settings,
  onSessionSaved,
}) => {
  const [language, setLanguage] = useState<string>("typescript");
  const [problemPrompt, setProblemPrompt] = useState<string>(SAMPLE_CODE_SNIPPETS.typescript.problem);
  const [userCode, setUserCode] = useState<string>(SAMPLE_CODE_SNIPPETS.typescript.code);

  const [isLoading, setIsLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<string | null>(null);
  const [extractedCode, setExtractedCode] = useState<string | null>(null);
  const [complexity, setComplexity] = useState<{ time?: string; space?: string } | null>(null);
  const [edgeCases, setEdgeCases] = useState<string[] | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (SAMPLE_CODE_SNIPPETS[newLang]) {
      setProblemPrompt(SAMPLE_CODE_SNIPPETS[newLang].problem);
      setUserCode(SAMPLE_CODE_SNIPPETS[newLang].code);
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset problem and code to language default?")) {
      if (SAMPLE_CODE_SNIPPETS[language]) {
        setProblemPrompt(SAMPLE_CODE_SNIPPETS[language].problem);
        setUserCode(SAMPLE_CODE_SNIPPETS[language].code);
      } else {
        setUserCode("");
        setProblemPrompt("");
      }
      setAiOutput(null);
      setExtractedCode(null);
      setComplexity(null);
      setEdgeCases(null);
    }
  };

  const runCodeAction = async (action: "solve_problem" | "debug_code" | "explain_code" | "review_code") => {
    if (!problemPrompt && !userCode) {
      alert("Please provide a problem description or code snippet to analyze.");
      return;
    }

    setIsLoading(true);
    setAiOutput(null);
    setExtractedCode(null);
    setComplexity(null);
    setEdgeCases(null);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          prompt: problemPrompt,
          code: userCode,
          language,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setAiOutput(data.content);
        if (data.structuredData) {
          if (data.structuredData.code) setExtractedCode(data.structuredData.code);
          if (data.structuredData.complexity) setComplexity(data.structuredData.complexity);
          if (data.structuredData.edgeCases) setEdgeCases(data.structuredData.edgeCases);
        }
      } else {
        setAiOutput(`Notice: ${data.error || "Could not generate coding analysis. Please check your provider API key in Settings."}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Request failed";
      setAiOutput(`Request failed: ${message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const saveCodingSession = async () => {
    if (!aiOutput) {
      alert("Please execute an action first before saving this coding session.");
      return;
    }

    setSaveStatus("saving");

    try {
      const title = problemPrompt.trim()
        ? `[${language.toUpperCase()}] ${problemPrompt.substring(0, 50)}...`
        : `[${language.toUpperCase()}] Coding Exercise`;

      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          sessionType: "coding",
          targetRole: settings?.defaultJobRole || "Full-Stack Software Engineer",
          difficulty: settings?.interviewDifficulty || "Medium",
          transcriptText: `Problem:\n${problemPrompt}\n\nSubmitted Code:\n${userCode}`,
          aiFeedback: aiOutput,
          durationSeconds: 0,
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

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Coding Lab</h1>
          <p className="text-xs text-[#737373] mt-1">
            Interactive algorithmic assistant: solve coding challenges, debug defects, inspect complexities, and review design patterns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus === "saved" ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <Check className="h-3.5 w-3.5" /> Saved to History
            </span>
          ) : (
            <button
              onClick={saveCodingSession}
              disabled={!aiOutput || saveStatus === "saving"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-black shadow-xs hover:bg-[#E5E5E5] disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saveStatus === "saving" ? "Saving..." : "Save Session"}</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-[#A3A3A3] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Reset code"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Two-Column Editor & AI Solutions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Problem Input & Code Editor */}
        <div className="space-y-4">
          {/* Problem Statement Box */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-white" />
                Problem Statement / Requirements
              </label>

              {/* Language Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#737373] font-medium">Language:</span>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="rounded-lg border border-white/[0.12] bg-[#141414] px-2.5 py-1 text-xs font-semibold text-white focus:border-white focus:outline-hidden cursor-pointer"
                >
                  <option value="typescript">TypeScript</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="sql">SQL</option>
                  <option value="php">PHP</option>
                </select>
              </div>
            </div>

            <textarea
              rows={3}
              value={problemPrompt}
              onChange={(e) => setProblemPrompt(e.target.value)}
              placeholder="Describe the coding challenge, constraints, input/output formats..."
              className="w-full resize-none rounded-xl border border-white/[0.10] bg-white/[0.03] p-3 text-xs font-medium text-white placeholder-[#555] focus:border-white focus:outline-hidden"
            />
          </div>

          {/* Accessible Code Editor */}
          <div className="rounded-xl border border-white/[0.12] bg-[#0A0A0A] text-white shadow-xs overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5 bg-white/[0.02]">
              <div className="flex items-center gap-2 text-xs font-mono text-[#A3A3A3]">
                <Terminal className="h-4 w-4 text-white" />
                <span className="font-semibold uppercase text-white">{language} Source Code</span>
              </div>
              <span className="text-[11px] text-[#737373] font-mono">
                {userCode.split("\n").length} lines
              </span>
            </div>

            <textarea
              rows={16}
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              placeholder="// Write or paste your solution here..."
              spellCheck={false}
              className="w-full resize-y bg-transparent p-4 font-mono text-xs text-white/90 leading-relaxed focus:outline-hidden selection:bg-white/20"
            />
          </div>

          {/* Action Toolbar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              onClick={() => runCodeAction("solve_problem")}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white py-2.5 px-3 text-xs font-bold text-black shadow-xs hover:bg-[#E5E5E5] disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Solve Problem</span>
            </button>

            <button
              onClick={() => runCodeAction("debug_code")}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 px-3 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Bug className="h-3.5 w-3.5 text-white" />
              <span>Debug Code</span>
            </button>

            <button
              onClick={() => runCodeAction("explain_code")}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 px-3 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <BookOpen className="h-3.5 w-3.5 text-white" />
              <span>Explain</span>
            </button>

            <button
              onClick={() => runCodeAction("review_code")}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 px-3 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <CheckCircle className="h-3.5 w-3.5 text-white" />
              <span>Review</span>
            </button>
          </div>
        </div>

        {/* Right Column: AI Analysis, Complexity, Edge Cases & Generated Solution */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-xs space-y-4 min-h-[500px]">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-white" />
              <h3 className="text-sm font-bold text-white">
                AI Solution & Algorithmic Analysis
              </h3>
            </div>

            {extractedCode && (
              <button
                onClick={() => handleCopyCode(extractedCode)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? "Copied" : "Copy Solution"}</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#737373] space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <p className="text-xs font-semibold text-white/80">
                Running algorithmic analysis with {settings?.activeProviderName || settings?.activeProvider || "Gemini"}...
              </p>
            </div>
          ) : aiOutput ? (
            <div className="space-y-4">
              {/* Complexity Badges if extracted */}
              {complexity && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.03] p-3 border border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#737373] uppercase">
                      <Clock className="h-3.5 w-3.5 text-white" />
                      Time Complexity
                    </div>
                    <div className="mt-1 font-mono text-sm font-bold text-white">
                      {complexity.time || "O(n)"}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/[0.03] p-3 border border-white/[0.08]">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#737373] uppercase">
                      <Layers className="h-3.5 w-3.5 text-white" />
                      Space Complexity
                    </div>
                    <div className="mt-1 font-mono text-sm font-bold text-white">
                      {complexity.space || "O(1)"}
                    </div>
                  </div>
                </div>
              )}

              {/* Edge Cases List */}
              {edgeCases && edgeCases.length > 0 && (
                <div className="rounded-xl bg-amber-500/10 p-3.5 border border-amber-500/20 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                    Crucial Edge Cases
                  </div>
                  <ul className="list-disc list-inside text-xs text-amber-200/90 space-y-1">
                    {edgeCases.map((ec, i) => (
                      <li key={i}>{ec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Full Formatted AI Text Output */}
              <div className="rounded-xl border border-white/[0.06] bg-black/40 p-4 text-xs font-mono leading-relaxed text-white/90 whitespace-pre-wrap overflow-x-auto max-h-[500px]">
                {aiOutput}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center text-[#737373] space-y-2">
              <Code2 className="h-10 w-10 text-[#555]" />
              <h4 className="text-sm font-semibold text-white">Ready for problem analysis</h4>
              <p className="text-xs max-w-sm">
                Choose an action from the toolbar to solve the problem, debug defects, inspect Big-O complexities, or perform a rigorous code review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
