import React from "react";
import ReactDOM from "react-dom/client";
import { Repo, isValidAutomergeUrl, AutomergeUrl } from "@automerge/automerge-repo";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { RepoContext } from "@automerge/automerge-repo-react-hooks";
import App from "./App";
import "./index.css";
import { TodoDoc } from "./types";

// Determine WebSocket URL based on current location
const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${wsProtocol}//${window.location.host}`;

// Initialize the Automerge Repo
const repo = new Repo({
  network: [new BrowserWebSocketClientAdapter(wsUrl)],
  storage: new IndexedDBStorageAdapter(),
});

// Get or create the document
function getDocUrl(): AutomergeUrl {
  const hash = document.location.hash.substring(1);
  
  if (isValidAutomergeUrl(hash)) {
    console.log("Loading existing document:", hash);
    return hash as AutomergeUrl;
  }
  
  // Create a new document
  console.log("Creating new document...");
  const handle = repo.create<TodoDoc>();
  handle.change((d) => {
    d.todos = [];
  });
  
  // Store the URL in the hash for sharing/persistence
  document.location.hash = handle.url;
  console.log("Created new document:", handle.url);
  
  return handle.url;
}

const docUrl = getDocUrl();

// Make repo and handle available for debugging
(window as any).repo = repo;
(window as any).docUrl = docUrl;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RepoContext.Provider value={repo}>
      <App docUrl={docUrl} />
    </RepoContext.Provider>
  </React.StrictMode>
);
