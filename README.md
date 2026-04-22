# ResumeAI — AI-Powered Resume Analyzer & Job Matcher

> **Gemini 2.5 Flash · FastAPI · React · PostgreSQL · Docker**

A full-stack AI career platform that analyzes your resume, scores it against ATS systems, semantically matches you to 20 real job roles, and provides a personal AI coach — all in seconds.

---

## Features

| Feature | Description |
|---|---|
| 🧠 **NLP Resume Parsing** | Extracts 15+ fields — skills, experience, education, certifications, soft skills |
| 📊 **ATS Scoring Engine** | 6-dimension analysis: Overall, ATS, Skills, Experience, Formatting, Impact |
| 🔍 **Semantic Job Matching** | TF-IDF + cosine similarity against 20 real companies (Stripe, Netflix, Google, Anthropic...) |
| 🤖 **AI Career Chatbot** | Real-time coaching with full resume context via Gemini 2.5 Flash |
| ✨ **Resume Auto-Enhancer** | Rewrites your resume with action verbs, quantified achievements, and ATS keywords |
| 🎓 **90-Day Learning Plan** | Personalized roadmap with courses, projects, and certifications to close skill gaps |
| 📈 **Analytics Dashboard** | Salary range, career level, market demand score, domain fit scores |
| 👔 **Hiring Manager Note** | AI-generated perspective from a recruiter's POV |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    nginx :80                        │
│           (reverse proxy + static serve)            │
└──────────────┬──────────────────┬───────────────────┘
               │                  │
     ┌─────────▼──────┐  ┌───────▼────────┐
     │  React :3000   │  │  FastAPI :8000 │
     │  (frontend)    │  │  (backend)     │
     └────────────────┘  └───────┬────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Gemini 2.5 Flash API  │
                    │   (NLP + Scoring + Chat)│
                    └─────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   PostgreSQL :5432       │
                    │   (users + analyses)     │
                    └─────────────────────────┘
```

---

## Project Structure

```
resumeai/
├── .env                        # API keys (never commit this!)
├── .gitignore
├── docker-compose.yml          # Orchestrates all services
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── requirements.txt
│   └── main.py                 # FastAPI app — all endpoints + ML pipeline
│
├── frontend/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       └── App.jsx             # Full React UI — all tabs + chatbot
│
└── nginx/
    └── default.conf            # Reverse proxy config
```

---

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- A Gemini API key — get one free at [aistudio.google.com](https://aistudio.google.com)

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/resumeai.git
cd resumeai
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Then open `.env` and fill in your keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=any_random_32_character_string_here
```

### 3. Start everything
```bash
docker-compose up --build
```

### 4. Open the app
| Service | URL |
|---|---|
| App (via nginx) | http://localhost |
| Frontend direct | http://localhost:3000 |
| Backend API docs | http://localhost:8000/docs |
| Backend health | http://localhost:8000/health |

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Register a new user | — |
| `POST` | `/auth/login` | Login, returns JWT | — |
| `POST` | `/api/analyze` | Upload + full resume analysis | Optional |
| `POST` | `/api/chat` | AI chatbot message | — |
| `POST` | `/api/enhance` | Resume auto-enhancer | — |
| `POST` | `/api/learning-plan` | Generate 90-day plan | — |
| `GET` | `/api/jobs/match` | Match jobs by skills | — |
| `GET` | `/api/analyses` | User's past analyses | ✅ |
| `GET` | `/api/analyses/{id}` | Specific analysis | ✅ |
| `GET` | `/api/stats` | User analytics summary | ✅ |
| `GET` | `/health` | Health check | — |

> Full interactive docs available at `http://localhost:8000/docs` (Swagger UI)

---

## Tech Stack

**Frontend**
- React 18 + custom inline design system
- Gemini 2.5 Flash (via backend API)
- No CSS framework — pure inline styles for zero dependency issues

**Backend**
- FastAPI (Python 3.11)
- Gemini 2.5 Flash — NLP parsing, ATS scoring, chatbot, enhancement, learning plans
- scikit-learn — TF-IDF vectorizer + cosine similarity for job matching
- pdfplumber + python-docx — resume text extraction
- SQLAlchemy + PostgreSQL — user data and analysis history
- JWT auth via python-jose

**Infrastructure**
- Docker + Docker Compose
- PostgreSQL 16
- Nginx (reverse proxy)

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `SECRET_KEY` | ✅ | JWT signing secret (any random string, 32+ chars) |
| `DATABASE_URL` | Auto-set | Set automatically by docker-compose |

---

## Local Development (without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
# Set env vars manually or create a .env file
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8000 npm start
```

---

## Screenshots

> Upload screenshots of your app here after running it!
> `![Landing Page](screenshots/landing.png)`

---

## 🗺️ Roadmap

- [ ] User authentication UI (login/register screens)
- [ ] Analysis history dashboard
- [ ] Resume comparison (before vs after enhance)
- [ ] LinkedIn profile import
- [ ] Email job alerts
- [ ] Production deployment guide (Railway / Render / AWS)

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

- [Google Gemini API](https://ai.google.dev/) — powering all AI features
- [FastAPI](https://fastapi.tiangolo.com/) — the backend framework
- [scikit-learn](https://scikit-learn.org/) — ML job matching

---

<p align="center">Built with ⚡ and a lot of ☕</p>
