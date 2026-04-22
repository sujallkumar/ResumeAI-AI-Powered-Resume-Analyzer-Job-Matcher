import { useState, useRef, useEffect, useCallback } from "react";

// ─── API Layer ────────────────────────────────────────────────────────────────
const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:     "#050C15",
  card:   "#0A1628",
  border: "#122040",
  accent: "#00E5BE",
  acc2:   "#00A896",
  text:   "#E2EBF5",
  muted:  "#4A6080",
  warn:   "#F5A623",
  danger: "#FF4D6D",
  info:   "#4A9EFF",
  purple: "#a78bfa",
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function Pill({ children, color = C.accent, style = {} }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 11px",
      borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}30`,
      letterSpacing: 0.3, ...style,
    }}>
      {children}
    </span>
  );
}

function Card({ children, style = {}, onClick, hover = false }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: C.card, border: `1px solid ${hov ? "#1E3A5F" : C.border}`,
        borderRadius: 16, transition: "all .2s",
        cursor: onClick ? "pointer" : "default",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? `0 8px 32px ${C.accent}0E` : "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Spinner({ size = 20 }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`,
      borderRadius: "50%", animation: "spin .8s linear infinite",
    }} />
  );
}

function AnimatedBar({ value, color = C.accent, delay = 0 }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(value), delay + 100);
    return () => clearTimeout(t);
  }, [value, delay]);
  return (
    <div style={{ background: "#0D1E35", borderRadius: 8, height: 8, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${w}%`,
        background: `linear-gradient(90deg,${color},${color}AA)`,
        borderRadius: 8, transition: "width 1.2s cubic-bezier(.4,0,.2,1)",
        boxShadow: `0 0 8px ${color}60`,
      }} />
    </div>
  );
}

function ScoreArc({ score, size = 110 }) {
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setDisp(score), 200);
    return () => clearTimeout(t);
  }, [score]);
  const r      = (size - 18) / 2;
  const circ   = 2 * Math.PI * r;
  const color  = disp >= 75 ? C.accent : disp >= 50 ? C.warn : C.danger;
  const offset = circ - (disp / 100) * circ * 0.75;
  return (
    <div style={{ position: "relative", width: size, height: size * 0.78, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-225deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#0D1E35" strokeWidth={10}
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 6px ${color}80)` }} />
      </svg>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <div style={{ fontSize: size * 0.2, fontWeight: 900, color, lineHeight: 1, fontFamily: "'Syne',sans-serif" }}>{disp}</div>
        <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>/ 100</div>
      </div>
    </div>
  );
}

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: ${C.bg}; color: ${C.text}; font-family: 'DM Sans', sans-serif; }
@keyframes spin      { to { transform: rotate(360deg); } }
@keyframes fadeUp    { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes float     { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes blink     { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes pulse     { 0%,100% { box-shadow: 0 0 0 0 rgba(0,229,190,.35); } 70% { box-shadow: 0 0 0 10px rgba(0,229,190,0); } }
@keyframes chatIn    { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: ${C.card}; }
::-webkit-scrollbar-thumb { background: #1E3A5F; border-radius: 3px; }
input::placeholder, textarea::placeholder { color: #2A4060; }
input, textarea, select { font-family: 'DM Sans', sans-serif; }
.nav-btn:hover { color: ${C.accent} !important; background: rgba(0,229,190,.06) !important; }
.tab-btn:hover { color: ${C.accent} !important; }
`;

// ══════════════════════════════════════════════════════════════════════════════
//  LANDING PAGE
// ══════════════════════════════════════════════════════════════════════════════
function Landing({ onStart }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      {/* Grid background */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `linear-gradient(${C.border} 1px,transparent 1px),linear-gradient(90deg,${C.border} 1px,transparent 1px)`, backgroundSize: "44px 44px", opacity: 0.5, pointerEvents: "none" }} />
      <div style={{ position: "fixed", inset: 0, background: `radial-gradient(ellipse 70% 55% at 50% -5%, ${C.accent}14, transparent)`, pointerEvents: "none" }} />

      <div style={{ position: "relative", textAlign: "center", maxWidth: 700, animation: "fadeUp .7s ease" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `${C.accent}10`, border: `1px solid ${C.accent}25`, borderRadius: 30, padding: "6px 18px", marginBottom: 28 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.accent, display: "inline-block", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1.5 }}>GEMINI 2.5 FLASH · AI-POWERED</span>
        </div>

        <h1 style={{ fontSize: "clamp(36px,6vw,64px)", fontWeight: 800, lineHeight: 1.08, fontFamily: "'Syne',sans-serif", marginBottom: 18 }}>
          The AI Career Co-Pilot<br />
          <span style={{ background: `linear-gradient(135deg,${C.accent},#00C9A7)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            That Gets You Hired
          </span>
        </h1>

        <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.7, maxWidth: 520, margin: "0 auto 40px" }}>
          ATS scoring · NLP skill extraction · Semantic job matching · AI coaching · Resume auto-enhancement · 90-day learning roadmaps
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
          <button onClick={onStart} style={{
            padding: "15px 36px", borderRadius: 14, background: `linear-gradient(135deg,${C.accent},${C.acc2})`,
            color: C.bg, border: "none", fontWeight: 800, fontSize: 16, cursor: "pointer",
            fontFamily: "'Syne',sans-serif", letterSpacing: 0.5, boxShadow: `0 0 30px ${C.accent}40`,
          }}>
            Analyze My Resume →
          </button>
        </div>

        {/* Feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, maxWidth: 580, margin: "0 auto" }}>
          {[
            { icon: "🧠", label: "NLP Parsing", desc: "15+ fields extracted" },
            { icon: "📊", label: "ATS Scoring", desc: "6-dimension analysis" },
            { icon: "🔍", label: "Job Matching", desc: "20 real companies" },
            { icon: "🤖", label: "AI Chatbot", desc: "Personal career coach" },
            { icon: "✨", label: "Auto-Enhance", desc: "AI rewrites your resume" },
            { icon: "🎓", label: "Learning Plan", desc: "90-day skill roadmap" },
          ].map(f => (
            <Card key={f.label} style={{ padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{f.label}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{f.desc}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  UPLOAD VIEW
// ══════════════════════════════════════════════════════════════════════════════
function UploadView({ onAnalyze, loading }) {
  const [file, setFile]           = useState(null);
  const [targetRole, setTarget]   = useState("");
  const [drag, setDrag]           = useState(false);
  const fileRef                   = useRef();

  const handleFile = (f) => {
    if (f && (f.name.toLowerCase().endsWith(".pdf") || f.name.toLowerCase().endsWith(".docx") || f.name.toLowerCase().endsWith(".txt"))) {
      setFile(f);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px", animation: "fadeUp .5s ease" }}>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 6 }}>New Analysis</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>Upload your resume and let Gemini 2.5 Flash analyze it in seconds.</p>

      <Card style={{ overflow: "hidden" }}>
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
          style={{
            padding: "44px 28px", textAlign: "center", cursor: "pointer",
            border: `2px dashed ${drag ? C.accent : file ? C.acc2 : C.border}`,
            margin: 2, borderRadius: 14,
            background: drag ? `${C.accent}05` : file ? `${C.acc2}05` : "transparent",
            transition: "all .2s",
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 12, display: "inline-block", animation: file ? "none" : "float 3s ease-in-out infinite" }}>
            {file ? "✅" : "📄"}
          </div>
          {file ? (
            <>
              <div style={{ fontWeight: 700, color: C.accent, fontSize: 16, marginBottom: 4 }}>{file.name}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>Drop your resume here</div>
              <div style={{ color: C.muted, fontSize: 13 }}>PDF · DOCX · TXT supported · Click to browse</div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

        <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={targetRole} onChange={e => setTarget(e.target.value)}
            placeholder="Target role (e.g. Senior React Developer, ML Engineer)"
            style={{ width: "100%", padding: "13px 16px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, outline: "none" }}
          />
          <button
            onClick={() => file && onAnalyze(file, targetRole || "Software Engineer")}
            disabled={!file || loading}
            style={{
              padding: 15, borderRadius: 12,
              background: file && !loading ? `linear-gradient(135deg,${C.accent},${C.acc2})` : "#0D1E35",
              color: file && !loading ? C.bg : C.muted,
              border: "none", fontWeight: 800, fontSize: 15, cursor: file && !loading ? "pointer" : "not-allowed",
              fontFamily: "'Syne',sans-serif", letterSpacing: 0.5,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            {loading ? <><Spinner /> Analyzing with Gemini 2.5 Flash...</> : file ? "🚀  Analyze Resume" : "Upload a resume to continue"}
          </button>
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  ANALYZING SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const STEPS = ["NLP Parsing", "ATS Scoring", "Job Matching", "AI Tips", "Analytics", "Done"];

function AnalyzingScreen({ progress, progressMsg }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ width: 80, height: 80, margin: "0 auto 28px", position: "relative" }}>
          <div style={{ position: "absolute", inset: 0, border: `3px solid ${C.border}`, borderRadius: "50%" }} />
          <div style={{ position: "absolute", inset: 0, border: `3px solid transparent`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin .9s linear infinite" }} />
          <div style={{ position: "absolute", inset: 8, border: `2px solid transparent`, borderTopColor: C.acc2, borderRadius: "50%", animation: "spin 1.5s linear infinite reverse" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>⚡</div>
        </div>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Analyzing Resume</h2>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 28, minHeight: 20 }}>{progressMsg}</p>
        <div style={{ background: "#0D1E35", borderRadius: 10, height: 8, overflow: "hidden", marginBottom: 10 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg,${C.accent},${C.acc2})`, borderRadius: 10, transition: "width .5s ease", boxShadow: `0 0 12px ${C.accent}60` }} />
        </div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 28 }}>{progress}% complete</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ padding: "8px 6px", background: C.card, borderRadius: 10, border: `1px solid ${progress >= (i + 1) * 15 ? C.accent + "40" : C.border}` }}>
              <div style={{ fontSize: 11, color: progress >= (i + 1) * 15 ? C.accent : C.muted, fontWeight: 600 }}>
                {progress >= (i + 1) * 15 ? "✓" : "○"} {s}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD TABS
// ══════════════════════════════════════════════════════════════════════════════
function OverviewTab({ data }) {
  const { parsed, scores, tips } = data;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, animation: "fadeUp .4s ease" }}>
      {/* Score grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
        {[
          { label: "Overall",     val: scores.overallScore     || 0 },
          { label: "ATS Score",   val: scores.atsScore         || 0 },
          { label: "Skills",      val: scores.skillScore       || 0 },
          { label: "Experience",  val: scores.experienceScore  || 0 },
          { label: "Formatting",  val: scores.formattingScore  || 0 },
          { label: "Impact",      val: scores.impactScore      || 0 },
        ].map(s => (
          <Card key={s.label} style={{ padding: "18px 10px", textAlign: "center" }}>
            <ScoreArc score={s.val} size={96} />
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 6 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* ATS Pass badge + summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>AI-GENERATED SUMMARY</div>
          <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, fontStyle: "italic" }}>"{parsed.summary || "No summary extracted."}"</p>
        </Card>
        {scores.hiringManagerNote && (
          <Card style={{ padding: 20, border: `1px solid ${C.warn}20` }}>
            <div style={{ fontSize: 11, color: C.warn, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>👔 HIRING MANAGER NOTE</div>
            <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7, fontStyle: "italic" }}>"{scores.hiringManagerNote}"</p>
          </Card>
        )}
      </div>

      {/* Strengths */}
      {scores.strengths?.length > 0 && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>✅ STRENGTHS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}>
            {scores.strengths.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, background: "#071020", borderRadius: 10, padding: "12px 14px" }}>
                <span style={{ color: C.accent, fontSize: 14, marginTop: 2 }}>→</span>
                <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.5 }}>{s}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Improvements */}
      {scores.improvements?.length > 0 && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: C.danger, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>⚠️ IMPROVEMENTS NEEDED</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {scores.improvements.map((imp, i) => (
              <div key={i} style={{ display: "flex", gap: 12, background: "#071020", borderRadius: 10, padding: 14 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, flexShrink: 0, alignSelf: "flex-start", marginTop: 2,
                  background: imp.priority === "high" ? "rgba(255,77,109,.15)" : imp.priority === "medium" ? "rgba(245,166,35,.15)" : "rgba(0,229,190,.1)",
                  color: imp.priority === "high" ? C.danger : imp.priority === "medium" ? C.warn : C.accent,
                  textTransform: "uppercase", letterSpacing: 0.8,
                }}>{imp.priority}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4 }}>{imp.issue}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>💡 {imp.fix}</div>
                  {imp.category && <div style={{ marginTop: 6 }}><Pill color={C.info}>{imp.category}</Pill></div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Experience */}
      {parsed.experience?.length > 0 && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>💼 EXPERIENCE</div>
          {parsed.experience.slice(0, 4).map((exp, i) => (
            <div key={i} style={{ marginBottom: i < 3 ? 18 : 0, paddingBottom: i < 3 ? 18 : 0, borderBottom: i < Math.min(parsed.experience.length - 1, 3) ? `1px solid ${C.border}` : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{exp.title}</div>
                  <div style={{ color: C.acc2, fontSize: 13, marginTop: 2 }}>{exp.company} · {exp.duration}</div>
                </div>
                {exp.impact && <Pill color={C.warn}>{exp.impact}</Pill>}
              </div>
              <div style={{ marginTop: 8 }}>
                {(exp.highlights || []).slice(0, 3).map((h, j) => (
                  <div key={j} style={{ fontSize: 13, color: C.muted, marginBottom: 4, paddingLeft: 12, borderLeft: `2px solid ${C.border}` }}>• {h}</div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* Education */}
      {parsed.education?.length > 0 && (
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>🎓 EDUCATION</div>
          {parsed.education.map((edu, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{edu.degree}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{edu.institution}{edu.gpa ? ` · GPA ${edu.gpa}` : ""}</div>
              </div>
              {edu.year && <Pill color={C.muted}>{edu.year}</Pill>}
            </div>
          ))}
        </Card>
      )}

      {/* AI Tips */}
      <Card style={{ padding: 20, border: `1px solid ${C.accent}18` }}>
        <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>🤖 AI RECOMMENDATIONS</div>
        {(tips || []).map((tip, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, background: `${C.accent}18`, color: C.accent, fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
            <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>{tip}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}

function JobsTab({ data }) {
  const [domain, setDomain] = useState("All");
  const [minScore, setMin]  = useState(0);
  const [open, setOpen]     = useState(null);

  const domains = ["All", ...new Set(data.jobMatches.map(j => j.domain))];
  const jobs    = data.jobMatches
    .filter(j => (domain === "All" || j.domain === domain) && j.matchScore >= minScore);

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20 }}>Job Matches</h2>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>TF-IDF semantic similarity · {jobs.filter(j => j.matchScore >= 60).length} strong matches</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={domain} onChange={e => setDomain(e.target.value)}
            style={{ padding: "7px 12px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, cursor: "pointer" }}>
            {domains.map(d => <option key={d}>{d}</option>)}
          </select>
          <select value={minScore} onChange={e => setMin(+e.target.value)}
            style={{ padding: "7px 12px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, cursor: "pointer" }}>
            <option value={0}>All scores</option>
            <option value={40}>40%+</option>
            <option value={60}>60%+</option>
            <option value={75}>75%+</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {jobs.map((job, i) => {
          const color = job.matchScore >= 75 ? C.accent : job.matchScore >= 50 ? C.warn : C.danger;
          const isOpen = open === job.id;
          return (
            <Card key={job.id} hover onClick={() => setOpen(isOpen ? null : job.id)} style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: job.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: "#fff", flexShrink: 0 }}>{job.logo}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: C.text, fontSize: 14, fontFamily: "'Syne',sans-serif" }}>{job.title}</span>
                    {i < 3 && <Pill>TOP MATCH</Pill>}
                    <Pill color={C.muted}>{job.domain}</Pill>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{job.company} · {job.location} · {job.salary}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: "'Syne',sans-serif" }}>{job.matchScore}%</div>
                  <div style={{ fontSize: 10, color: C.muted }}>match</div>
                </div>
              </div>
              <div style={{ marginTop: 12, background: "#071020", borderRadius: 6, height: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${job.matchScore}%`, background: color, borderRadius: 6 }} />
              </div>
              {isOpen && (
                <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16, animation: "fadeUp .2s ease" }}>
                  <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6, marginBottom: 14 }}>{job.description}</p>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Skill Breakdown</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(job.matched || []).map(s => <Pill key={s} color="#22c55e">✓ {s}</Pill>)}
                      {(job.missing || []).map(s => <Pill key={s} color={C.danger}>✗ {s}</Pill>)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={{ padding: "9px 20px", background: `linear-gradient(135deg,${C.accent},${C.acc2})`, color: C.bg, border: "none", borderRadius: 8, fontWeight: 800, cursor: "pointer", fontSize: 13 }}>Apply Now →</button>
                    <div style={{ padding: "9px 14px", background: "#071020", border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.muted }}>{job.experience}+ yrs · {job.type}</div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {jobs.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No jobs match the current filter</div>}
      </div>
    </div>
  );
}

function SkillsTab({ data }) {
  const { parsed, scores } = data;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .4s ease" }}>
      <Card style={{ padding: 22 }}>
        <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>🛠️ DETECTED SKILLS ({parsed.skills?.length || 0})</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(parsed.skills || []).map(s => <Pill key={s}>{s}</Pill>)}
          {(!parsed.skills || parsed.skills.length === 0) && <p style={{ color: C.muted, fontSize: 14 }}>No skills detected. Try a more detailed resume.</p>}
        </div>
      </Card>

      {parsed.softSkills?.length > 0 && (
        <Card style={{ padding: 22 }}>
          <div style={{ fontSize: 11, color: C.info, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>🤝 SOFT SKILLS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {parsed.softSkills.map(s => <Pill key={s} color={C.info}>{s}</Pill>)}
          </div>
        </Card>
      )}

      {scores.atsKeywords?.length > 0 && (
        <Card style={{ padding: 22 }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>✅ STRONG ATS KEYWORDS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {scores.atsKeywords.slice(0, 20).map(k => <Pill key={k} color="#22c55e">{k}</Pill>)}
          </div>
        </Card>
      )}

      {scores.missingKeywords?.length > 0 && (
        <Card style={{ padding: 22 }}>
          <div style={{ fontSize: 11, color: C.danger, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>❌ MISSING HIGH-VALUE KEYWORDS</div>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>Add these to boost your ATS pass rate:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {scores.missingKeywords.slice(0, 15).map(k => <Pill key={k} color={C.danger}>{k}</Pill>)}
          </div>
        </Card>
      )}

      <Card style={{ padding: 22 }}>
        <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>📊 SCORE BREAKDOWN</div>
        {[
          { label: "ATS Compatibility",   val: scores.atsScore        || 0 },
          { label: "Technical Skills",    val: scores.skillScore      || 0 },
          { label: "Experience Relevance",val: scores.experienceScore || 0 },
          { label: "Resume Formatting",   val: scores.formattingScore || 0 },
          { label: "Quantified Impact",   val: scores.impactScore     || 0 },
          { label: "Industry Benchmark",  val: scores.industryBenchmark || 0 },
        ].map((s, i) => (
          <div key={s.label} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#94A3B8" }}>{s.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: s.val >= 75 ? C.accent : s.val >= 50 ? C.warn : C.danger }}>{s.val}%</span>
            </div>
            <AnimatedBar value={s.val} delay={i * 80} color={s.val >= 75 ? C.accent : s.val >= 50 ? C.warn : C.danger} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function EnhanceTab({ data, targetRole }) {
  const [loading, setLoading] = useState(false);
  const [enhanced, setEnhanced] = useState("");
  const [copied, setCopied]     = useState(false);

  const enhance = async () => {
    setLoading(true);
    setEnhanced("");
    try {
      const res = await apiFetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: data.resumeText || "",
          target_role: targetRole,
          missing_keywords: data.scores?.missingKeywords || [],
        }),
      });
      setEnhanced(res.enhanced || "");
    } catch (e) {
      setEnhanced("Error: " + e.message);
    }
    setLoading(false);
  };

  const copy = () => {
    navigator.clipboard.writeText(enhanced);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>✨ AI Resume Enhancer</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
        Gemini 2.5 Flash rewrites your resume with stronger action verbs, quantified achievements, and ATS keywords — optimized for <strong style={{ color: C.accent }}>{targetRole}</strong>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { icon: "🎯", label: "ATS Optimized",    desc: "Injects missing keywords naturally" },
          { icon: "📈", label: "Stronger Impact",  desc: "Quantifies your achievements" },
          { icon: "✍️", label: "Better Writing",   desc: "Professional action verbs throughout" },
          { icon: "🔑", label: "Role-Targeted",    desc: "Tailored to your specific role" },
        ].map(f => (
          <Card key={f.label} style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 22 }}>{f.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{f.label}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{f.desc}</div>
            </div>
          </Card>
        ))}
      </div>

      <button onClick={enhance} disabled={loading}
        style={{
          width: "100%", padding: 16, borderRadius: 12,
          background: loading ? "#0D1E35" : `linear-gradient(135deg,${C.accent},${C.acc2})`,
          color: loading ? C.muted : C.bg, border: "none", fontWeight: 800, fontSize: 15,
          cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Syne',sans-serif",
          marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
        {loading ? <><Spinner /> Enhancing with Gemini 2.5 Flash...</> : "✨ Enhance My Resume Now"}
      </button>

      {enhanced && (
        <Card style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: 1 }}>✅ ENHANCED RESUME</div>
            <button onClick={copy}
              style={{ background: "#0D1E35", border: `1px solid ${C.border}`, color: copied ? C.accent : C.muted, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              {copied ? "✓ Copied!" : "📋 Copy"}
            </button>
          </div>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#94A3B8", lineHeight: 1.8, fontFamily: "'DM Sans',sans-serif", background: C.bg, borderRadius: 10, padding: 16, maxHeight: 500, overflowY: "auto" }}>
            {enhanced}
          </pre>
        </Card>
      )}
    </div>
  );
}

function LearningTab({ data, targetRole }) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan]       = useState(null);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/learning-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills:           data.parsed?.skills        || [],
          skill_gaps:       (data.analytics?.skillGaps || []).map(s => s.skill),
          target_role:      targetRole,
          career_level:     data.analytics?.careerLevel || "Mid",
          experience_years: data.parsed?.totalYearsExp  || 0,
        }),
      });
      setPlan(res.plan || null);
    } catch (e) {
      alert("Error: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ animation: "fadeUp .4s ease" }}>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>🎓 Personalized Learning Plan</h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>90-day AI-generated roadmap to fill your skill gaps and land <strong style={{ color: C.accent }}>{targetRole}</strong>.</p>

      {!plan && (
        <>
          {data.analytics?.skillGaps?.length > 0 && (
            <Card style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.danger, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>🎯 IDENTIFIED SKILL GAPS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.analytics.skillGaps.map((gap, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Pill color={gap.importance === "Critical" ? C.danger : gap.importance === "High" ? C.warn : C.muted}>{gap.importance}</Pill>
                      <span style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{gap.skill}</span>
                    </div>
                    <span style={{ fontSize: 12, color: C.muted }}>{gap.hoursToLearn}h to learn</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          <button onClick={generate} disabled={loading}
            style={{
              width: "100%", padding: 16, borderRadius: 12,
              background: loading ? "#0D1E35" : `linear-gradient(135deg,${C.accent},${C.acc2})`,
              color: loading ? C.muted : C.bg, border: "none", fontWeight: 800, fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Syne',sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
            {loading ? <><Spinner /> Generating 90-day roadmap...</> : "🎓 Generate My Learning Roadmap"}
          </button>
        </>
      )}

      {plan && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 20, border: `1px solid ${C.accent}20` }}>
            <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>🎯 GOAL</div>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{plan.goal}</p>
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Pill>{plan.totalHours}h total investment</Pill>
              <Pill color={C.warn}>90-day plan</Pill>
            </div>
          </Card>

          {plan.weeks?.map((week, i) => (
            <Card key={i} style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1 }}>{week.week}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginTop: 4 }}>{week.focus}</div>
                </div>
                {week.milestone && <Pill color="#22c55e">🏆 {week.milestone}</Pill>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(week.resources || []).map((r, j) => (
                  <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, borderRadius: 8, padding: "10px 14px", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 14 }}>{r.type === "Course" ? "🎓" : r.type === "Book" ? "📚" : r.type === "Practice" ? "💻" : "🎥"}</span>
                      <span style={{ fontSize: 13, color: C.text }}>{r.name}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Pill color={C.info}>{r.type}</Pill>
                      <span style={{ fontSize: 12, color: C.muted }}>{r.hours}h</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {plan.projects?.length > 0 && (
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: C.warn, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>🚀 PORTFOLIO PROJECTS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
                {plan.projects.map((p, i) => (
                  <div key={i} style={{ background: C.bg, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 6 }}>{p.title}</div>
                    <p style={{ fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>{p.description}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {(p.skills || []).map(s => <Pill key={s} color={C.info}>{s}</Pill>)}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>⏱ ~{p.estimatedDays} days</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {plan.certifications?.length > 0 && (
            <Card style={{ padding: 20 }}>
              <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>🏅 RECOMMENDED CERTIFICATIONS</div>
              {plan.certifications.map((c, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{c.provider}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Pill color={c.priority === "High" ? C.danger : C.warn}>{c.priority} Priority</Pill>
                    <Pill color={C.muted}>{c.estimatedWeeks}w</Pill>
                  </div>
                </div>
              ))}
            </Card>
          )}

          <button onClick={() => setPlan(null)} style={{ background: "#0D1E35", border: `1px solid ${C.border}`, color: C.muted, padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            ↻ Regenerate Plan
          </button>
        </div>
      )}
    </div>
  );
}

function AnalyticsTab({ data }) {
  const { parsed, scores, analytics } = data;
  if (!analytics) return <p style={{ color: C.muted, padding: 20 }}>Analytics not available.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, animation: "fadeUp .4s ease" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12 }}>
        {[
          { icon: "🏆", label: "Career Level",       val: analytics.careerLevel,       color: C.accent },
          { icon: "📈", label: "Trajectory",          val: analytics.careerTrajectory,  color: "#22c55e" },
          { icon: "💹", label: "Market Demand",       val: `${analytics.marketDemandScore || 0}/100`, color: C.warn },
          { icon: "🎯", label: "Interview Ready",     val: `${analytics.interviewReadiness || 0}/100`, color: C.info },
          { icon: "⏱", label: "Est. Time to Hire",   val: analytics.timeToHire,        color: C.purple },
          { icon: "💼", label: "Years Experience",    val: `${parsed?.totalYearsExp || 0}y`, color: C.acc2 },
        ].map(s => (
          <Card key={s.label} style={{ padding: "18px 14px" }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
            <div style={{ fontWeight: 900, fontSize: 16, color: s.color, fontFamily: "'Syne',sans-serif" }}>{s.val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {analytics.salaryRange && (
        <Card style={{ padding: 22 }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>💰 ESTIMATED SALARY RANGE</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.accent, fontFamily: "'Syne',sans-serif" }}>
                ${((analytics.salaryRange.min || 0) / 1000).toFixed(0)}k – ${((analytics.salaryRange.max || 0) / 1000).toFixed(0)}k
              </div>
              <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Annual · {analytics.salaryRange.currency}</div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 5 }}>
                <span>Junior</span><span style={{ color: C.accent }}>Your Range</span><span>Senior</span>
              </div>
              <div style={{ background: "#0D1E35", height: 10, borderRadius: 5, position: "relative" }}>
                <div style={{ position: "absolute", left: "25%", width: "40%", height: "100%", background: `linear-gradient(90deg,${C.accent},${C.acc2})`, borderRadius: 5, boxShadow: `0 0 10px ${C.accent}60` }} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {analytics.topMatchedDomains?.length > 0 && (
        <Card style={{ padding: 22 }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>🎯 DOMAIN FIT SCORES</div>
          {analytics.topMatchedDomains.slice(0, 6).map((d, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 600 }}>{d.domain}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: d.fitScore >= 75 ? C.accent : d.fitScore >= 50 ? C.warn : C.danger }}>{d.fitScore}%</span>
              </div>
              <AnimatedBar value={d.fitScore} delay={i * 80} color={d.fitScore >= 75 ? C.accent : d.fitScore >= 50 ? C.warn : C.danger} />
            </div>
          ))}
        </Card>
      )}

      {analytics.competitiveAdvantages?.length > 0 && (
        <Card style={{ padding: 22 }}>
          <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 700, letterSpacing: 1, marginBottom: 14 }}>🌟 COMPETITIVE ADVANTAGES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}>
            {analytics.competitiveAdvantages.map((a, i) => (
              <div key={i} style={{ background: "rgba(34,197,94,.06)", border: "1px solid rgba(34,197,94,.15)", borderRadius: 10, padding: "12px 14px", fontSize: 13, color: "#94A3B8", lineHeight: 1.5 }}>
                <span style={{ color: "#22c55e", marginRight: 8 }}>✓</span>{a}
              </div>
            ))}
          </div>
        </Card>
      )}

      {parsed.certifications?.length > 0 && (
        <Card style={{ padding: 22 }}>
          <div style={{ fontSize: 11, color: C.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>🏅 CERTIFICATIONS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {parsed.certifications.map(c => <Pill key={c} color={C.purple}>{c}</Pill>)}
          </div>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  AI CHATBOT
// ══════════════════════════════════════════════════════════════════════════════
function Chatbot({ data, targetRole }) {
  const [open, setOpen]     = useState(false);
  const [msgs, setMsgs]     = useState([{ role: "ai", text: "Hi! I'm your AI career coach powered by Gemini 2.5 Flash. Ask me anything about your resume, interview prep, salary negotiation, or how to land your next role. 🚀" }]);
  const [input, setInput]   = useState("");
  const [loading, setLoad]  = useState(false);
  const endRef              = useRef();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setMsgs(m => [...m, { role: "user", text: msg }]);
    setLoad(true);

    const context = data
      ? `Candidate: ${data.parsed?.name}. Skills: ${(data.parsed?.skills || []).slice(0, 12).join(", ")}. Score: ${data.scores?.overallScore}/100. Target role: ${targetRole}. Top job match: ${data.jobMatches?.[0]?.title} at ${data.jobMatches?.[0]?.company} (${data.jobMatches?.[0]?.matchScore}% match).`
      : "";

    try {
      const history = msgs.slice(-6).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));
      const res = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, resume_context: context, history }),
      });
      setMsgs(m => [...m, { role: "ai", text: res.reply }]);
    } catch (e) {
      setMsgs(m => [...m, { role: "ai", text: "Connection error. Please check the backend is running." }]);
    }
    setLoad(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 24, right: 24, width: 58, height: 58,
          borderRadius: "50%", background: `linear-gradient(135deg,${C.accent},${C.acc2})`,
          border: "none", cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 24, zIndex: 300,
          boxShadow: `0 4px 28px ${C.accent}55`, animation: "pulse 3s infinite",
        }}
      >
        {open ? "✕" : "🤖"}
      </button>

      {open && (
        <div style={{
          position: "fixed", bottom: 96, right: 24, width: 370, height: 510,
          background: "#070F1E", border: `1px solid ${C.border}`, borderRadius: 20,
          display: "flex", flexDirection: "column", zIndex: 300,
          boxShadow: "0 20px 60px rgba(0,0,0,.7)",
        }}>
          {/* Header */}
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${C.accent},${C.acc2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, fontFamily: "'Syne',sans-serif" }}>Resume Coach</div>
              <div style={{ fontSize: 11, color: C.accent }}>Gemini 2.5 Flash · Always online</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "chatIn .2s ease" }}>
                <div style={{
                  maxWidth: "86%", padding: "10px 14px",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.role === "user" ? `linear-gradient(135deg,${C.accent},${C.acc2})` : C.card,
                  color: m.role === "user" ? C.bg : C.text, fontSize: 13, lineHeight: 1.6,
                  border: m.role === "ai" ? `1px solid ${C.border}` : "none",
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 6, padding: "10px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: "16px 16px 16px 4px", width: "fit-content" }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent, animation: `blink .8s ${i * 0.2}s infinite` }} />)}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask about your resume..."
              style={{ flex: 1, padding: "10px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, outline: "none" }}
            />
            <button onClick={send} disabled={loading || !input.trim()}
              style={{ padding: "10px 14px", background: `linear-gradient(135deg,${C.accent},${C.acc2})`, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 14, color: C.bg, fontWeight: 800 }}>
              →
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  ["overview",  "📊 Overview"],
  ["jobs",      "🔍 Jobs"],
  ["skills",    "🛠 Skills"],
  ["enhance",   "✨ Enhance"],
  ["learning",  "🎓 Learning"],
  ["analytics", "📈 Analytics"],
];

export default function App() {
  const [view, setView]           = useState("landing");  // landing | upload | analyzing | dashboard
  const [tab, setTab]             = useState("overview");
  const [data, setData]           = useState(null);
  const [targetRole, setTarget]   = useState("Software Engineer");
  const [progress, setProg]       = useState(0);
  const [progressMsg, setProgMsg] = useState("");

  const startAnalysis = async (file, role) => {
    setTarget(role);
    setView("analyzing");
    setProg(5); setProgMsg("📄 Reading your resume...");

    // Fake progress ticks while real request runs
    const ticks = [
      [20,  "🧠 NLP parsing: extracting skills & experience..."],
      [38,  "📊 Running ATS scoring engine..."],
      [55,  "🔍 Semantic job matching in progress..."],
      [70,  "💡 Generating AI improvement tips..."],
      [85,  "📈 Computing career analytics..."],
      [94,  "✅ Finalizing results..."],
    ];
    let tickIdx = 0;
    const interval = setInterval(() => {
      if (tickIdx < ticks.length) {
        setProg(ticks[tickIdx][0]);
        setProgMsg(ticks[tickIdx][1]);
        tickIdx++;
      }
    }, 2200);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("target_role", role);
      const result = await apiFetch("/api/analyze", { method: "POST", body: form });

      clearInterval(interval);
      setProg(100); setProgMsg("✅ Analysis complete!");
      // Store raw resume text for enhance tab
      const reader = new FileReader();
      reader.onload = (e) => {
        const raw = e.target.result.replace(/[^\x20-\x7E\n\r\t]/g, " ").trim();
        setData({ ...result, resumeText: raw });
        setTimeout(() => setView("dashboard"), 600);
      };
      reader.readAsText(file);
    } catch (err) {
      clearInterval(interval);
      alert("Analysis failed: " + err.message + "\n\nMake sure the backend is running at " + API);
      setView("upload");
    }
  };

  const reset = () => { setView("upload"); setData(null); setProg(0); };

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {view === "landing" && <Landing onStart={() => setView("upload")} />}

      {view === "upload" && (
        <div style={{ minHeight: "100vh" }}>
          <div style={{ background: "#070F1E", borderBottom: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg,${C.accent},${C.acc2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: 16, fontFamily: "'Syne',sans-serif" }}>ResumeAI</span>
          </div>
          <UploadView onAnalyze={startAnalysis} loading={false} />
        </div>
      )}

      {view === "analyzing" && <AnalyzingScreen progress={progress} progressMsg={progressMsg} />}

      {view === "dashboard" && data && (
        <div style={{ minHeight: "100vh" }}>
          {/* Top Nav */}
          <div style={{ background: "#070F1E", borderBottom: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.accent},${C.acc2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, fontFamily: "'Syne',sans-serif" }}>{data.parsed?.name || "Resume Analysis"}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{data.parsed?.email || ""}{data.parsed?.location ? " · " + data.parsed.location : ""}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Pill color={data.scores?.overallScore >= 75 ? C.accent : data.scores?.overallScore >= 50 ? C.warn : C.danger}>
                Score: {data.scores?.overallScore || 0}/100
              </Pill>
              {data.analytics?.careerLevel && <Pill color={C.info}>{data.analytics.careerLevel}</Pill>}
              <Pill color={data.scores?.passATS ? "#22c55e" : C.danger}>
                {data.scores?.passATS ? "✓ Passes ATS" : "✗ Fails ATS"}
              </Pill>
              <button onClick={reset} style={{ background: "#0D1E35", border: `1px solid ${C.border}`, color: C.muted, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                ← New Analysis
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ background: "#070F1E", borderBottom: `1px solid ${C.border}`, padding: "0 24px", display: "flex", overflowX: "auto" }}>
            {TABS.map(([id, label]) => (
              <button key={id} className="tab-btn" onClick={() => setTab(id)} style={{
                padding: "13px 16px", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap",
                color: tab === id ? C.accent : C.muted, fontWeight: tab === id ? 700 : 500, fontSize: 13,
                borderBottom: `2px solid ${tab === id ? C.accent : "transparent"}`, transition: "color .2s",
                fontFamily: "'DM Sans',sans-serif",
              }}>{label}</button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>
            {tab === "overview"  && <OverviewTab  data={data} />}
            {tab === "jobs"      && <JobsTab      data={data} />}
            {tab === "skills"    && <SkillsTab    data={data} />}
            {tab === "enhance"   && <EnhanceTab   data={data} targetRole={targetRole} />}
            {tab === "learning"  && <LearningTab  data={data} targetRole={targetRole} />}
            {tab === "analytics" && <AnalyticsTab data={data} />}
          </div>
        </div>
      )}

      {/* Floating chatbot — always visible except landing */}
      {view !== "landing" && <Chatbot data={data} targetRole={targetRole} />}
    </>
  );
}