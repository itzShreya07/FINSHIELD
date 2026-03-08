#!/usr/bin/env bash
# FinShield — Start Backend
set -e
cd "$(dirname "$0")/backend"

# Create and activate virtual env if not present
if [ ! -d ".venv" ]; then
  echo "🔧 Creating virtual environment..."
  python3 -m venv .venv
fi
source .venv/bin/activate

echo "📦 Installing backend dependencies..."
pip install -r requirements.txt -q

# Copy .env if not present
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "⚙️  Created .env — edit DATABASE_URL if needed"
fi

echo ""
echo "🌱 Seeding database (running seed_data.py)..."
python seed_data.py || echo "⚠️  Seed failed — PostgreSQL may not be running, or DB already seeded."

echo ""
echo "🚀 Starting FinShield API on http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo ""
uvicorn main:app --reload --port 8000
