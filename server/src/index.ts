import express from "express";
import { WebSocketServer } from "ws";
import { Repo, NetworkAdapter } from "@automerge/automerge-repo";
import { 
  NodeWSServerAdapter,
  BrowserWebSocketClientAdapter 
} from "@automerge/automerge-repo-network-websocket";
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
const NODE_NAME = process.env.NODE_NAME || "node1";
// Comma-separated list of peer WebSocket URLs to connect to (e.g., "ws://node2:3000,ws://node3:3000")
const PEER_URLS = process.env.PEER_URLS || "";

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`Created data directory: ${DATA_DIR}`);
}

// Create Express app
const app = express();

// Create WebSocket server (noServer mode for Express integration)
const wss = new WebSocketServer({ noServer: true });

// Build network adapters array
const networkAdapters: NetworkAdapter[] = [
  new NodeWSServerAdapter(wss as any),
];

// Add client adapters to connect to peer servers
if (PEER_URLS) {
  const peerUrls = PEER_URLS.split(",").map((url) => url.trim()).filter(Boolean);
  for (const peerUrl of peerUrls) {
    console.log(`Configuring peer connection to: ${peerUrl}`);
    networkAdapters.push(new BrowserWebSocketClientAdapter(peerUrl));
  }
}

// Create Automerge Repo with WebSocket network adapters and filesystem storage
const repo = new Repo({
  network: networkAdapters,
  storage: new NodeFSStorageAdapter(DATA_DIR),
  peerId: `todo-server-${NODE_NAME}` as any,
  // sharePolicy: true means we'll sync any document a client asks for
  sharePolicy: async () => true,
});

console.log(`Automerge Repo initialized with peerId: todo-server-${NODE_NAME}`);
if (PEER_URLS) {
  console.log(`Configured to peer with: ${PEER_URLS}`);
}

// Log peer connection events
repo.networkSubsystem.on("peer", ({ peerId }) => {
  console.log(`[PEER CONNECTED] ${peerId}`);
});

repo.networkSubsystem.on("peer-disconnected", ({ peerId }) => {
  console.log(`[PEER DISCONNECTED] ${peerId}`);
});

// Serve static files (React build)
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  console.log(`Serving static files from: ${PUBLIC_DIR}`);
}

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    peerId: `todo-server-${NODE_NAME}`,
    peers: PEER_URLS ? PEER_URLS.split(",").map(s => s.trim()) : []
  });
});

// Root endpoint (fallback to index.html for SPA routing)
app.get("*", (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      message: "CRDT Todo Server is running",
      peerId: `todo-server-${NODE_NAME}`,
      peers: PEER_URLS ? PEER_URLS.split(",").map(s => s.trim()) : [],
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
