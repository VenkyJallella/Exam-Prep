#!/bin/bash
# ExamPrep Deployment Script for Hostinger VPS
# Domain: zencodio.com
# Uses existing PostgreSQL + Redis on VPS (no Docker needed)

set -e

echo "=========================================="
echo "  ExamPrep Deployment - zencodio.com"
echo "=========================================="

APP_DIR="/opt/Exam-Prep"
FRONTEND_DIR="/var/www/examprep"
DB_USER="examprep"
DB_PASS="ExamPrep2026Secure!"
DB_NAME="examprep"

cd "$APP_DIR"

# 1. Install system dependencies
echo "[1/10] Installing dependencies..."
sudo apt update -y
sudo apt install -y python3 python3-pip python3-venv nginx certbot python3-certbot-nginx redis-server default-jdk

# Verify Java installed (needed for coding practice)
echo "Java version: $(java -version 2>&1 | head -1)"
echo "Javac version: $(javac -version 2>&1)"

# 2. Start Redis if not running
echo "[2/10] Ensuring Redis is running..."
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 3. Setup PostgreSQL database
echo "[3/10] Setting up PostgreSQL database..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

# 4. Setup Python virtual environment
echo "[4/10] Setting up Python environment..."
cd "$APP_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements/base.txt

# 5. Create production .env
echo "[5/10] Creating production config..."
cat > "$APP_DIR/backend/.env" << EOF
APP_NAME=ExamPrep
APP_VERSION=1.0.0
DEBUG=false
ENVIRONMENT=production

DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASS}@127.0.0.1:5432/${DB_NAME}
REDIS_URL=redis://127.0.0.1:6379/0

SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

CORS_ORIGINS=["https://zencodio.com","https://www.zencodio.com"]

GEMINI_API_KEY=${GEMINI_API_KEY:-YOUR_KEY_HERE}
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MODEL_PRO=gemini-2.5-pro

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=${SMTP_USER:-}
SMTP_PASSWORD=${SMTP_PASSWORD:-}
SMTP_FROM_NAME=ExamPrep
SMTP_FROM_EMAIL=noreply@zencodio.com
SMTP_USE_TLS=true
EOF

# 6. Run database migrations
echo "[6/10] Running database migrations..."
PYTHONPATH=. alembic upgrade head

deactivate
cd "$APP_DIR"

# 7. Build frontend
echo "[7/10] Building frontend..."
cd "$APP_DIR/web"
npm install --legacy-peer-deps
VITE_API_URL=/api/v1 npx vite build
sudo mkdir -p "$FRONTEND_DIR"
sudo rm -rf "$FRONTEND_DIR"/*
sudo cp -r dist/* "$FRONTEND_DIR/"
cd "$APP_DIR"

# 8. Setup systemd service for backend
echo "[8/10] Setting up backend service..."
sudo tee /etc/systemd/system/examprep.service > /dev/null << EOF
[Unit]
Description=ExamPrep Backend API
After=network.target postgresql.service redis-server.service

[Service]
User=root
WorkingDirectory=$APP_DIR/backend
ExecStart=$APP_DIR/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8080 --workers 2
Restart=always
RestartSec=5
Environment=PYTHONPATH=$APP_DIR/backend

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable examprep
sudo systemctl restart examprep

echo "Waiting for backend to start..."
sleep 3
curl -s http://127.0.0.1:8080/health || echo "Backend not ready yet, check: sudo journalctl -u examprep -f"

# 9. Configure Nginx
echo "[9/10] Configuring Nginx..."
sudo tee /etc/nginx/sites-available/examprep > /dev/null << 'NGINX'
server {
    listen 80;
    server_name zencodio.com www.zencodio.com;

    # Frontend
    root /var/www/examprep;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080;
    }

    location /sitemap.xml {
        proxy_pass http://127.0.0.1:8080;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers (SEO + security scanners)
    server_tokens off;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
    client_max_body_size 10M;
}
NGINX

sudo ln -sf /etc/nginx/sites-available/examprep /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 10. SSL Certificate
echo "[10/10] Getting SSL certificate..."
sudo certbot --nginx -d zencodio.com -d www.zencodio.com --non-interactive --agree-tos --email admin@zencodio.com || echo "SSL setup failed — run manually: sudo certbot --nginx -d zencodio.com"

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "  Website:  https://zencodio.com"
echo "  API:      https://zencodio.com/api/v1"
echo "  Health:   https://zencodio.com/health"
echo ""
echo "  Backend service: sudo systemctl status examprep"
echo "  Backend logs:    sudo journalctl -u examprep -f"
echo "  Restart:         sudo systemctl restart examprep"
echo ""
echo "  IMPORTANT: Update Gemini API key:"
echo "  nano $APP_DIR/backend/.env"
echo "  Then: sudo systemctl restart examprep"
echo ""
echo "  Seed questions:"
echo "  cd $APP_DIR/backend && source venv/bin/activate"
echo "  python seed_question_pool.py --quick"
echo "=========================================="
