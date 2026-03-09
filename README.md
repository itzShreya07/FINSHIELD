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

- **Money mule networks** — rapid high-volume transfers across accounts
- **Account takeovers** — login from a new device with unusual transaction patterns
- **Geo anomalies** — transactions originating from geographically impossible locations within seconds
- **Device spoofing** — transactions from unrecognized or newly registered devices

FinShield demonstrates how modern fraud platforms combine **streaming data ingestion**, **risk scoring engines**, **behavioral analytics**, **network graph analysis**, and **interactive investigation tooling** to help analysts respond faster and more accurately.

---

## Key Features

### Real-Time Transaction Monitoring
Live transaction feed powered by **Server-Sent Events (SSE)**. Each transaction is scored and persisted to PostgreSQL the moment it is generated — no data is lost between stream and database.

### Fraud Detection Engine
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
- **Risk Score Timeline** — a line chart showing risk score spikes over time, with a configurable alert threshold line at 70%

### Visual Fraud Map
D3.js world map (`geoNaturalEarth1` projection) plotting transaction flows as **curved arcs** between origin and destination cities:

- Red animated dashes — suspicious transactions  
- Green arcs — normal transactions  
- Hover tooltip shows full transaction details

### Fraud Simulation Mode
One-click attack injection for demo and testing:

| Simulation | Description |
|------------|-------------|
| Rapid Transfer Attack | 5 high-value transfers in rapid succession |
| Account Takeover | New device + geo mismatch + massive amount |
| Geo Anomaly Attack | Impossible travel: Mumbai → New York in minutes |

All simulated transactions are **persisted to PostgreSQL** and appear across all dashboards in real time.

### Fraud Investigation AI Assistant
A natural language copilot panel (rule-based, no LLM required) that answers analyst questions:

- "Why was this transaction flagged?" — explains risk factors
- "Show high-risk accounts" — ranks accounts by max risk score
- "Explain the risk score" — breaks down the 5-factor model
- "Give me a summary" — overall platform statistics

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

## Technology Stack

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

## Project Structure

```
FINSHIELD/
│
├── backend/
│   ├── routers/
│   │   ├── transactions.py
│   │   ├── alerts.py
│   │   ├── behavioral.py
│   │   ├── geo_risk.py
│   │   ├── network_graph.py
│   │   ├── scam_intel.py
│   │   └── simulate.py
│   ├── models.py
│   ├── database.py
│   ├── fraud_engine.py
│   ├── seed_data.py
│   └── main.py
│
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx
│       │   ├── alerts/page.tsx
│       │   ├── network/page.tsx
│       │   ├── behavioral/page.tsx
│       │   ├── geo-risk/page.tsx
│       │   └── scam-intel/page.tsx
│       ├── components/
│       │   ├── RiskScoreModal.tsx
│       │   ├── FraudAssistant.tsx
│       │   └── SimulationPanel.tsx
│       └── app/globals.css
│
├── docs/
│   └── images/
│
└── README.md
```

---

## Running Locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your database URL.

Example:

```
DATABASE_URL=postgresql://user:password@localhost:5432/finshield
```

### Start Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

python seed_data.py
uvicorn main:app --reload --port 8000
```

API docs:

```
http://localhost:8000/docs
```

### Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard:

```
http://localhost:3000
```

---

### Demo Scenarios

#### Trigger a Fraud Simulation

1. Open Transaction Monitor  
2. Click **Fraud Simulation Mode**  
3. Select **Account Takeover**  
4. A high-risk transaction will appear instantly

#### Investigate a Transaction

Click a suspicious row to open the **Risk Score Explanation Modal**.

#### Ask the Fraud Copilot

Open the assistant panel and ask:

- "Why was this transaction flagged?"
- "Show high risk accounts"

#### Explore the Network Graph

Navigate to `/network` and click nodes to reveal fraud rings.

#### View the Geo Risk Map

Navigate to `/geo-risk` to see transaction flows plotted across the world.

---

<div align="center">
  <sub>Built as a portfolio project demonstrating real-world fintech fraud detection systems</sub>
</div>