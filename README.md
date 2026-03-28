# ExamPrep - AI-Powered Exam Preparation Platform

AI-powered competitive exam preparation platform for UPSC, JEE, SSC, Banking and more.

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy 2.0 + PostgreSQL + Redis
- **Web**: React + Vite + Tailwind CSS + React Router
- **Mobile**: Flutter + Riverpod (coming soon)
- **AI**: OpenAI API for question generation

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker & Docker Compose

### 1. Start Infrastructure

```bash
cd infra
docker-compose up -d postgres redis
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
pip install -r requirements/dev.txt
alembic upgrade head
python -m scripts.seed_data
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/api/docs

### 3. Web Setup

```bash
cd web
npm install
npm run dev
```

Web app: http://localhost:5173

### 4. Run Everything with Docker

```bash
cd infra
docker-compose up
```

## Project Structure

```
examprep/
├── backend/          # FastAPI API server
├── web/              # React + Vite web app
├── mobile/           # Flutter mobile app
├── infra/            # Docker, nginx configs
├── scripts/          # Seed data, utilities
└── ARCHITECTURE.md   # Full architecture doc
```

## Default Credentials

- **Admin**: admin@examprep.com / admin123456

## API Endpoints

- `POST /api/v1/auth/register` - Register
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/exams` - List exams
- `GET /api/v1/questions` - List questions
- `POST /api/v1/practice/sessions` - Start practice
- `POST /api/v1/practice/sessions/:id/answer` - Submit answer
- Full docs at `/api/docs`
