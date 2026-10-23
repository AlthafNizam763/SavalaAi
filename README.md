# Savala AI — Full-Stack AI Interview & Coding Workspace

Savala AI is a high-performance, browser-based AI interview preparation and coding assistant built with Next.js App Router, TypeScript (strict mode), Tailwind CSS, PostgreSQL, Prisma ORM, and official Google Gemini & OpenAI SDKs.

---

## 🚀 Core Capabilities

1. **Live Meeting Interview Copilot (Authorized Real-Time Assistant)**
   - **Meeting Workspace & URL Validation**: Enter and validate Google Meet (`meet.google.com`) or Microsoft Teams (`teams.microsoft.com`) links with real-time feedback and supported connection workflows.
   - **Supported Audio Capture**:
     - *Browser Tab Audio*: Captures live interviewer speech directly from the meeting tab via `getDisplayMedia` with tab audio sharing.
     - *Microphone Mode*: Captures room and speaker audio via `getUserMedia`.
     - *Manual Input Stream*: Type or paste questions directly for instant answer generation.
   - **Multilingual Live Transcription**: Supports real-time English and Malayalam (`മലയാളം`) speech-to-text with continuous timestamps and segment streaming.
   - **Smart Question Detection & Deduplication**: Real-time parsing of interviewer questions with word-overlap deduplication algorithms to prevent duplicate questions from overlapping speech segments.
   - **Resume-Grounded AI Answers**: Live suggested answers generated in English, Malayalam, or Malayalam-English mixed (**Manglish**), strictly grounded in the candidate's verified resume without hallucinating work history. Covers Node.js, Express, React, Next.js, PHP, Laravel, CodeIgniter, REST APIs, MongoDB, and SQL.
   - **Clear Status & Controls**: Explicit connection states (Disconnected, Active, Paused), Start/Pause/Stop/Clear controls, and audio stream lifecycles.
   - **Screen-Sharing & Privacy Transparency**: Built-in advisory explaining window sharing vs. entire screen visibility. Complies strictly with meeting platform policies; no stealth overlays, no deceptive concealment of AI assistance.

2. **AI-Powered Mock Interview Practice Room**
   - Microphone recording with browser `MediaRecorder` and `getUserMedia` APIs.
   - Recording timer, audio wave visualization, and permission lifecycle handling.
   - Speech-to-text transcription adapter (OpenAI Whisper API).
   - Editable transcript panel with instant word count, copy, clear, and persistence.
   - AI interview coaching: answer evaluation, STAR-format model answers, and deep-dive technical concept breakdowns.

3. **Coding Lab Assistant**
   - Interactive code editor with line numbers and monospace styling.
   - Multi-language support: **TypeScript, JavaScript, Python, Java, SQL, PHP**.
   - One-click actions: **Solve Problem**, **Debug Code**, **Explain Code**, and **Review Code**.
   - Algorithmic analysis with **Time Complexity** ($O$), **Space Complexity**, **Edge Cases**, and suggested unit tests.

4. **My Resume Management**
   - In-memory PDF and TXT file parsing via server-side `unpdf`.
   - File size limits (up to 10MB) and MIME type validation.
   - Automatic extraction of candidate technical summary and core competency tags.
   - AI generation of 5 tailored interview questions based directly on the candidate's resume projects.
   - One-click "Practice in Practice Room" shortcut for every extracted question.
   - Privacy controls: replace resume or permanently delete stored text.

5. **Persistent Session History & Dashboard**
   - Real metrics: total practice sessions, total speaking minutes, resume status, and active AI engine.
   - Filterable session history (All, Interview, Coding) with details modal.
   - Privacy controls to clear individual sessions or wipe all records.

5. **Switchable AI Text-Generation Providers**
   - Support for both **Google Gemini** (via official `@google/genai` SDK) and **OpenAI** (via official `openai` SDK).
   - Dynamic provider switching in Settings with model verification and fallback.
   - Secure server-side secret management: API keys are never stored in browser localStorage or exposed in client responses.

---

## 🎨 Brand Identity & Design System

The application strictly implements the Savala AI design tokens:

| Token | Hex | Role |
| :--- | :--- | :--- |
| **ICE SILVER** | `#DDE3E8` | Primary light background, panels, form fields, and subtle separators |
| **DEEP AUBERGINE** | `#3A0F34` | Fixed desktop sidebar, brand elements, headings, and strong interface surfaces |
| **MARIGOLD** | `#EAAA00` | Primary CTAs, active recording indicators, selected navigation badges, highlights |

CSS custom properties are defined in `src/app/globals.css`.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 with custom brand tokens
- **Icons**: Lucide Icons
- **Database & ORM**: MongoDB + Prisma ORM (v6.19.3)
- **AI SDKs**: Official Google GenAI (`@google/genai`) and OpenAI (`openai`)
- **Speech-to-Text**: Dedicated OpenAI Whisper STT adapter
- **PDF Extraction**: Server-side `unpdf`
- **Validation**: Zod v4 schemas on all API routes

---

## 📋 Environment Variables Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configure your credentials:

```ini
# MongoDB Connection URL (Local or MongoDB Atlas)
DATABASE_URL="mongodb://localhost:27017/savala_ai?authSource=admin"
# MongoDB Atlas Example:
# DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/savala_ai?retryWrites=true&w=majority"

# Google Gemini (https://aistudio.google.com/)
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"

# OpenAI (https://platform.openai.com/)
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4o-mini"

# Speech-to-Text Transcription
TRANSCRIPTION_PROVIDER="openai"
TRANSCRIPTION_API_KEY="" # Defaults to OPENAI_API_KEY if left blank
TRANSCRIPTION_MODEL="whisper-1"

# Security & Limits
AUTH_SECRET="savala-super-secret-key-change-in-production-min-32-chars-long"
MAX_UPLOAD_MB="10"
DEFAULT_AI_PROVIDER="gemini"
```

---

## 💻 Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client for MongoDB
```bash
npx prisma generate
```

### 3. Sync Database Indexes (MongoDB)
If your MongoDB instance is running:
```bash
npx prisma db push
```
*(Note: If running without a live MongoDB instance locally, Savala AI includes a resilient file-based store fallback in `.savala_data/` so that all sessions, resumes, and settings persist seamlessly even before MongoDB is provisioned).*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing and Quality Assurance

Run the test suite:
```bash
npm test
```

Run TypeScript strict check:
```bash
npx tsc --noEmit
```

Run ESLint:
```bash
npm run lint
```

Build for production:
```bash
npm run build
```

---

## 🌐 Production Deployment (Vercel)

1. Push code to your Git repository.
2. Import project into Vercel.
3. Connect your MongoDB Atlas database cluster (`DATABASE_URL`).
4. Add the environment variables (`DATABASE_URL`, `GEMINI_API_KEY`, `OPENAI_API_KEY`, `AUTH_SECRET`, etc.) in Vercel Project Settings.
5. In build commands, ensure `prisma generate` is executed (configured automatically via `postinstall` in `package.json`).
6. Deploy. Note that HTTPS is automatically enabled by Vercel, providing full secure microphone and display media audio access.

---

## 🔒 Security & Privacy Architecture

- **No Public Files**: Uploaded resumes and recorded audio files are processed in-memory and never exposed via public URLs or unauthenticated static buckets.
- **Microphone Lifecycles**: All media streams and tracks are explicitly released when recording stops or when components unmount.
- **Server-Side Secret Isolation**: Provider API keys are never bundled into client JS, never stored in browser cookies/localStorage, and never returned in API payloads.
- **Authorization**: All CRUD operations on resumes and sessions are strictly scoped to the authenticated user ID.
