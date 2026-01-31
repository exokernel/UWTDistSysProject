import express from "express";
import { WebSocketServer } from "ws";
import { Repo } from "@automerge/automerge-repo";
import { NodeWSServerAdapter } from "@automerge/automerge-repo-network-websocket";
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "data");
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, "..", "public");
const HOSTNAME = process.env.HOSTNAME || "local";

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`Created data directory: ${DATA_DIR}`);
}

// Create Express app
const app = express();

// Create WebSocket server (noServer mode for Express integration)
const wss = new WebSocketServer({ noServer: true });

// Create Automerge Repo with WebSocket network adapter and filesystem storage
const repo = new Repo({
  network: [new NodeWSServerAdapter(wss as any)],
  storage: new NodeFSStorageAdapter(DATA_DIR),
  peerId: `todo-server-${HOSTNAME}` as any,
  // sharePolicy: true means we'll sync any document a client asks for
  sharePolicy: async () => true,
});

console.log(`Automerge Repo initialized with peerId: todo-server-${HOSTNAME}`);

// Serve static files (React build)
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  console.log(`Serving static files from: ${PUBLIC_DIR}`);
}

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", peerId: `todo-server-${HOSTNAME}` });
});

// Root endpoint (fallback to index.html for SPA routing)
app.get("*", (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      message: "CRDT Todo Server is running",
      peerId: `todo-server-${HOSTNAME}`,
      hint: "Build and copy the client to the public directory for the full application",
    });
  }
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// Handle WebSocket upgrade requests
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Graceful shutdown
const shutdown = () => {
  console.log("\nShutting down...");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
