# CRDT TODO List

A collaborative TODO list application demonstrating Conflict-free Replicated Data Types (CRDTs) using [Automerge](https://automerge.org/) and [automerge-repo](https://github.com/automerge/automerge-repo).

## Features

- **Real-time sync**: Changes propagate instantly between all connected clients
- **Character-level merging**: Concurrent edits to the same text are merged intelligently
- **Multi-node architecture**: Multiple sync servers can peer with each other
- **Offline support**: Local changes are persisted and sync when reconnected
- **No central authority**: Each node is a full peer, no single point of failure

## Architecture

```text
┌─────────────────┐         ┌─────────────────┐
│     Node 1      │◄───────►│     Node 2      │
│  (Port 3001)    │  peer   │  (Port 3002)    │
│                 │  sync   │                 │
└────────▲────────┘         └────────▲────────┘
         │                           │
         │ WebSocket                 │ WebSocket
         │                           │
    ┌────┴────┐                 ┌────┴────┐
    │ Browser │                 │ Browser │
    │ (User A)│                 │ (User B)│
    └─────────┘                 └─────────┘
```

## Prerequisites

- Node.js 20+
- Docker and Docker Compose

## Quick Start (Local Multi-Node)

### Two Nodes (Default)

Run two sync servers locally that peer with each other:

```bash
docker-compose up --build
```

This starts:

- **Node 1** at <http://localhost:3001>
- **Node 2** at <http://localhost:3002>

Open Node 1 in one browser, copy the URL (with hash), and open it in Node 2 in another browser. Changes sync between them!

### Three Nodes (Demo Dynamic Membership)

Start with two nodes, then add a third to demonstrate dynamic cluster membership:

```bash
# Start with 2 nodes
docker-compose up --build -d

# Create some todos, sync between node1 and node2...

# Later, add node3 to the cluster
docker-compose --profile three-nodes up node3 -d

# Check that node3 connected
docker logs crdt-todo-node3
```

Now you have:

- **Node 1** at <http://localhost:3001>
- **Node 2** at <http://localhost:3002>
- **Node 3** at <http://localhost:3003>

Open the same document URL on Node 3 - it will sync all existing data from the other nodes!

```text
┌─────────────────┐
│     Node 1      │
│  (Port 3001)    │
└───────┬─────────┘
        │
        ├────────────────────┐
        │                    │
        ▼                    ▼
┌───────┴─────────┐  ┌───────┴─────────┐
│     Node 2      │◄─┤     Node 3      │
│  (Port 3002)    │  │  (Port 3003)    │
└─────────────────┘  └─────────────────┘
```

All three nodes form a fully connected mesh and sync with each other.

## Development

### Server

```bash
cd server
npm install
npm run dev
```

### Client

```bash
cd client
npm install
npm run dev
```

## Remote Deployment (Two VMs/Servers)

To demo true distributed sync with two laptops connecting to two different servers:

### Step 1: Deploy Node 1 (VM-A)

SSH into your first VM and run:

```bash
# Clone the repo
git clone <your-repo-url>
cd dist-sys-project

# Create a single-node docker-compose override
cat > docker-compose.override.yml << 'EOF'
services:
  node1:
    ports:
      - "80:3000"
    environment:
      - NODE_NAME=vm-a
      - PEER_URLS=ws://<VM-B-IP-ADDRESS>:80
EOF

# Build and run
docker-compose up --build node1 -d
```

### Step 2: Deploy Node 2 (VM-B)

SSH into your second VM and run:

```bash
# Clone the repo
git clone <your-repo-url>
cd dist-sys-project

# Create a single-node docker-compose override
cat > docker-compose.override.yml << 'EOF'
services:
  node2:
    ports:
      - "80:3000"
    environment:
      - NODE_NAME=vm-b
      - PEER_URLS=ws://<VM-A-IP-ADDRESS>:80
EOF

# Build and run
docker-compose up --build node2 -d
```

### Step 3: Connect from Laptops

- **Laptop A**: Open `http://<VM-A-IP-ADDRESS>` in browser
- **Laptop B**: Copy the full URL (including the `#automerge:...` hash) and open `http://<VM-B-IP-ADDRESS>#automerge:...`

Both laptops now share the same document, synced through their respective servers!

### Firewall Configuration

Ensure these ports are open:

- **Port 80** (or your chosen port): HTTP + WebSocket from browsers
- Between VMs: Allow WebSocket connections on the configured port

### Cloud Provider Examples

**AWS EC2:**

```bash
# Security group: Allow inbound TCP 80 from anywhere
# Allow inbound TCP 80 from the other EC2's security group
```

**DigitalOcean:**

```bash
# Firewall: Allow inbound TCP 80
# Ensure both droplets can communicate
```

**Google Cloud:**

```bash
# Firewall rule: Allow tcp:80 from 0.0.0.0/0
```

## Demonstrating CRDT Conflict Resolution

### Concurrent Edits Demo

1. Open the app in two browser tabs (same URL with hash)
2. Create a todo: "Buy groceries"
3. In **Tab 1**: Click edit (✎), change to "Buy RED groceries"
4. In **Tab 2**: Click edit (✎), change to "Buy groceries TODAY"
5. Click Save (✓) in both tabs
6. **Result**: Both edits merge to "Buy RED groceries TODAY"

### Network Partition Demo

1. Set up two nodes on separate VMs
2. Create some todos while both nodes are connected
3. **Simulate partition**: Stop one node (`docker-compose stop node2`)
4. Make changes on the running node
5. **Restore connection**: Start the node again (`docker-compose start node2`)
6. Watch the changes sync automatically

## Project Structure

```text
├── server/
│   ├── src/
│   │   └── index.ts      # Express + WebSocket sync server
│   └── package.json
├── client/
│   ├── src/
│   │   ├── main.tsx      # Repo initialization
│   │   ├── App.tsx       # Main component
│   │   ├── TodoList.tsx  # Todo list with CRDT operations
│   │   └── types.ts      # TypeScript interfaces
│   └── package.json
├── Dockerfile            # Multi-stage build
├── docker-compose.yml    # Multi-node local setup
└── README.md
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP/WebSocket server port |
| `NODE_NAME` | `node1` | Unique identifier for this node |
| `PEER_URLS` | (empty) | Comma-separated WebSocket URLs of peer servers |
| `DATA_DIR` | `./data` | Directory for persistent storage |
| `PUBLIC_DIR` | `./public` | Directory for static files |

## How It Works

1. **Automerge Documents**: Each todo list is an Automerge document identified by a URL (`automerge:xyz...`)
2. **Sync Protocol**: Nodes exchange sync messages to reconcile document states
3. **Character-level CRDTs**: Text edits use `updateText()` for fine-grained merging
4. **Persistence**: Documents are saved to disk using `NodeFSStorageAdapter`
5. **Multi-hop Sync**: Changes propagate through peer connections (A → B → C)

## Technologies

- **[Automerge](https://automerge.org/)**: CRDT library (Rust core compiled to WASM)
- **[automerge-repo](https://github.com/automerge/automerge-repo)**: Document management and networking
- **React**: Frontend UI with hooks for reactive updates
- **Express**: HTTP server for static files and health checks
- **WebSocket**: Real-time bidirectional communication
- **Docker**: Containerization for easy deployment

## License

MIT
