# FinShield — AI Financial Fraud Intelligence Platform

> Real-time fraud monitoring and investigation platform for modern payment ecosystems.

FinShield is a full-stack fraud detection system that simulates the kind of fraud intelligence tooling used by banks, payment processors, and financial institutions to monitor transactions, detect anomalies, and assist investigators in identifying fraud rings, account takeovers, and geographic anomalies — all in real time.

---

## Dashboard Preview

| Screen | Preview |
|--------|---------|
| Transaction Monitor | ![Transaction Dashboard](docs/images/transaction_dashboard.png) |
| Fraud Network Graph | ![Fraud Network](docs/images/fraud_network.png) |
| Geo Risk Map | ![Geo Risk Map](docs/images/geo_risk_map.png) |
| Behavioral Analysis | ![Behavioral Analysis](docs/images/behavioral_analysis.png) |
| Fraud Simulation Mode | ![Fraud Simulation](docs/images/fraud_simulation.png) |

---

## Problem Statement

Financial institutions process millions of transactions daily. Detecting fraud in real time is difficult due to constantly evolving attack patterns including:

-  **Money mule networks** — rapid high-volume transfers across accounts
-  **Account takeovers** — login from a new device with unusual transaction patterns
-  **Geo anomalies** — transactions originating from geographically impossible locations within seconds
-  **Device spoofing** — transactions from unrecognized or newly registered devices

FinShield demonstrates how modern fraud platforms combine **streaming data ingestion**, **risk scoring engines**, **behavioral analytics**, **network graph analysis**, and **interactive investigation tooling** to help analysts respond faster and more accurately.

---

## Key Features

###  Real-Time Transaction Monitoring
Live transaction feed powered by **Server-Sent Events (SSE)**. Each transaction is scored and persisted to PostgreSQL the moment it is generated — no data is lost between stream and database.

###  Fraud Detection Engine
A rule-based risk scoring system evaluating 5 risk dimensions per transaction:

| Factor | Weight |
|--------|--------|
| Transaction amount anomaly | 30% |
| New device detected | 20% |
| Geographic mismatch | 20% |
| New recipient | 15% |
| Behavioral anomaly | 15% |

Transactions scoring ≥ 0.70 are flagged as **Suspicious** and generate a `FraudAlert`.

### Fraud Alerts
Automatically created alerts with severity levels (`low`, `medium`, `high`, `critical`) for every suspicious transaction, including a recommended action.

### Fraud Network Graph
Interactive D3.js force-directed graph showing account relationships as nodes and transactions as edges. Suspicious connections appear in red. Click a node to highlight its connections and detect mule rings.

### Behavioral Analysis + Risk Timeline
Per-account behavioral profiles showing:
- Daily transaction volume trends
- Daily transaction count charts
- ⚡ **Risk Score Timeline** — a line chart showing risk score spikes over time, with a configurable alert threshold line at 70%

### Visual Fraud Map
D3.js world map (`geoNaturalEarth1` projection) plotting transaction flows as **curved arcs** between origin and destination cities:
- 🔴 Red animated dashes — suspicious transactions
- 🟢 Green arcs — normal transactions
- Hover tooltip shows full transaction details

### ⚡ Fraud Simulation Mode
One-click attack injection for demo and testing:

| Simulation | Description |
|------------|-------------|
| Rapid Transfer Attack | 5 high-value transfers in rapid succession |
|  Account Takeover | New device + geo mismatch + massive amount |
|  Geo Anomaly Attack | Impossible travel: Mumbai → New York in minutes |

All simulated transactions are **persisted to PostgreSQL** and appear across all dashboards in real time.

### Fraud Investigation AI Assistant
A natural language copilot panel (rule-based, no LLM required) that answers analyst questions:
- _"Why was this transaction flagged?"_ — explains risk factors
- _"Show high-risk accounts"_ — ranks accounts by max risk score
- _"Explain the risk score"_ — breaks down the 5-factor model
- _"Give me a summary"_ — overall platform statistics

### Risk Score Explanation Modal
Click any transaction row to open a modal with:
- Large animated risk score display
- 5 individual progress bars (one per risk dimension)
- Color-coded fraud reason analysis

---

## System Architecture

```
Live Transaction Stream (SSE)
        │
        ▼
┌─────────────────────┐
│  Fraud Detection    │  ← assess_transaction()
│  Engine             │     5-factor risk scoring
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  PostgreSQL         │  ← Transaction + RiskScore + FraudAlert
│  (Persistence)      │     committed per transaction
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────────────────────────────┐
│               Investigation Dashboard               │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │
│  │Transaction│ │ Network  │ │   Behavioral +     │  │
│  │ Monitor  │ │  Graph   │ │   Geo Risk Map     │  │
│  └──────────┘ └──────────┘ └────────────────────┘  │
│  ┌──────────────────────────────────────────────┐   │
│  │  Fraud Copilot │ Simulation Mode │ Alerts   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

##  Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | REST API + SSE streaming server |
| **PostgreSQL** | Persistent transaction and alert storage |
| **SQLAlchemy** | ORM for all database interactions |
| **Python 3.11** | Core backend language |
| **Faker** | Realistic synthetic data generation |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe component development |
| **Recharts** | Risk timeline and behavioral charts |
| **D3.js** | World map, force graph, arc rendering |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **Server-Sent Events** | Real-time transaction streaming |
| **REST APIs** | All data endpoints |

---

##  Project Structure

```
FINSHIELD/
│
├── backend/
│   ├── routers/
│   │   ├── transactions.py     # SSE stream + transaction CRUD
│   │   ├── alerts.py           # Fraud alert endpoints
│   │   ├── behavioral.py       # Account behavior analysis
│   │   ├── geo_risk.py         # Geographic risk endpoints
│   │   ├── network_graph.py    # Fraud network graph data
│   │   ├── scam_intel.py       # Scam intelligence tool
│   │   └── simulate.py         # Fraud simulation endpoints
│   ├── models.py               # SQLAlchemy ORM models
│   ├── database.py             # DB connection + session factory
│   ├── fraud_engine.py         # 5-factor risk scoring engine
│   ├── seed_data.py            # Database seeding script
│   └── main.py                 # FastAPI app + router registration
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx                # Transaction Monitor
│       │   ├── alerts/page.tsx         # Fraud Alerts
│       │   ├── network/page.tsx        # Fraud Network Graph
│       │   ├── behavioral/page.tsx     # Behavioral Analysis
│       │   ├── geo-risk/page.tsx       # Visual Fraud Map
│       │   └── scam-intel/page.tsx     # Scam Intel Tool
│       ├── components/
│       │   ├── RiskScoreModal.tsx      # Risk breakdown modal
│       │   ├── FraudAssistant.tsx      # Fraud Copilot drawer
│       │   └── SimulationPanel.tsx     # Simulation control panel
│       └── app/globals.css             # Global design system
│
├── docs/
│   └── images/                         # Dashboard screenshots
│
└── README.md
```

---

## Running Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### 1. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL
# Example: DATABASE_URL=postgresql://user:password@localhost:5432/finshield
```

### 2. Start the Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Seed the database with realistic transaction data
python seed_data.py

# Start the API server
uvicorn main:app --reload --port 8000
```

API docs available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard available at: [http://localhost:3000](http://localhost:3000)

---

## 🎮 Demo Scenarios

### 1. Trigger a Fraud Simulation
1. Open the Transaction Monitor at [http://localhost:3000](http://localhost:3000)
2. Click **⚡ Fraud Simulation Mode** to expand the panel
3. Click **Account Takeover** — a transaction with `risk_score=1.0` is injected into the live stream
4. Watch it appear in the table in real time with a 🔴 Suspicious badge

### 2. Investigate a Flagged Transaction
1. Click any row marked **⚠ Suspicious** in the transaction table
2. A modal opens showing the 5-factor risk breakdown with animated progress bars
3. The **Fraud Reason** explains exactly which signals triggered the flag

### 3. Ask the Fraud Copilot
1. Click **🤖 Fraud Copilot** in the top-right header
2. Try: _"Why was this transaction flagged?"_ or _"Show high risk accounts"_
3. The assistant analyzes live transaction data and responds with structured findings

### 4. Explore the Network Graph
1. Navigate to `/network`
2. Click any node to highlight all connected accounts
3. Look for clusters of red edges — these indicate potential fraud rings

### 5. View Transaction Flows on the Map
1. Navigate to `/geo-risk`
2. Use the filter to show **Suspicious Only** — red arcs show money moving between cities
3. Hover any arc for transaction details


<div align="center">
  <sub>Built with ❤️ as a portfolio project demonstrating real-world fintech fraud detection systems</sub>
</div>
