#!/bin/bash
# ExamPrep Deployment Script for Hostinger VPS
# Domain: zencodio.com
# Run this on your VPS after cloning the repo

set -e

echo "=========================================="
echo "  ExamPrep Deployment - zencodio.com"
echo "=========================================="

# 1. Update system
echo "[1/8] Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "[2/8] Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
else
    echo "[2/8] Docker already installed"
fi

# 3. Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "[3/8] Installing Docker Compose..."
    sudo apt install -y docker-compose-plugin
fi

# 4. Install Nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "[4/8] Installing Nginx..."
    sudo apt install -y nginx
else
    echo "[4/8] Nginx already installed"
fi

# 5. Install Certbot for SSL
if ! command -v certbot &> /dev/null; then
    echo "[5/8] Installing Certbot..."
    sudo apt install -y certbot python3-certbot-nginx
else
    echo "[5/8] Certbot already installed"
fi

# 6. Build frontend
echo "[6/8] Building frontend..."
cd web
npm install
VITE_API_URL=https://zencodio.com/api/v1 npm run build
sudo mkdir -p /var/www/examprep
sudo cp -r dist/* /var/www/examprep/
cd ..

# 7. Start backend with Docker
echo "[7/8] Starting backend services..."
cp backend/.env.production backend/.env
docker compose up -d db redis
sleep 5
docker compose up -d backend

# Run migrations
echo "Running database migrations..."
docker compose exec backend alembic upgrade head

# 8. Configure Nginx
echo "[8/8] Configuring Nginx..."
sudo cp nginx/examprep.conf /etc/nginx/sites-available/examprep
sudo ln -sf /etc/nginx/sites-available/examprep /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL Certificate
echo ""
echo "=========================================="
echo "  Getting SSL certificate..."
echo "=========================================="
sudo certbot --nginx -d zencodio.com -d www.zencodio.com --non-interactive --agree-tos --email admin@zencodio.com

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo "  URL: https://zencodio.com"
echo "  API: https://zencodio.com/api/v1"
echo "  Health: https://zencodio.com/health"
echo ""
echo "  Next steps:"
echo "  1. Update backend/.env.production with real passwords"
echo "  2. Seed the question pool: docker compose exec backend python seed_question_pool.py --quick"
echo "  3. Create admin user from the app"
echo "=========================================="
