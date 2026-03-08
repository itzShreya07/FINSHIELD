#!/usr/bin/env bash
# FinShield — Start Frontend
set -e
cd "$(dirname "$0")/frontend"
echo "📦 Installing frontend dependencies..."
npm install
echo ""
echo "🚀 Starting FinShield Dashboard on http://localhost:3000"
npm run dev
