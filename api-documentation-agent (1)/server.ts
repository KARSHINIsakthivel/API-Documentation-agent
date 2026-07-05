import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Local File Store for Live Simulation of SQLite Database
// In our live React simulation, we write to a JSON file to serve as a fast and persistent DB,
// avoiding heavy SQLite C++ compilation on Node.js while keeping actual SQLite code in Python.
const DB_FILE = path.join(process.cwd(), "db_live_simulation.json");

interface Document {
  id: string;
  name: string;
  type: string;
  content: string;
  uploaded_at: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface DatabaseSchema {
  documents: Document[];
  chats: ChatMessage[];
}

function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseSchema = { documents: [], chats: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch (err) {
    return { documents: [], chats: [] };
  }
}

function saveDb(data: DatabaseSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ensure Python directory structure exists for the actual Python codebase
const PYTHON_DIR = path.join(process.cwd(), "api-document-agent");
const dirsToCreate = [
  PYTHON_DIR,
  path.join(PYTHON_DIR, "templates"),
  path.join(PYTHON_DIR, "static"),
  path.join(PYTHON_DIR, "uploads"),
  path.join(PYTHON_DIR, "database"),
];

dirsToCreate.forEach((d) => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

// --- API ENDPOINTS ---

// 1. Get Live Simulation Database State
app.get("/api/db/state", (req, res) => {
  const db = loadDb();
  res.json({
    documentsCount: db.documents.length,
    chatsCount: db.chats.length,
    documents: db.documents.map(d => ({ id: d.id, name: d.name, type: d.type, uploaded_at: d.uploaded_at })),
    chats: db.chats,
  });
});

// 2. Upload Document
app.post("/api/documents/upload", (req, res) => {
  const { name, type, content } = req.body;
  if (!name || !content) {
    return res.status(400).json({ error: "Name and content are required." });
  }

  const db = loadDb();
  const newDoc: Document = {
    id: "doc_" + Math.random().toString(36).substr(2, 9),
    name,
    type: type || "txt",
    content,
    uploaded_at: new Date().toISOString(),
  };

  db.documents.push(newDoc);
  saveDb(db);

  res.json({ success: true, document: { id: newDoc.id, name: newDoc.name, type: newDoc.type } });
});

// 3. Delete Document
app.delete("/api/documents/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDb();
  const initialLen = db.documents.length;
  db.documents = db.documents.filter((d) => d.id !== id);

  if (db.documents.length === initialLen) {
    return res.status(404).json({ error: "Document not found." });
  }

  saveDb(db);
  res.json({ success: true });
});

// 4. Send Message / Ask Question to Gemini
app.post("/api/chats/message", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const db = loadDb();
  
  // Save user message to simulated SQLite db
  const userMsgId = "msg_" + Math.random().toString(36).substr(2, 9);
  const userMessage: ChatMessage = {
    id: userMsgId,
    role: "user",
    content: message,
    timestamp: new Date().toISOString(),
  };
  db.chats.push(userMessage);
  saveDb(db);

  // Retrieve Gemini API Key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    const errorMsg = "GEMINI_API_KEY is not configured in Secrets.";
    const assistMessage: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substr(2, 9),
      role: "assistant",
      content: `⚠️ ${errorMsg} Please configure it in your Secrets tab on the top-right settings to test the actual AI generation.`,
      timestamp: new Date().toISOString(),
    };
    db.chats.push(assistMessage);
    saveDb(db);
    return res.json({ success: true, chats: db.chats });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Compile document context to insert into Gemini call
    const contextText = db.documents.length > 0 
      ? db.documents.map((d) => `=== DOCUMENT: ${d.name} ===\n${d.content}\n`).join("\n")
      : "NO DOCUMENTATION UPLOADED YET.";

    const systemPrompt = "You are an API Documentation Assistant. Answer questions only from the uploaded documentation. If the answer is not available, reply: 'The uploaded documentation doesn't contain enough information.' Never make up API endpoints or information.";

    const promptText = `
Below is the content of the uploaded API documentation:
---
${contextText}
---

User's Question: ${message}

Instructions: Analyze the documentation context. Answer the user's question truthfully using ONLY the context. If the context does not contain the answer, reply exactly: 'The uploaded documentation doesn't contain enough information.'
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2, // low temperature for precise, non-hallucinated facts
      },
    });

    const answer = response.text || "The uploaded documentation doesn't contain enough information.";

    // Save assistant response to simulated SQLite db
    const assistantMsgId = "msg_" + Math.random().toString(36).substr(2, 9);
    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: answer,
      timestamp: new Date().toISOString(),
    };
    db.chats.push(assistantMessage);
    saveDb(db);

    res.json({ success: true, chats: db.chats });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const assistantMsgId = "msg_" + Math.random().toString(36).substr(2, 9);
    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: `⚠️ Error communicating with Google Gemini API: ${error.message || error}`,
      timestamp: new Date().toISOString(),
    };
    db.chats.push(assistantMessage);
    saveDb(db);
    res.json({ success: true, chats: db.chats });
  }
});

// 5. Clear Chat History
app.post("/api/chats/clear", (req, res) => {
  const db = loadDb();
  db.chats = [];
  saveDb(db);
  res.json({ success: true });
});

// 6. Reset Workspace Entirely (delete docs and chat)
app.post("/api/workspace/reset", (req, res) => {
  const db = { documents: [], chats: [] };
  saveDb(db);
  res.json({ success: true });
});

// 7. Get Python Workspace File List & Contents (for code explorer)
app.get("/api/python-workspace", (req, res) => {
  const fileTree: Record<string, string> = {};

  const readDirRecursive = (dirPath: string, relativePrefix = "") => {
    if (!fs.existsSync(dirPath)) return;
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      if (item === "uploads" || item === "__pycache__" || item === ".DS_Store" || item === "database.db") {
        continue; // skip upload folder assets and cache
      }
      const fullPath = path.join(dirPath, item);
      const relativePath = relativePrefix ? `${relativePrefix}/${item}` : item;
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        readDirRecursive(fullPath, relativePath);
      } else {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          fileTree[relativePath] = content;
        } catch (e) {
          fileTree[relativePath] = "Binary or unreadable file.";
        }
      }
    }
  };

  readDirRecursive(PYTHON_DIR);
  res.json({ fileTree });
});

// Start dev server with Vite Middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] API Documentation Agent Dev Workspace running on http://localhost:${PORT}`);
  });
}

startServer();
