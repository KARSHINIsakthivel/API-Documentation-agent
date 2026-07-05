import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  FileText,
  MessageSquare,
  Upload,
  Database,
  Trash2,
  Send,
  CheckCircle,
  HelpCircle,
  Code,
  Terminal,
  ArrowRight,
  Info,
  RefreshCw,
  Plus,
  Compass,
  FileCode,
  FileUp,
  Settings,
  Bot,
  Flame,
  User,
  Check,
  ChevronRight
} from "lucide-react";

// Types
interface DocumentMeta {
  id: string;
  name: string;
  type: string;
  uploaded_at: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface PythonWorkspace {
  [filePath: string]: string;
}

const MODULES = [
  { id: 1, title: "Module 1: Dependencies & SQLite DB Setup", desc: "Set up project structure, configure requirements, and initialize the SQLite database." },
  { id: 2, title: "Module 2: Flask App Boilerplate", desc: "Create the main app structure and configure Flask database initialization." },
  { id: 3, title: "Module 3: UI Design & Templates", desc: "Craft the visual front-end with HTML, custom styling, and async Javascript operations." },
  { id: 4, title: "Module 4: File Upload & Parsing", desc: "Add support for extracting clean text from Markdown, TXT, and PDF files." },
  { id: 5, title: "Module 5: Storing Metadata in SQLite", desc: "Expose Express/Flask upload endpoints to record document logs to SQLite." },
  { id: 6, title: "Module 6: Connecting with Gemini AI", desc: "Integrate the official Google GenAI SDK to communicate with the Gemini API." },
  { id: 7, title: "Module 7: Conversational Chat Logs", desc: "Store and retrieve full-history dialogue logs directly inside SQLite." },
  { id: 8, title: "Module 8: Deletion & Workspace Resets", desc: "Clean up specific resources and safely manage full-history wipes." },
  { id: 9, title: "Module 9: Docker Packaging & Run Guide", desc: "Containerize the system and run it locally with extreme ease." },
];

const PRESET_DOCUMENTS = [
  {
    name: "user_api_v1.md",
    type: "md",
    content: `# User Management API Documentation (v1.2)

Welcome to the User Management API. This API is used to manage user accounts, authentication, and profiles.

## Authentication
All requests must include the following header:
\`\`\`
Authorization: Bearer <your_access_token>
\`\`\`

## Endpoint: Create a New User
Create a brand new system user.
- **URL:** \`/api/v1/users\`
- **Method:** \`POST\`
- **Headers:** \`Content-Type: application/json\`
- **Request Body:**
  \`\`\`json
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }
  \`\`\`
- **Success Response (201 Created):**
  \`\`\`json
  {
    "id": 1422,
    "username": "john_doe",
    "email": "john@example.com",
    "status": "active"
  }
  \`\`\`

## Endpoint: Get User Profile
Retrieve user details.
- **URL:** \`/api/v1/users/<id>\`
- **Method:** \`GET\`
- **Success Response (200 OK):**
  \`\`\`json
  {
    "id": 1422,
    "username": "john_doe",
    "email": "john@example.com",
    "bio": "Software developer",
    "avatar_url": "https://images.example.com/profiles/1422.png"
  }
  \`\`\`

## Error Codes
- \`400 Bad Request\`: Missing username or invalid email format.
- \`401 Unauthorized\`: Missing or invalid Bearer token.
- \`409 Conflict\`: Username or email already registered.
`
  },
  {
    name: "payments_stripe_proxy.txt",
    type: "txt",
    content: `PAYMENTS PROXY API REFERENCE (TXT v2.0)

Base URL: https://payments.internal.api/v2

This API provides secure credit card billing operations for subscriptions and invoices.

SECURITY / HEADERS:
Header Name: X-Internal-Proxy-Key
Value: Set this to your secure webhook payload signing secret.

OPERATIONS:

1. Charge Credit Card
Endpoint: /charges
Method: POST
Body Format: urlencoded
Parameters:
  - user_id (string, required): The internal user ID.
  - amount_cents (integer, required): The total price in cents (e.g., 2999 represents $29.99).
  - currency (string, optional, defaults to 'USD'): Currency code.
  - stripe_token (string, required): Raw credit token from client stripe element.

Response Example (200 OK):
{
  "status": "success",
  "transaction_id": "tx_sub_99a882ff23",
  "receipt_url": "https://receipts.stripe.com/acct_102/tx_99a88"
}

2. Cancel Active Subscription
Endpoint: /subscriptions/cancel
Method: POST
Body:
  - subscription_id (string, required): The internal active billing subscription key.

Response:
{
  "status": "canceled",
  "grace_period_until": "2026-12-31"
}

ERROR HANDLING:
If charging fails, the system returns status 402 Payment Required with {"error": "CARD_DECLINED", "message": "Insufficient funds in the card account"}.
`
  }
];

export default function App() {
  // Navigation & State
  const [activeModule, setActiveModule] = useState(1);
  const [simulatedDb, setSimulatedDb] = useState<{
    documentsCount: number;
    chatsCount: number;
    documents: any[];
    chats: ChatMessage[];
  }>({ documentsCount: 0, chatsCount: 0, documents: [], chats: [] });

  // Upload Panel state
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState("txt");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);

  // Chat Panel state
  const [chatMessage, setChatMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Code Explorer State
  const [pythonWorkspace, setPythonWorkspace] = useState<PythonWorkspace>({});
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [refreshingFiles, setRefreshingFiles] = useState(false);

  // Active Tab for Simulator View: "chat" or "db"
  const [activeSimulatorTab, setActiveSimulatorTab] = useState<"chat" | "db">("chat");

  // Fetch current database state and created python files
  const fetchState = async () => {
    try {
      const resDb = await fetch("/api/db/state");
      const dbData = await resDb.json();
      setSimulatedDb(dbData);

      const resCode = await fetch("/api/python-workspace");
      const codeData = await resCode.json();
      setPythonWorkspace(codeData.fileTree);

      // Auto select first file if none selected
      const files = Object.keys(codeData.fileTree);
      if (files.length > 0 && !selectedFile) {
        // Prefer requirements or db.py
        const preferred = files.find(f => f.includes("requirements") || f.includes("db.py")) || files[0];
        setSelectedFile(preferred);
      }
    } catch (e) {
      console.error("Error fetching workspace states:", e);
    }
  };

  useEffect(() => {
    fetchState();
  }, [activeModule]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [simulatedDb.chats, chatLoading]);

  // Handle uploading custom document
  const handleUpload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!uploadName.trim() || !uploadContent.trim()) return;

    setUploadLoading(true);
    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: uploadName,
          type: uploadType,
          content: uploadContent
        })
      });
      if (res.ok) {
        setUploadName("");
        setUploadContent("");
        await fetchState();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadLoading(false);
    }
  };

  // Upload Preset Document helper
  const handleUploadPreset = async (preset: typeof PRESET_DOCUMENTS[0]) => {
    setUploadLoading(true);
    try {
      await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: preset.name,
          type: preset.type,
          content: preset.content
        })
      });
      await fetchState();
    } catch (err) {
      console.error(err);
    } finally {
      setUploadLoading(false);
    }
  };

  // Delete Document helper
  const handleDeleteDoc = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      await fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  // Send Message to Chat
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim() || chatLoading) return;

    const userMsg = chatMessage;
    setChatMessage("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chats/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatedDb(prev => ({
          ...prev,
          chats: data.chats
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  // Clear Chat History
  const handleClearChats = async () => {
    try {
      await fetch("/api/chats/clear", { method: "POST" });
      await fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  // Full Workspace Reset
  const handleResetWorkspace = async () => {
    if (confirm("Are you sure you want to delete all uploaded documentation and clear your chat history? This will reset your simulated database.")) {
      try {
        await fetch("/api/workspace/reset", { method: "POST" });
        await fetchState();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Force file explorer refresh
  const handleRefreshFiles = async () => {
    setRefreshingFiles(true);
    await fetchState();
    setTimeout(() => setRefreshingFiles(false), 500);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-slate-950">
      
      {/* Top Professional Header */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Bot className="w-3.5 h-3.5" /> Workspace Active
            </span>
            <span className="text-slate-500 text-xs font-mono">Port 3000 Ingress</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent mt-1">
            API Documentation Agent
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mt-0.5">
            Step-by-step developer workspace to build, test, and containerize a professional Flask & Gemini documentation Q&A engine.
          </p>
        </div>

        {/* Global Reset utility */}
        <button
          onClick={handleResetWorkspace}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-500/30 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 transition"
          title="Delete all documentation & messages"
        >
          <Trash2 className="w-3.5 h-3.5" /> Reset Database
        </button>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden bg-slate-900">
        
        {/* LEFT PANE: Live Active App Playground */}
        <div className="flex flex-col border-r border-slate-800 bg-slate-950/50 p-6 overflow-y-auto max-h-[calc(100vh-100px)]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
              <h2 className="text-lg font-semibold tracking-tight text-slate-200">
                🚀 Live Application Playground
              </h2>
            </div>
            {/* Tab switch */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                onClick={() => setActiveSimulatorTab("chat")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  activeSimulatorTab === "chat"
                    ? "bg-teal-500/15 text-teal-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Agent Chat
              </button>
              <button
                onClick={() => setActiveSimulatorTab("db")}
                className={`px-3 py-1 rounded-md font-medium transition ${
                  activeSimulatorTab === "db"
                    ? "bg-teal-500/15 text-teal-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                SQLite State
              </button>
            </div>
          </div>

          {activeSimulatorTab === "chat" ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              
              {/* Document upload section */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> 1. Upload API Documentation
                  </h3>
                  <span className="text-xs text-slate-500">Supports TXT, MD</span>
                </div>

                {/* Grid for Preset and Upload input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Preset loader cards */}
                  <div className="space-y-2 border-r border-slate-800/80 pr-0 md:pr-4">
                    <p className="text-xs font-medium text-slate-400">Load Quick Samples:</p>
                    <div className="space-y-2">
                      {PRESET_DOCUMENTS.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleUploadPreset(preset)}
                          disabled={uploadLoading}
                          className="w-full text-left bg-slate-950 hover:bg-slate-800/60 disabled:opacity-50 border border-slate-800 p-2.5 rounded-lg transition group flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-mono font-medium text-slate-300 truncate">{preset.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {preset.type === "md" ? "Markdown Schema" : "Plaintext API manual"}
                            </p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950 border border-teal-800 text-teal-400 shrink-0 group-hover:bg-teal-900/60">
                            + Load
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual form upload */}
                  <form onSubmit={handleUpload} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Filename (e.g. auth_doc.md)"
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
                        required
                      />
                      <select
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none font-mono"
                      >
                        <option value="txt">TXT</option>
                        <option value="md">MD</option>
                      </select>
                    </div>
                    <textarea
                      placeholder="Paste your API documentation / markdown structure here..."
                      value={uploadContent}
                      onChange={(e) => setUploadContent(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500 font-mono resize-none"
                      required
                    />
                    <button
                      type="submit"
                      disabled={uploadLoading || !uploadName || !uploadContent}
                      className="w-full inline-flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-slate-950 font-bold text-xs py-1.5 rounded-lg transition"
                    >
                      {uploadLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      Upload Custom Document
                    </button>
                  </form>
                </div>

                {/* Uploaded files section */}
                {simulatedDb.documents.length > 0 && (
                  <div className="border-t border-slate-800/80 mt-4 pt-3">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Uploaded Documents Stored in Database
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {simulatedDb.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-400" />
                          <span className="font-mono text-slate-300 font-medium">{doc.name}</span>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition"
                            title="Delete file"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat section */}
              <div className="flex-1 flex flex-col justify-between bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden min-h-[350px]">
                {/* Chat header info */}
                <div className="border-b border-slate-800/80 bg-slate-950/60 px-4 py-2.5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-400" />
                    <span className="text-xs font-semibold text-slate-300">2. Ask Questions About Documentation</span>
                  </div>
                  {simulatedDb.chats.length > 0 && (
                    <button
                      onClick={handleClearChats}
                      className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                    >
                      Clear History
                    </button>
                  )}
                </div>

                {/* Chat conversation area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[350px]">
                  {simulatedDb.chats.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                        <Compass className="w-6 h-6 text-slate-500" />
                      </div>
                      <div className="max-w-sm">
                        <p className="text-xs font-semibold text-slate-300">No Chat Logs Yet</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {simulatedDb.documents.length === 0 
                            ? "Please load or upload a documentation file above first, then ask a question."
                            : "Type a question below to query the Gemini AI using your uploaded API details!"}
                        </p>
                      </div>

                      {/* Prompt examples */}
                      {simulatedDb.documents.length > 0 && (
                        <div className="w-full text-left max-w-md pt-2">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
                            Try Asking:
                          </p>
                          <div className="space-y-1.5">
                            {[
                              "What are the error codes defined in the docs?",
                              "What parameters are required to create a user?",
                              "How do we authenticate requests?",
                            ].map((q, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setChatMessage(q);
                                }}
                                className="w-full text-left bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition"
                              >
                                "{q}"
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {simulatedDb.chats.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 max-w-[85%] ${
                            msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                          }`}
                        >
                          {/* Avatar icon */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border ${
                              msg.role === "user"
                                ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                                : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                            }`}
                          >
                            {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                          </div>

                          {/* Speech bubble */}
                          <div
                            className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed border ${
                              msg.role === "user"
                                ? "bg-teal-950/20 text-teal-200 border-teal-800/40"
                                : "bg-slate-950 text-slate-300 border-slate-800/80"
                            }`}
                          >
                            {/* Simple render of code blocks */}
                            <div className="whitespace-pre-line font-sans">
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      ))}

                      {chatLoading && (
                        <div className="flex gap-3 max-w-[80%] mr-auto">
                          <div className="w-7 h-7 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center animate-pulse">
                            <Bot className="w-3.5 h-3.5 text-sky-400" />
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 flex items-center gap-2">
                            <RefreshCw className="w-3 h-3 animate-spin text-teal-400" />
                            Gemini is checking the documentation...
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>

                {/* Input form */}
                <form onSubmit={handleSendMessage} className="border-t border-slate-800 bg-slate-950 p-2.5 flex gap-2">
                  <input
                    type="text"
                    placeholder={
                      simulatedDb.documents.length === 0
                        ? "⚠️ Load or upload API documents first"
                        : "Ask about authentication, endpoint parameters, status codes..."
                    }
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    disabled={simulatedDb.documents.length === 0 || chatLoading}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500 text-slate-200 placeholder:text-slate-600 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={simulatedDb.documents.length === 0 || chatLoading || !chatMessage.trim()}
                    className="bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-slate-950 font-bold px-4 rounded-lg transition text-xs flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </form>
              </div>

              {/* Hint badge */}
              <div className="flex items-center gap-2 text-slate-500 text-[11px] px-1 bg-slate-950/20 border border-slate-800/40 p-2 rounded-lg">
                <Info className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <span>
                  The chat uses Gemini 3.5 Flash and is strictly constrained by the system instructions to answer <strong>only</strong> from the uploaded API documentation and prevent hallucinations.
                </span>
              </div>

            </div>
          ) : (
            /* DATABASE INSPECTOR VIEW */
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 flex-1 flex flex-col">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold uppercase tracking-wider">Live SQLite Terminal</span>
                  <span className="text-slate-600 text-[10px]">database.db</span>
                </div>

                <div className="space-y-4 flex-1 overflow-y-auto max-h-[380px] pr-2">
                  {/* Documents table representation */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase font-semibold mb-1 border-b border-slate-800/60 pb-1">
                      <span>TABLE: "documents"</span>
                      <span>{simulatedDb.documents.length} Records</span>
                    </div>
                    {simulatedDb.documents.length === 0 ? (
                      <p className="text-slate-600 text-[11px] italic">No rows found in table 'documents'. Run an upload first.</p>
                    ) : (
                      <table className="w-full text-left text-[11px] text-slate-400 border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800/40 text-slate-500">
                            <th className="py-1 font-semibold">id</th>
                            <th className="py-1 font-semibold">name</th>
                            <th className="py-1 font-semibold">type</th>
                            <th className="py-1 font-semibold">content_preview</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulatedDb.documents.map((doc) => (
                            <tr key={doc.id} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                              <td className="py-1.5 font-mono text-teal-400">{doc.id.substring(4, 9)}</td>
                              <td className="py-1.5 font-mono text-slate-300">{doc.name}</td>
                              <td className="py-1.5 font-mono text-slate-500">{doc.type}</td>
                              <td className="py-1.5 truncate max-w-[150px] italic text-slate-500">
                                {doc.content.substring(0, 45)}...
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Chats table representation */}
                  <div className="pt-2">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase font-semibold mb-1 border-b border-slate-800/60 pb-1">
                      <span>TABLE: "chats"</span>
                      <span>{simulatedDb.chats.length} Records</span>
                    </div>
                    {simulatedDb.chats.length === 0 ? (
                      <p className="text-slate-600 text-[11px] italic">No rows found in table 'chats'. Send a message first.</p>
                    ) : (
                      <table className="w-full text-left text-[11px] text-slate-400 border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800/40 text-slate-500">
                            <th className="py-1 font-semibold">id</th>
                            <th className="py-1 font-semibold">role</th>
                            <th className="py-1 font-semibold">content_excerpt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {simulatedDb.chats.map((chat) => (
                            <tr key={chat.id} className="border-b border-slate-900/60 hover:bg-slate-900/40">
                              <td className="py-1.5 font-mono text-teal-400">{chat.id.substring(4, 9)}</td>
                              <td className="py-1.5 font-mono">
                                <span
                                  className={`px-1 rounded ${
                                    chat.role === "user"
                                      ? "bg-teal-950 text-teal-400"
                                      : "bg-sky-950 text-sky-400"
                                  }`}
                                >
                                  {chat.role}
                                </span>
                              </td>
                              <td className="py-1.5 truncate max-w-[200px] text-slate-300">
                                {chat.content.substring(0, 60)}...
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>SQLite schema and operational tracking active</span>
                  <div className="flex items-center gap-1.5 text-emerald-400/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    SQLite DB connected & synchronized
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* RIGHT PANE: Guided Python Learning Portal */}
        <div className="flex flex-col bg-slate-950 p-6 overflow-y-auto max-h-[calc(100vh-100px)]">
          
          {/* Header & Level Progress */}
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-4 mb-4">
            <div className="flex justify-between items-center text-xs font-semibold text-teal-400">
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" /> LEARNING PATHWAYS
              </span>
              <span>
                {Math.round((activeModule / MODULES.length) * 100)}% Completed
              </span>
            </div>
            
            {/* Horizontal progress bar */}
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <motion.div
                className="h-full bg-gradient-to-r from-teal-500 to-indigo-500"
                initial={{ width: 0 }}
                animate={{ width: `${(activeModule / MODULES.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Quick module selection dropdown */}
            <div className="mt-2 flex gap-2 items-center">
              <span className="text-xs text-slate-400 font-medium shrink-0">Current Stage:</span>
              <select
                value={activeModule}
                onChange={(e) => setActiveModule(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-medium flex-1 cursor-pointer"
              >
                {MODULES.map((m) => (
                  <option key={m.id} value={m.id}>
                    Module {m.id}: {m.title.split(": ")[1]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Module Content Switcher */}
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            
            {/* Active module information */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-teal-500/10 border border-teal-500/20 text-teal-400 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm">
                  {activeModule}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-200">
                    {MODULES.find((m) => m.id === activeModule)?.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {MODULES.find((m) => m.id === activeModule)?.desc}
                  </p>
                </div>
              </div>

              {/* Lesson Card */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-4 text-xs text-slate-300">
                {activeModule === 1 && (
                  <>
                    <div>
                      <h4 className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs mb-1">
                        <Info className="w-4 h-4 text-teal-400" /> Lesson Objective
                      </h4>
                      <p className="leading-relaxed text-slate-400">
                        Welcome to the workspace! In this first module, we establish our Python Flask folder structure and set up the foundation. We define our external package requirements in <code className="font-mono bg-slate-950 px-1 py-0.5 rounded text-teal-400">requirements.txt</code>, and initialize our SQLite database schema inside <code className="font-mono bg-slate-950 px-1 py-0.5 rounded text-teal-400">database/db.py</code>.
                      </p>
                    </div>

                    <div className="space-y-2 border-t border-slate-800 pt-3">
                      <h5 className="font-semibold text-slate-300">Why we need this code:</h5>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 leading-relaxed">
                        <li><strong className="text-slate-300">Flask</strong> serves as our micro web framework to expose uploading endpoints and server APIs.</li>
                        <li><strong className="text-slate-300">google-genai</strong> is the modern Google GenAI library to call the Gemini API securely.</li>
                        <li><strong className="text-slate-300">pypdf</strong> lets us extract pure text characters from binary PDF reference documentation.</li>
                        <li><strong className="text-slate-300">SQLite</strong> requires no heavy configuration and operates purely from a local file, saving state instantly.</li>
                      </ul>
                    </div>

                    <div className="border-t border-slate-800 pt-3">
                      <h5 className="font-semibold text-slate-300 mb-1">How to test database initialization:</h5>
                      <p className="text-slate-400 leading-relaxed">
                        To test, run the database initialization script directly from your local terminal:
                        <code className="block mt-1 bg-slate-950 border border-slate-800 p-2 rounded text-teal-400 font-mono">
                          python database/db.py
                        </code>
                        This creates a new file <code className="font-mono text-slate-300">database/database.db</code> on your local disk containing empty tables for <code className="font-mono">documents</code> and <code className="font-mono">chats</code>.
                      </p>
                    </div>
                  </>
                )}

                {activeModule > 1 && (
                  <div className="text-center py-6 space-y-3">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Flame className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300">Ready to unlock Module {activeModule}?</p>
                      <p className="text-slate-500 mt-1 max-w-sm mx-auto">
                        I am standing by to build this block! Tell me in the chat on the right: <strong>"I am ready for Module {activeModule}"</strong> or click the action button below, and I will write the python files and unlock the next lesson card for you!
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Python Code Explorer Frame */}
            <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden flex flex-col">
              <div className="border-b border-slate-800 bg-slate-900/40 px-4 py-2.5 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-slate-300">Python Project File Explorer</span>
                </div>
                <button
                  onClick={handleRefreshFiles}
                  disabled={refreshingFiles}
                  className="text-slate-500 hover:text-slate-300 p-1 rounded transition disabled:opacity-50"
                  title="Reload files from disk"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingFiles ? "animate-spin text-teal-400" : ""}`} />
                </button>
              </div>

              {/* Explorer File list tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950 overflow-x-auto text-xs shrink-0 select-none scrollbar-none">
                {Object.keys(pythonWorkspace).length === 0 ? (
                  <div className="px-4 py-2 text-slate-600 italic">No python files initialized yet.</div>
                ) : (
                  Object.keys(pythonWorkspace).sort().map((filePath) => (
                    <button
                      key={filePath}
                      onClick={() => setSelectedFile(filePath)}
                      className={`px-4 py-2.5 border-r border-slate-800 font-mono flex items-center gap-1.5 shrink-0 transition ${
                        selectedFile === filePath
                          ? "bg-slate-900 text-teal-400 font-semibold border-b border-b-teal-400"
                          : "text-slate-500 hover:bg-slate-900/30 hover:text-slate-300"
                      }`}
                    >
                      {filePath.includes("/") ? filePath.split("/").pop() : filePath}
                    </button>
                  ))
                )}
              </div>

              {/* Code viewer content */}
              <div className="p-4 bg-slate-900/40 max-h-[280px] overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre select-all selection:bg-teal-500 selection:text-slate-950">
                {selectedFile && pythonWorkspace[selectedFile] ? (
                  pythonWorkspace[selectedFile]
                ) : (
                  <span className="text-slate-600 italic">Select a file above to inspect the codebase structure.</span>
                )}
              </div>
            </div>

            {/* Bottom Lesson Action / Next steps */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs font-semibold text-slate-200">
                  {activeModule === 1 ? "Completed Module 1: Dependencies & SQLite?" : `Currently at Module ${activeModule}`}
                </p>
                <p className="text-[11px] text-slate-500">
                  {activeModule === 1
                    ? "Let's move onto Module 2 to initialize our Flask app core web framework."
                    : "Review the code instructions or prompt me to implement this module!"}
                </p>
              </div>

              <div className="flex gap-2">
                {activeModule === 1 ? (
                  <button
                    onClick={() => {
                      // Switch active module to 2
                      setActiveModule(2);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-xs transition"
                  >
                    I'm Ready: Module 2 <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // Reset back to Module 1 for reference
                      setActiveModule(1);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition text-xs"
                  >
                    Back to Module 1
                  </button>
                )}
              </div>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
