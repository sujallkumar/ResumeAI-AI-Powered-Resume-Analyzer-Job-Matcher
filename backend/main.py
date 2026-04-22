"""
ResumeAI — FastAPI Backend
Model: gemini-2.5-flash
"""

import os, json, uuid, re, math
from datetime import datetime, timedelta
from typing import Optional, List
from collections import Counter

import pdfplumber
import docx as python_docx
import google.generativeai as genai

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Integer, Text, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv

load_dotenv()

# ── Config ────────────────────────────────────────────────────────────────────
GEMINI_KEY   = os.getenv("GEMINI_API_KEY", "")
DB_URL       = os.getenv("DATABASE_URL", "postgresql://resumeai:resumeai@db:5432/resumeai")
SECRET_KEY   = os.getenv("SECRET_KEY", "change-me-in-prod-32chars-minimum!")
ALGORITHM    = "HS256"
TOKEN_EXPIRE = 60 * 24  # 24 hours

genai.configure(api_key=GEMINI_KEY)

# ── Database ──────────────────────────────────────────────────────────────────
engine       = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine)
Base         = declarative_base()


class UserDB(Base):
    __tablename__ = "users"
    id         = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email      = Column(String, unique=True, index=True, nullable=False)
    name       = Column(String, nullable=False)
    hashed_pw  = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    plan       = Column(String, default="free")


class AnalysisDB(Base):
    __tablename__ = "analyses"
    id            = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id       = Column(String, index=True)
    filename      = Column(String)
    target_role   = Column(String)
    overall_score = Column(Integer)
    ats_score     = Column(Integer)
    raw_json      = Column(Text)
    created_at    = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Auth ──────────────────────────────────────────────────────────────────────
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_pw(pw: str) -> str:
    return pwd_ctx.hash(pw)


def verify_pw(plain: str, hashed: str) -> bool:
    return pwd_ctx.verify(plain, hashed)


def create_token(data: dict) -> str:
    exp = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE)
    return jwt.encode({**data, "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)


async def current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Optional auth — returns None if no token provided (allows guest analysis)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(authorization.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM])
        user = db.query(UserDB).filter(UserDB.id == payload.get("sub")).first()
        return user
    except JWTError:
        return None


# ── Pydantic Models ───────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ChatRequest(BaseModel):
    message: str
    resume_context: Optional[str] = ""
    history: Optional[List[dict]] = []


class EnhanceRequest(BaseModel):
    resume_text: str
    target_role: str
    missing_keywords: Optional[List[str]] = []


class LearningRequest(BaseModel):
    skills: List[str]
    skill_gaps: List[str]
    target_role: str
    career_level: str
    experience_years: int


# ── Resume Text Extractor ─────────────────────────────────────────────────────
class ResumeParser:

    @staticmethod
    def extract_text_pdf(data: bytes) -> str:
        import io
        parts = []
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    parts.append(t)
        return "\n".join(parts)

    @staticmethod
    def extract_text_docx(data: bytes) -> str:
        import io
        doc = python_docx.Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    @staticmethod
    def extract_text_txt(data: bytes) -> str:
        return data.decode("utf-8", errors="replace")

    @classmethod
    def extract(cls, filename: str, data: bytes) -> str:
        fn = filename.lower()
        if fn.endswith(".pdf"):
            return cls.extract_text_pdf(data)
        elif fn.endswith(".docx"):
            return cls.extract_text_docx(data)
        return cls.extract_text_txt(data)


# ── Gemini NLP Layer ──────────────────────────────────────────────────────────
def _gemini_call(prompt: str, json_mode: bool = True, temperature: float = 0.1) -> str:
    """Single helper — always uses gemini-2.5-flash."""
    config = genai.types.GenerationConfig(
        temperature=temperature,
        max_output_tokens=8192,
        **({"response_mime_type": "application/json"} if json_mode else {}),
    )
    model = genai.GenerativeModel("gemini-2.5-flash", generation_config=config)
    resp  = model.generate_content(prompt)
    return resp.text


def _safe_json(raw: str) -> dict | list:
    cleaned = re.sub(r"```json|```", "", raw).strip()
    return json.loads(cleaned)


def parse_resume(text: str) -> dict:
    prompt = f"""Parse this resume. Return ONLY valid JSON matching this shape exactly:
{{
  "name": "string",
  "email": "string",
  "phone": "string",
  "location": "string",
  "title": "string",
  "summary": "3-sentence compelling professional summary you write",
  "totalYearsExp": 0,
  "skills": [],
  "softSkills": [],
  "experience": [
    {{"title": "", "company": "", "duration": "", "highlights": [], "impact": ""}}
  ],
  "education": [
    {{"degree": "", "institution": "", "year": "", "gpa": ""}}
  ],
  "certifications": [],
  "languages": [],
  "topDomains": [],
  "githubProfile": "",
  "linkedinProfile": ""
}}

Resume text (first 4000 chars):
{text[:4000]}"""
    try:
        return _safe_json(_gemini_call(prompt))
    except Exception:
        return {
            "name": "Candidate", "email": "", "phone": "", "location": "",
            "title": "Professional", "summary": "",
            "totalYearsExp": 0, "skills": [], "softSkills": [],
            "experience": [], "education": [], "certifications": [],
            "languages": [], "topDomains": [], "githubProfile": "", "linkedinProfile": ""
        }


def score_resume(text: str, parsed: dict, target_role: str) -> dict:
    skills_str = ", ".join((parsed.get("skills") or [])[:20])
    prompt = f"""Score this resume for the role "{target_role}". Return ONLY valid JSON:
{{
  "overallScore": 0,
  "atsScore": 0,
  "skillScore": 0,
  "experienceScore": 0,
  "formattingScore": 0,
  "impactScore": 0,
  "strengths": ["s1", "s2", "s3"],
  "improvements": [
    {{"issue": "", "fix": "", "priority": "high|medium|low", "category": "Skills|Formatting|Content|Keywords"}}
  ],
  "atsKeywords": [],
  "missingKeywords": [],
  "industryBenchmark": 0,
  "hiringManagerNote": "",
  "passATS": true
}}

Resume (2500 chars): {text[:2500]}
Detected skills: {skills_str}
Target role: {target_role}"""
    try:
        return _safe_json(_gemini_call(prompt))
    except Exception:
        return {
            "overallScore": 65, "atsScore": 60, "skillScore": 70,
            "experienceScore": 65, "formattingScore": 75, "impactScore": 55,
            "strengths": ["Solid technical background", "Clear work history", "Relevant experience"],
            "improvements": [
                {"issue": "Missing quantified achievements", "fix": "Add metrics to each bullet point", "priority": "high", "category": "Content"},
                {"issue": "Summary needs tailoring", "fix": "Rewrite summary for target role", "priority": "medium", "category": "Content"},
            ],
            "atsKeywords": parsed.get("skills", [])[:8],
            "missingKeywords": [],
            "industryBenchmark": 70,
            "hiringManagerNote": "Candidate shows potential but resume needs stronger impact statements.",
            "passATS": True,
        }


def generate_tips(skills: list, score: int, target: str, missing: list) -> list:
    prompt = f"""Generate exactly 5 specific, actionable resume improvement tips as a JSON array of strings.
Target role: {target}
Score: {score}/100
Current skills: {', '.join(skills[:10])}
Missing keywords: {', '.join(missing[:8])}
Return ONLY: ["tip1","tip2","tip3","tip4","tip5"]"""
    try:
        result = _safe_json(_gemini_call(prompt))
        return result if isinstance(result, list) else []
    except Exception:
        return [
            "Quantify every achievement with specific numbers and percentages",
            f"Add missing keywords ({', '.join(missing[:3]) or 'industry terms'}) naturally in experience bullets",
            "Start each bullet point with a strong action verb like 'Built', 'Led', 'Reduced'",
            "Add a concise Technical Skills section near the top for ATS scanning",
            f"Tailor your professional summary specifically to the {target} role requirements",
        ]


def compute_analytics(parsed: dict, scores: dict, top_match: dict) -> dict:
    prompt = f"""Analyze this candidate profile and return career analytics as ONLY valid JSON:
{{
  "careerLevel": "Junior|Mid|Senior|Lead|Executive",
  "careerTrajectory": "Ascending|Stable|Pivoting",
  "salaryRange": {{"min": 0, "max": 0, "currency": "USD"}},
  "topMatchedDomains": [{{"domain": "", "fitScore": 0}}],
  "competitiveAdvantages": ["a1", "a2", "a3"],
  "skillGaps": [{{"skill": "", "importance": "Critical|High|Medium", "hoursToLearn": 0}}],
  "marketDemandScore": 0,
  "timeToHire": "2-4 weeks",
  "interviewReadiness": 0
}}

Experience years: {parsed.get("totalYearsExp", 0)}
Skills: {', '.join((parsed.get("skills") or [])[:15])}
Top job match: {top_match.get("title", "")} at {top_match.get("company", "")} ({top_match.get("matchScore", 0)}%)
Overall score: {scores.get("overallScore", 65)}"""
    try:
        return _safe_json(_gemini_call(prompt))
    except Exception:
        return {
            "careerLevel": "Mid", "careerTrajectory": "Ascending",
            "salaryRange": {"min": 80000, "max": 120000, "currency": "USD"},
            "topMatchedDomains": [{"domain": "Software Engineering", "fitScore": 75}],
            "competitiveAdvantages": ["Strong technical skills", "Relevant experience"],
            "skillGaps": [{"skill": "Cloud (AWS/GCP)", "importance": "High", "hoursToLearn": 40}],
            "marketDemandScore": 72, "timeToHire": "1-2 months", "interviewReadiness": 65,
        }


def ai_chat(message: str, context: str, history: list) -> str:
    hist_str = "\n".join(
        [f"{m['role'].upper()}: {m.get('content', m.get('text', ''))}" for m in history[-6:]]
    )
    prompt = f"""You are ResumeAI, an expert career coach. Give concise, specific, actionable advice in 2-4 sentences.

Resume context: {context or 'No resume context provided yet.'}
{f"Recent chat:{chr(10)}{hist_str}" if hist_str else ""}

User: {message}"""
    try:
        return _gemini_call(prompt, json_mode=False, temperature=0.7)
    except Exception:
        return "I'm having trouble connecting right now. Please check your API key configuration."


def enhance_resume(resume_text: str, target_role: str, missing_keywords: list) -> str:
    prompt = f"""Rewrite and enhance this resume for the role "{target_role}".
Apply these improvements:
- Replace weak phrases with strong action verbs (Built, Led, Reduced, Increased, Designed, etc.)
- Add quantified impact to each experience bullet (e.g. "improved performance by 40%")
- Naturally incorporate these missing keywords: {', '.join(missing_keywords[:8])}
- Write a compelling 3-sentence professional summary targeted to {target_role}
- Ensure clean, ATS-friendly formatting

Return the complete enhanced resume as clean plain text only. No markdown, no JSON.

Original resume:
{resume_text[:3500]}"""
    try:
        return _gemini_call(prompt, json_mode=False, temperature=0.4)
    except Exception:
        return "Unable to enhance resume. Please try again."


def generate_learning_plan(skills: list, gaps: list, target: str, level: str, years: int) -> dict:
    prompt = f"""Create a detailed 90-day personalized learning plan. Return ONLY valid JSON:
{{
  "goal": "string",
  "totalHours": 0,
  "weeks": [
    {{
      "week": "Week 1-2",
      "focus": "topic",
      "resources": [
        {{"name": "", "url": "", "type": "Course|Book|Practice|Video", "hours": 0}}
      ],
      "milestone": "what you can do after this"
    }}
  ],
  "projects": [
    {{"title": "", "description": "", "skills": [], "estimatedDays": 0}}
  ],
  "communities": ["community1"],
  "certifications": [
    {{"name": "", "provider": "", "priority": "High|Medium", "estimatedWeeks": 0}}
  ]
}}

Target role: {target}
Career level: {level}
Years of experience: {years}
Current skills: {', '.join(skills[:12])}
Skill gaps to fill: {', '.join(gaps[:8])}"""
    try:
        return _safe_json(_gemini_call(prompt))
    except Exception:
        return {
            "goal": f"Land a {target} role within 90 days",
            "totalHours": 120,
            "weeks": [{"week": "Week 1-2", "focus": "Core Skills Review", "resources": [], "milestone": "Refreshed fundamentals"}],
            "projects": [{"title": "Portfolio Project", "description": "Build a project showcasing your skills", "skills": skills[:3], "estimatedDays": 14}],
            "communities": ["Dev.to", "Reddit r/cscareerquestions", "LinkedIn Groups"],
            "certifications": [],
        }


# ── ML Job Matcher ────────────────────────────────────────────────────────────
JOB_DATABASE = [
    {"id": 1,  "title": "Senior Frontend Engineer",   "company": "Stripe",      "domain": "Frontend",  "salary": "$140–180k", "location": "Remote",            "experience": 5, "type": "Full-time", "color": "#635BFF", "logo": "S",
     "skills": ["React", "TypeScript", "GraphQL", "CSS", "JavaScript", "Performance", "Accessibility", "Jest"],
     "description": "Build world-class payment UIs using React and TypeScript. Own front-end architecture, mentor junior devs, and ship features used by millions."},
    {"id": 2,  "title": "Full Stack Developer",        "company": "Notion",      "domain": "Full Stack","salary": "$130–160k", "location": "San Francisco, CA", "experience": 3, "type": "Full-time", "color": "#1a1a1a", "logo": "N",
     "skills": ["Node.js", "React", "PostgreSQL", "TypeScript", "Redis", "Docker", "WebSockets", "REST API"],
     "description": "Work across the stack building collaborative tools. Real-time features using WebSockets, distributed systems experience a plus."},
    {"id": 3,  "title": "ML Engineer",                 "company": "Anthropic",   "domain": "ML/AI",     "salary": "$160–220k", "location": "Remote",            "experience": 4, "type": "Full-time", "color": "#D97757", "logo": "A",
     "skills": ["Python", "PyTorch", "NLP", "Transformers", "RLHF", "CUDA", "Distributed Training", "MLOps"],
     "description": "Research and deploy large language models. Build scalable ML pipelines, fine-tune transformer architectures."},
    {"id": 4,  "title": "Backend Engineer – Python",   "company": "Airbnb",      "domain": "Backend",   "salary": "$135–165k", "location": "Remote",            "experience": 4, "type": "Full-time", "color": "#FF5A5F", "logo": "A",
     "skills": ["Python", "FastAPI", "PostgreSQL", "Kafka", "Docker", "Kubernetes", "Microservices", "gRPC"],
     "description": "Build and scale backend services. High-throughput systems and expert API design required."},
    {"id": 5,  "title": "Data Scientist",              "company": "Netflix",     "domain": "Data",      "salary": "$145–190k", "location": "Los Gatos, CA",     "experience": 3, "type": "Full-time", "color": "#E50914", "logo": "N",
     "skills": ["Python", "SQL", "Statistics", "A/B Testing", "Scikit-learn", "Spark", "Tableau", "Pandas"],
     "description": "Drive data-driven decisions for Netflix's recommendation engine. Build and deploy predictive models at scale."},
    {"id": 6,  "title": "DevOps / Platform Engineer",  "company": "HashiCorp",   "domain": "DevOps",    "salary": "$130–170k", "location": "Remote",            "experience": 4, "type": "Full-time", "color": "#1563FF", "logo": "H",
     "skills": ["Kubernetes", "Terraform", "AWS", "GCP", "CI/CD", "Linux", "Prometheus", "Ansible"],
     "description": "Design and maintain cloud infrastructure. Drive SRE practices and incident response."},
    {"id": 7,  "title": "iOS Developer",               "company": "Spotify",     "domain": "Mobile",    "salary": "$125–165k", "location": "New York, NY",      "experience": 4, "type": "Full-time", "color": "#1DB954", "logo": "S",
     "skills": ["Swift", "SwiftUI", "Xcode", "CoreData", "AVFoundation", "UIKit", "Combine", "REST API"],
     "description": "Build the Spotify iOS app used by 600M+ users. Own key features from design to delivery."},
    {"id": 8,  "title": "Cloud Solutions Architect",   "company": "Microsoft",   "domain": "Cloud",     "salary": "$150–200k", "location": "Remote",            "experience": 6, "type": "Full-time", "color": "#0078D4", "logo": "M",
     "skills": ["Azure", "AWS", "Kubernetes", "Serverless", "Security", "Microservices", "Terraform", "Cost Optimization"],
     "description": "Design enterprise-grade cloud solutions on Azure. Lead client workshops and architecture reviews."},
    {"id": 9,  "title": "Data Engineer",               "company": "Databricks",  "domain": "Data",      "salary": "$140–175k", "location": "San Francisco, CA", "experience": 4, "type": "Full-time", "color": "#FF3621", "logo": "D",
     "skills": ["Apache Spark", "Python", "SQL", "Delta Lake", "Kafka", "Airflow", "dbt", "Scala"],
     "description": "Build and maintain large-scale data pipelines. Design schemas and optimize ETL workflows."},
    {"id": 10, "title": "Security Engineer",           "company": "CrowdStrike", "domain": "Security",  "salary": "$145–185k", "location": "Remote",            "experience": 5, "type": "Full-time", "color": "#E80000", "logo": "C",
     "skills": ["Penetration Testing", "SIEM", "Zero Trust", "Python", "Incident Response", "SOC 2", "AWS Security", "Threat Modeling"],
     "description": "Protect critical infrastructure. Lead security audits and build detection tooling."},
    {"id": 11, "title": "React Native Developer",      "company": "Duolingo",    "domain": "Mobile",    "salary": "$120–150k", "location": "Pittsburgh, PA",    "experience": 3, "type": "Full-time", "color": "#58CC02", "logo": "D",
     "skills": ["React Native", "React", "TypeScript", "Redux", "Animations", "iOS", "Android", "Expo"],
     "description": "Build delightful mobile experiences for 40M+ learners. Strong animations and state management required."},
    {"id": 12, "title": "AI Research Scientist",       "company": "DeepMind",    "domain": "ML/AI",     "salary": "£120–180k", "location": "London, UK",        "experience": 5, "type": "Full-time", "color": "#4285F4", "logo": "G",
     "skills": ["Python", "PyTorch", "JAX", "Reinforcement Learning", "Research", "Mathematics", "Statistics", "Publications"],
     "description": "Advance the state of the art in AI. Publish research and translate into real-world applications."},
    {"id": 13, "title": "Backend Engineer – Go",       "company": "Uber",        "domain": "Backend",   "salary": "$140–175k", "location": "San Francisco, CA", "experience": 4, "type": "Full-time", "color": "#000000", "logo": "U",
     "skills": ["Go", "gRPC", "PostgreSQL", "Redis", "Kafka", "Docker", "Kubernetes", "Distributed Systems"],
     "description": "Power Uber's core dispatch and matching services. Handle billions of events per day."},
    {"id": 14, "title": "Engineering Manager",         "company": "Shopify",     "domain": "Leadership","salary": "$160–210k", "location": "Remote",            "experience": 7, "type": "Full-time", "color": "#96BF48", "logo": "S",
     "skills": ["Leadership", "System Design", "React", "Node.js", "Agile", "OKRs", "Hiring", "Technical Strategy"],
     "description": "Lead a team of 6–10 engineers building commerce infrastructure. Technical background required."},
    {"id": 15, "title": "Android Developer",           "company": "Google",      "domain": "Mobile",    "salary": "$150–200k", "location": "Mountain View, CA", "experience": 4, "type": "Full-time", "color": "#34A853", "logo": "G",
     "skills": ["Kotlin", "Jetpack Compose", "Android SDK", "Coroutines", "Room", "MVVM", "Material Design", "Testing"],
     "description": "Build Google apps used by billions. Own the full Android development lifecycle."},
    {"id": 16, "title": "Frontend Engineer – Design",  "company": "Figma",       "domain": "Frontend",  "salary": "$145–185k", "location": "San Francisco, CA", "experience": 4, "type": "Full-time", "color": "#F24E1E", "logo": "F",
     "skills": ["React", "TypeScript", "CSS", "Design Tokens", "Storybook", "Accessibility", "Animation", "Web Components"],
     "description": "Build and evolve Figma's design system used by millions of designers worldwide."},
    {"id": 17, "title": "MLOps Engineer",              "company": "W&B",         "domain": "ML/AI",     "salary": "$130–165k", "location": "Remote",            "experience": 3, "type": "Full-time", "color": "#FFBE00", "logo": "W",
     "skills": ["Python", "MLflow", "Kubernetes", "Docker", "CI/CD", "Model Serving", "Feature Stores", "Ray"],
     "description": "Build the infrastructure that powers ML experimentation and deployment at scale."},
    {"id": 18, "title": "Blockchain Developer",        "company": "Coinbase",    "domain": "Web3",      "salary": "$145–195k", "location": "Remote",            "experience": 4, "type": "Full-time", "color": "#0052FF", "logo": "C",
     "skills": ["Solidity", "Ethereum", "TypeScript", "Web3.js", "Smart Contracts", "DeFi", "Security", "React"],
     "description": "Build and audit smart contracts powering the Coinbase platform."},
    {"id": 19, "title": "Site Reliability Engineer",   "company": "GitHub",      "domain": "DevOps",    "salary": "$140–175k", "location": "Remote",            "experience": 4, "type": "Full-time", "color": "#24292e", "logo": "G",
     "skills": ["Linux", "Go", "Kubernetes", "Prometheus", "Grafana", "On-call", "Incident Management", "PostgreSQL"],
     "description": "Maintain 99.99% uptime for 100M+ developers. Build observability and automation tooling."},
    {"id": 20, "title": "Product Engineer",            "company": "Linear",      "domain": "Full Stack","salary": "$140–180k", "location": "Remote",            "experience": 4, "type": "Full-time", "color": "#5E6AD2", "logo": "L",
     "skills": ["React", "TypeScript", "Node.js", "PostgreSQL", "GraphQL", "Performance", "Product Thinking", "Design Systems"],
     "description": "Work on product and engineering simultaneously. Strong product intuition and high code quality required."},
]


class JobMatcher:
    def __init__(self):
        corpus = [
            j["title"] + " " + j["description"] + " " + " ".join(j["skills"])
            for j in JOB_DATABASE
        ]
        self.vectorizer  = TfidfVectorizer(ngram_range=(1, 2), max_features=5000, stop_words="english")
        self.job_matrix  = self.vectorizer.fit_transform(corpus)
        self.jobs        = JOB_DATABASE

    def match(self, resume_text: str, skills: list) -> list:
        enriched   = resume_text + " " + " ".join(skills)
        resume_vec = self.vectorizer.transform([enriched])
        sims       = cosine_similarity(resume_vec, self.job_matrix)[0]
        skills_low = [s.lower() for s in skills]
        results    = []

        for i, job in enumerate(self.jobs):
            sim   = float(sims[i])
            matched = [
                s for s in job["skills"]
                if any(s.lower() in r or r in s.lower().replace(" ", "") for r in skills_low)
            ]
            skill_ratio = len(matched) / max(len(job["skills"]), 1)
            combined    = sim * 0.45 + skill_ratio * 0.55
            score       = max(5, min(97, round(combined * 100)))
            results.append({
                **job,
                "matchScore":   score,
                "matched":      matched,
                "missing":      [s for s in job["skills"] if s not in matched],
            })

        return sorted(results, key=lambda x: x["matchScore"], reverse=True)


matcher = JobMatcher()

# ── FastAPI App ───────────────────────────────────────────────────────────────
app = FastAPI(title="ResumeAI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth Endpoints ────────────────────────────────────────────────────────────
@app.post("/auth/register", tags=["Auth"])
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(UserDB).filter(UserDB.email == req.email).first():
        raise HTTPException(400, "Email already registered")
    user = UserDB(email=req.email, name=req.name, hashed_pw=hash_pw(req.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token({"sub": user.id}), "user": {"id": user.id, "name": user.name, "email": user.email}}


@app.post("/auth/login", tags=["Auth"])
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == req.email).first()
    if not user or not verify_pw(req.password, user.hashed_pw):
        raise HTTPException(401, "Invalid credentials")
    return {"token": create_token({"sub": user.id}), "user": {"id": user.id, "name": user.name, "email": user.email}}


# ── Core Analysis ─────────────────────────────────────────────────────────────
@app.post("/api/analyze", tags=["Analysis"])
async def analyze_resume(
    file: UploadFile = File(...),
    target_role: str = "Software Engineer",
    db: Session = Depends(get_db),
    user=Depends(current_user),
):
    fn = file.filename.lower()
    if not (fn.endswith(".pdf") or fn.endswith(".docx") or fn.endswith(".txt")):
        raise HTTPException(400, "Only PDF, DOCX, and TXT files supported")

    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10 MB)")

    resume_text = ResumeParser.extract(file.filename, data)
    if len(resume_text.strip()) < 50:
        raise HTTPException(400, "Could not extract text — please use a text-based PDF or DOCX")

    # Run full pipeline
    parsed      = parse_resume(resume_text)
    scores      = score_resume(resume_text, parsed, target_role)
    job_matches = matcher.match(resume_text, parsed.get("skills") or [])
    tips        = generate_tips(
        parsed.get("skills") or [], scores.get("overallScore", 65),
        target_role, scores.get("missingKeywords") or []
    )
    analytics   = compute_analytics(parsed, scores, job_matches[0] if job_matches else {})

    result = {
        "parsed":     parsed,
        "scores":     scores,
        "jobMatches": job_matches[:15],
        "tips":       tips,
        "analytics":  analytics,
    }

    # Persist if user is logged in
    if user:
        record = AnalysisDB(
            user_id=user.id, filename=file.filename, target_role=target_role,
            overall_score=scores.get("overallScore", 0),
            ats_score=scores.get("atsScore", 0),
            raw_json=json.dumps(result),
        )
        db.add(record)
        db.commit()
        result["analysisId"] = record.id

    return result


# ── AI Features ───────────────────────────────────────────────────────────────
@app.post("/api/chat", tags=["AI Features"])
async def chat_endpoint(req: ChatRequest):
    if not GEMINI_KEY:
        raise HTTPException(500, "GEMINI_API_KEY not configured")
    reply = ai_chat(req.message, req.resume_context, req.history)
    return {"reply": reply}


@app.post("/api/enhance", tags=["AI Features"])
async def enhance_endpoint(req: EnhanceRequest):
    if not GEMINI_KEY:
        raise HTTPException(500, "GEMINI_API_KEY not configured")
    enhanced = enhance_resume(req.resume_text, req.target_role, req.missing_keywords)
    return {"enhanced": enhanced}


@app.post("/api/learning-plan", tags=["AI Features"])
async def learning_plan_endpoint(req: LearningRequest):
    if not GEMINI_KEY:
        raise HTTPException(500, "GEMINI_API_KEY not configured")
    plan = generate_learning_plan(
        req.skills, req.skill_gaps, req.target_role, req.career_level, req.experience_years
    )
    return {"plan": plan}


# ── Job Matching ──────────────────────────────────────────────────────────────
@app.get("/api/jobs/match", tags=["Jobs"])
async def match_jobs(skills: str = "", domain: str = "All", min_score: int = 0):
    skills_list = [s.strip() for s in skills.split(",") if s.strip()]
    jobs        = matcher.match("", skills_list)
    if domain != "All":
        jobs = [j for j in jobs if j["domain"] == domain]
    return {"jobs": [j for j in jobs if j["matchScore"] >= min_score]}


# ── History ───────────────────────────────────────────────────────────────────
@app.get("/api/analyses", tags=["History"])
async def get_analyses(user=Depends(current_user), db: Session = Depends(get_db)):
    if not user:
        raise HTTPException(401, "Not authenticated")
    rows = (
        db.query(AnalysisDB)
        .filter(AnalysisDB.user_id == user.id)
        .order_by(AnalysisDB.created_at.desc())
        .limit(20)
        .all()
    )
    return {"analyses": [
        {"id": r.id, "filename": r.filename, "targetRole": r.target_role,
         "overallScore": r.overall_score, "atsScore": r.ats_score,
         "createdAt": r.created_at.isoformat()}
        for r in rows
    ]}


@app.get("/api/analyses/{analysis_id}", tags=["History"])
async def get_analysis(analysis_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    if not user:
        raise HTTPException(401, "Not authenticated")
    row = db.query(AnalysisDB).filter(
        AnalysisDB.id == analysis_id, AnalysisDB.user_id == user.id
    ).first()
    if not row:
        raise HTTPException(404, "Analysis not found")
    return json.loads(row.raw_json)


@app.get("/api/stats", tags=["Analytics"])
async def get_stats(user=Depends(current_user), db: Session = Depends(get_db)):
    if not user:
        raise HTTPException(401, "Not authenticated")
    rows   = db.query(AnalysisDB).filter(AnalysisDB.user_id == user.id).all()
    scores = [r.overall_score for r in rows if r.overall_score]
    return {
        "totalAnalyses": len(rows),
        "avgOverallScore": round(sum(scores) / len(scores)) if scores else 0,
        "bestScore": max(scores) if scores else 0,
    }


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "model": "gemini-2.5-flash", "version": "2.0.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)