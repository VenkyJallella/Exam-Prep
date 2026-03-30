#!/bin/bash
# ExamPrep Quick Update Script
# Run this after pushing changes to GitHub

set -e

echo "=========================================="
echo "  ExamPrep Update - zencodio.com"
echo "=========================================="

APP_DIR="/opt/Exam-Prep"
cd "$APP_DIR"

# 1. Pull latest code
echo "[1/5] Pulling latest code..."
git stash 2>/dev/null || true
git pull origin main

# 2. Install any new Python deps
echo "[2/5] Updating Python dependencies..."
cd "$APP_DIR/backend"
source venv/bin/activate
pip install -q -r requirements/base.txt

# 3. Run migrations
echo "[3/5] Running database migrations..."
PYTHONPATH=. alembic upgrade head
deactivate

# 4. Rebuild frontend
echo "[4/5] Building frontend..."
cd "$APP_DIR/web"
npm install --legacy-peer-deps --silent
VITE_API_URL=/api/v1 npx vite build
sudo rm -rf /var/www/examprep/*
sudo cp -r dist/* /var/www/examprep/

# 5. Restart backend
echo "[5/5] Restarting backend..."
cd "$APP_DIR"
sudo systemctl restart examprep
sleep 3

# Verify
echo ""
echo "Checking health..."
curl -s http://127.0.0.1:8080/health && echo ""
echo ""
echo "=========================================="
echo "  Update Complete!"
echo "=========================================="
