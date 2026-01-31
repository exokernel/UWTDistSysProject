import { AutomergeUrl } from "@automerge/automerge-repo";
import { useDocument } from "@automerge/automerge-repo-react-hooks";
import TodoList from "./TodoList";
import { TodoDoc } from "./types";
import "./App.css";

interface AppProps {
  docUrl: AutomergeUrl;
}

function App({ docUrl }: AppProps) {
  const [doc, changeDoc] = useDocument<TodoDoc>(docUrl);

  // Show loading state while document is being fetched
  if (!doc) {
    return (
      <div className="app">
        <div className="loading">
          <h1>CRDT Todo List</h1>
          <p>Connecting to sync server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>CRDT Todo List</h1>
        <p className="subtitle">
          Powered by{" "}
          <a href="https://automerge.org" target="_blank" rel="noopener noreferrer">
            Automerge
          </a>
        </p>
      </header>

      <main className="main">
        <TodoList doc={doc} changeDoc={changeDoc} />
      </main>

      <footer className="footer">
        <p>
          Open this URL in another tab or browser to see real-time sync:
        </p>
        <code className="doc-url">{window.location.href}</code>
        <p className="hint">
          Document ID: <code>{docUrl.split(":")[1]?.substring(0, 12)}...</code>
        </p>
      </footer>
    </div>
  );
}

export default App;
