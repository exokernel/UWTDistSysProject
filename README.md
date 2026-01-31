# CRDT TODO List

A collaborative TODO list application demonstrating Conflict-free Replicated Data Types (CRDTs) using [Automerge](https://automerge.org/) and [automerge-repo](https://github.com/automerge/automerge-repo).

## Architecture

This project consists of two main components:

- **Server**: A Node.js Express server running automerge-repo with WebSocket sync and filesystem persistence
- **Client**: A React frontend using automerge-repo React hooks for live updates

## Prerequisites

- Node.js 20+
- Docker and Docker Compose (for containerized deployment)

## Development

### Server

```bash
cd server
npm install
npm run dev
```

The server runs on `http://localhost:3000`.

### Client

```bash
cd client
npm install
npm run dev
```

The client runs on `http://localhost:5173` with a proxy to the server for WebSocket connections.

## Docker Deployment

Build and run with Docker Compose:

```bash
docker compose up --build
```

Access the application at `http://localhost:3000`.

## How It Works

1. The React client creates or loads an Automerge document identified by a URL hash
2. Changes to the TODO list are made through Automerge's change API
3. The client syncs changes to the server via WebSocket
4. The server persists changes to the filesystem
5. Multiple browser tabs/windows sharing the same document URL see live updates

## Project Structure

```
├── server/           # Node.js sync server
│   ├── src/
│   │   └── index.ts  # Express + WebSocket server
│   └── package.json
├── client/           # React frontend
│   ├── src/
│   │   ├── main.tsx      # App entry point
│   │   ├── App.tsx       # Main component
│   │   ├── TodoList.tsx  # Todo list component
│   │   └── types.ts      # TypeScript types
│   └── package.json
├── Dockerfile
└── docker-compose.yml
```

## Future Extensions

This architecture is designed to support multiple sync server nodes for true distributed CRDT replication. See the project plan for Phase 2 details.
