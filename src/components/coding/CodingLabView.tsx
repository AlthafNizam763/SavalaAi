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
    # Ensure nums1 is smaller or equal in length
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
      setAiOutput(`Request Error: ${message}`);
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
    if (!aiOutput && !userCode) return;

    setSaveStatus("saving");
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Coding: ${problemPrompt.substring(0, 50) || "Code Solution"}`,
          sessionType: "coding",
          durationSeconds: 0,
          targetRole: `${language.toUpperCase()} Algorithmic Challenge`,
          notes: problemPrompt,
          messages: [
            {
              role: "user",
              content: `Problem:\n${problemPrompt}\n\nCode:\n\`\`\`${language}\n${userCode}\n\`\`\``,
            },
            ...(aiOutput
              ? [
                  {
                    role: "assistant" as const,
                    content: aiOutput,
                    provider: settings?.activeProvider || "gemini",
                  },
                ]
              : []),
          ],
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#CBD5DD] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3A0F34]">Coding Lab</h1>
          <p className="text-xs sm:text-sm text-[#58505C]">
            Interactive algorithmic assistant: solve coding challenges, debug defects, inspect complexities, and review design patterns.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus === "saved" ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <Check className="h-3.5 w-3.5" /> Saved to History
            </span>
          ) : (
            <button
              onClick={saveCodingSession}
              disabled={!aiOutput || saveStatus === "saving"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5DD] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#3A0F34] shadow-xs hover:bg-[#F4F7F9] disabled:opacity-40 transition-colors"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saveStatus === "saving" ? "Saving..." : "Save Session"}</span>
            </button>
          )}

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#CBD5DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#58505C] hover:bg-[#F4F7F9] transition-colors"
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
          <div className="rounded-xl border border-[#CBD5DD] bg-white p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#3A0F34] flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-[#EAAA00]" />
                Problem Statement / Requirements
              </label>

              {/* Language Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#58505C] font-medium">Language:</span>
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="rounded-md border border-[#CBD5DD] bg-[#F4F7F9] px-2.5 py-1 text-xs font-semibold text-[#3A0F34] focus:border-[#3A0F34] focus:outline-hidden"
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
              className="w-full resize-none rounded-lg border border-[#CBD5DD] bg-[#F4F7F9] p-3 text-xs font-medium text-[#1F1722] focus:border-[#3A0F34] focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Accessible Code Editor */}
          <div className="rounded-xl border border-[#3A0F34] bg-[#270A23] text-white shadow-xs overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#3A0F34]">
              <div className="flex items-center gap-2 text-xs font-mono text-[#DDE3E8]">
                <Terminal className="h-4 w-4 text-[#EAAA00]" />
                <span className="font-semibold uppercase">{language} Source Code</span>
              </div>
              <span className="text-[11px] text-[#DDE3E8]/60 font-mono">
                {userCode.split("\n").length} lines
              </span>
            </div>

            <textarea
              rows={16}
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              placeholder="// Write or paste your solution here..."
              spellCheck={false}
              className="w-full resize-y bg-[#270A23] p-4 font-mono text-xs text-[#DDE3E8] leading-relaxed focus:outline-hidden selection:bg-[#EAAA00]/30"
            />
          </div>

          {/* Action Toolbar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              onClick={() => runCodeAction("solve_problem")}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#EAAA00] py-2.5 px-3 text-xs font-bold text-[#270A23] shadow-sm hover:bg-[#CF9400] disabled:opacity-50 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Solve Problem</span>
            </button>

            <button
              onClick={() => runCodeAction("debug_code")}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-[#3A0F34] py-2.5 px-3 text-xs font-bold text-white hover:bg-[#270A23] disabled:opacity-50 transition-colors"
            >
              <Bug className="h-3.5 w-3.5 text-[#EAAA00]" />
              <span>Debug Code</span>
            </button>

            <button
              onClick={() => runCodeAction("explain_code")}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#CBD5DD] bg-white py-2.5 px-3 text-xs font-bold text-[#3A0F34] hover:bg-[#F4F7F9] disabled:opacity-50 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-[#3A0F34]" />
              <span>Explain</span>
            </button>

            <button
              onClick={() => runCodeAction("review_code")}
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#CBD5DD] bg-white py-2.5 px-3 text-xs font-bold text-[#3A0F34] hover:bg-[#F4F7F9] disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5 text-[#3A0F34]" />
              <span>Review</span>
            </button>
          </div>
        </div>

        {/* Right Column: AI Analysis, Complexity, Edge Cases & Generated Solution */}
        <div className="rounded-xl border border-[#CBD5DD] bg-white p-5 shadow-xs space-y-4 min-h-[500px]">
          <div className="flex items-center justify-between border-b border-[#CBD5DD] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#EAAA00]" />
              <h3 className="text-sm font-bold text-[#3A0F34]">
                AI Solution & Algorithmic Analysis
              </h3>
            </div>

            {extractedCode && (
              <button
                onClick={() => handleCopyCode(extractedCode)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#DDE3E8] px-2.5 py-1 text-xs font-semibold text-[#3A0F34] hover:bg-[#CBD5DD] transition-colors"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedCode ? "Copied" : "Copy Solution"}</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-[#58505C] space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#EAAA00]" />
              <p className="text-xs font-semibold">
                Running algorithmic analysis with {settings?.activeProvider || "Gemini"}...
              </p>
            </div>
          ) : aiOutput ? (
            <div className="space-y-4">
              {/* Complexity Badges if extracted */}
              {complexity && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-[#F4F7F9] p-3 border border-[#CBD5DD]">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#58505C] uppercase">
                      <Clock className="h-3.5 w-3.5 text-[#3A0F34]" />
                      Time Complexity
                    </div>
                    <div className="mt-1 font-mono text-sm font-bold text-[#3A0F34]">
                      {complexity.time || "O(n)"}
                    </div>
                  </div>

                  <div className="rounded-lg bg-[#F4F7F9] p-3 border border-[#CBD5DD]">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#58505C] uppercase">
                      <Layers className="h-3.5 w-3.5 text-[#3A0F34]" />
                      Space Complexity
                    </div>
                    <div className="mt-1 font-mono text-sm font-bold text-[#3A0F34]">
                      {complexity.space || "O(1)"}
                    </div>
                  </div>
                </div>
              )}

              {/* Edge Cases List */}
              {edgeCases && edgeCases.length > 0 && (
                <div className="rounded-lg bg-amber-50/60 p-3.5 border border-amber-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                    Crucial Edge Cases
                  </div>
                  <ul className="list-disc list-inside text-xs text-amber-900 space-y-1">
                    {edgeCases.map((ec, i) => (
                      <li key={i}>{ec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Full Formatted AI Text Output */}
              <div className="rounded-lg bg-[#F4F7F9] p-4 text-xs font-mono leading-relaxed text-[#1F1722] whitespace-pre-wrap overflow-x-auto max-h-[500px]">
                {aiOutput}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center text-[#58505C] space-y-2">
              <Code2 className="h-10 w-10 text-[#CBD5DD]" />
              <h4 className="text-sm font-semibold text-[#1F1722]">Ready for problem analysis</h4>
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
